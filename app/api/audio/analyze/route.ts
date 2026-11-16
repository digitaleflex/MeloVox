import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { probeAudioFile, saveUploadedInputFile } from '@/lib/server/ffmpeg-service';

const MAX_UPLOAD_BYTES = 150 * 1024 * 1024; // 150 MB safety bound per request

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const folderPath = formData.get('folderPath');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier audio reçu.' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: 'Le fichier semble vide ou incomplet (0 octet).' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Fichier supérieur à la limite web de 150 Mo.' },
        { status: 413 }
      );
    }

    const fileId = `trk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const savedPath = await saveUploadedInputFile(fileId, file.name, buffer);

    const analysis = await probeAudioFile(savedPath, file.name, fileId, {
      folderPath: typeof folderPath === 'string' ? folderPath : undefined,
    });

    return NextResponse.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur lors de l’analyse FFprobe.';
    const friendly = msg.includes('Aucun flux audio')
      ? 'Ce format audio n’est pas pris en charge ou ne contient aucun flux audio.'
      : 'Le fichier semble endommagé ou illisible par FFprobe.';
    return NextResponse.json({ error: friendly, technicalDetail: msg }, { status: 422 });
  }
}
