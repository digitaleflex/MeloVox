import { NextResponse } from 'next/server';
import { getSystemDiagnostics } from '@/lib/server/ffmpeg-service';

export async function GET() {
  try {
    const diagnostics = await getSystemDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur de diagnostic système.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
