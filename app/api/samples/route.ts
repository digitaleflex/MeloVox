import { NextResponse } from 'next/server';
import { generateSampleAudioSuite } from '@/lib/server/ffmpeg-service';

export async function POST() {
  try {
    const tracks = await generateSampleAudioSuite();
    return NextResponse.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération des pistes test.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
