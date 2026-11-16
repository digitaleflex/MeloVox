import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  AudioMetadata,
  AudioTrackAnalysis,
  ConversionSettings,
  StudioOptions,
} from '@/lib/audio/types';
import {
  getWorkspaceFile,
  isValidFileId,
  probeAudioFile,
  runConversionJob,
} from '@/lib/server/ffmpeg-service';

interface ConvertRequestBody {
  fileId: string;
  outputFileName: string;
  settings: ConversionSettings;
  studio: StudioOptions;
  metadata?: AudioMetadata;
  analysis?: AudioTrackAnalysis;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConvertRequestBody;
    if (!body?.fileId || !isValidFileId(body.fileId)) {
      return NextResponse.json({ error: 'Identifiant de fichier invalide.' }, { status: 400 });
    }

    const entry = await getWorkspaceFile(body.fileId);
    if (!entry) {
      return NextResponse.json(
        { error: 'Fichier source introuvable dans l’espace de travail.' },
        { status: 404 }
      );
    }

    const sourceAnalysis =
      body.analysis ?? (await probeAudioFile(entry.filePath, entry.fileName, entry.fileId));

    const outputFileId = `out_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const result = await runConversionJob({
      sourceEntry: entry,
      sourceAnalysis,
      settings: body.settings,
      studio: body.studio,
      metadata: body.metadata,
      outputFileId,
      outputFileName: body.outputFileName,
      signal: req.signal,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur de conversion FFmpeg.';
    if (msg === 'CONVERSION_CANCELLED') {
      return NextResponse.json({ error: 'Conversion annulée.' }, { status: 499 });
    }
    return NextResponse.json({ error: 'La conversion a échoué.', technicalDetail: msg }, { status: 500 });
  }
}
