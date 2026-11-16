import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { isPrivateOrReservedIp, validateExternalAudioUrl } from '@/lib/audio/ssrf-guard';
import { probeAudioFile, saveUploadedInputFile } from '@/lib/server/ffmpeg-service';

const MAX_REMOTE_BYTES = 80 * 1024 * 1024; // 80 MB
const FETCH_TIMEOUT_MS = 20_000;

async function assertHostnamePublic(hostname: string): Promise<void> {
  const records = await dns.lookup(hostname, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Résolution DNS impossible pour cette adresse.');
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error('Connexion bloquée vers une adresse IP privée ou locale (protection SSRF).');
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const rawUrl = body?.url || '';
    const check = validateExternalAudioUrl(rawUrl);
    if (!check.valid || !check.url) {
      return NextResponse.json({ error: check.error || 'URL invalide.' }, { status: 400 });
    }

    let currentUrl = check.url;
    let response: Response | null = null;

    // Follow at most 3 redirects manually, re-validating SSRF on every hop
    for (let hop = 0; hop < 4; hop += 1) {
      await assertHostnamePublic(currentUrl.hostname);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        response = await fetch(currentUrl.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: { 'User-Agent': 'MeloVox-AudioWorkspace/1.0' },
        });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return NextResponse.json({ error: 'Redirection HTTP invalide.' }, { status: 400 });
        }
        const resolved = new URL(location, currentUrl);
        const hopCheck = validateExternalAudioUrl(resolved.toString());
        if (!hopCheck.valid || !hopCheck.url) {
          return NextResponse.json({ error: hopCheck.error || 'Redirection interdite.' }, { status: 403 });
        }
        currentUrl = hopCheck.url;
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Le téléchargement a échoué (HTTP ${response?.status ?? 'inconnu'}).` },
        { status: 502 }
      );
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_REMOTE_BYTES) {
      return NextResponse.json(
        { error: 'Le fichier distant dépasse la limite autorisée de 80 Mo.' },
        { status: 413 }
      );
    }

    const arrayBuf = await response.arrayBuffer();
    if (arrayBuf.byteLength === 0) {
      return NextResponse.json({ error: 'Le fichier téléchargé est vide.' }, { status: 400 });
    }
    if (arrayBuf.byteLength > MAX_REMOTE_BYTES) {
      return NextResponse.json({ error: 'Le fichier distant dépasse 80 Mo.' }, { status: 413 });
    }

    const urlBaseName = path.basename(currentUrl.pathname) || 'remote_audio.mp3';
    const fileId = `url_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const savedPath = await saveUploadedInputFile(fileId, urlBaseName, Buffer.from(arrayBuf));

    const analysis = await probeAudioFile(savedPath, urlBaseName, fileId, {
      sourceUrl: currentUrl.toString(),
    });

    return NextResponse.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur lors du téléchargement audio.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
