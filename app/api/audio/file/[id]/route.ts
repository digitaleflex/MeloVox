import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceFile, isValidFileId } from '@/lib/server/ffmpeg-service';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidFileId(id)) {
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
  }

  const entry = await getWorkspaceFile(id);
  if (!entry) {
    return NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 });
  }

  try {
    const data = await fs.readFile(entry.filePath);
    const ext = path.extname(entry.filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const isDownload = req.nextUrl.searchParams.get('download') === '1';
    const safeName = entry.fileName.replace(/["\r\n]/g, '_');

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(data.byteLength),
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${safeName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Erreur de lecture du fichier audio.' }, { status: 500 });
  }
}
