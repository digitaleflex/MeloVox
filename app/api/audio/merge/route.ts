import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ConversionSettings } from '@/lib/audio/types';
import {
  getWorkspaceFile,
  isValidFileId,
  mergeAudioWorkspaceFiles,
} from '@/lib/server/ffmpeg-service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      fileIds?: string[];
      outputFormat?: ConversionSettings['outputFormat'];
      outputFileName?: string;
    };

    const fileIds = body?.fileIds ?? [];
    if (fileIds.length < 2) {
      return NextResponse.json(
        { error: 'Sélectionnez au moins 2 pistes pour effectuer une fusion audio.' },
        { status: 400 }
      );
    }

    const entries = [];
    for (const id of fileIds) {
      if (!isValidFileId(id)) {
        return NextResponse.json({ error: 'Identifiant de fichier invalide.' }, { status: 400 });
      }
      const found = await getWorkspaceFile(id);
      if (!found) {
        return NextResponse.json({ error: `Piste introuvable (${id}).` }, { status: 404 });
      }
      entries.push(found);
    }

    const outputFormat = body?.outputFormat || 'mp3';
    const outputFileId = `mrg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const outputFileName =
      body?.outputFileName?.trim() || `MeloVox_Merged_${Date.now()}.${outputFormat}`;

    const merged = await mergeAudioWorkspaceFiles({
      inputEntries: entries,
      outputFileId,
      outputFileName,
      outputFormat,
    });

    return NextResponse.json(merged);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de la fusion audio.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
