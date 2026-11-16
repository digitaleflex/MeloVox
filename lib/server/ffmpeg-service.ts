import { execFile, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  buildFfmpegArgs,
  emptyLabMetrics,
  evaluateConversionWarnings,
  evaluateSmartStreamCopy,
  formatCommandPreview,
  LOSSLESS_CODECS,
} from '../audio/smart-engine';
import {
  AudioLabMetrics,
  AudioMetadata,
  AudioTrackAnalysis,
  ConversionComparisonReport,
  ConversionSettings,
  DiagnosticsSnapshot,
  StudioOptions,
} from '../audio/types';

const execFileAsync = promisify(execFile);

const WORKSPACE_ROOT = path.join(os.tmpdir(), 'melovox-workspace');
const INPUT_DIR = path.join(WORKSPACE_ROOT, 'inputs');
const OUTPUT_DIR = path.join(WORKSPACE_ROOT, 'outputs');
const REGISTRY_FILE = path.join(WORKSPACE_ROOT, 'registry.json');

interface StoredFileEntry {
  fileId: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  kind: 'input' | 'output';
}

export async function ensureWorkspaceDirs(): Promise<void> {
  await fs.mkdir(INPUT_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

export function isValidFileId(fileId: string): boolean {
  return /^[a-zA-Z0-9_-]{4,90}$/.test(fileId);
}

async function readRegistry(): Promise<Record<string, StoredFileEntry>> {
  await ensureWorkspaceDirs();
  try {
    const raw = await fs.readFile(REGISTRY_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, StoredFileEntry>;
  } catch {
    return {};
  }
}

async function writeRegistry(reg: Record<string, StoredFileEntry>): Promise<void> {
  await ensureWorkspaceDirs();
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(reg, null, 2), 'utf8');
}

export async function registerWorkspaceFile(entry: StoredFileEntry): Promise<void> {
  const reg = await readRegistry();
  reg[entry.fileId] = entry;
  await writeRegistry(reg);
}

export async function getWorkspaceFile(fileId: string): Promise<StoredFileEntry | null> {
  if (!isValidFileId(fileId)) return null;
  const reg = await readRegistry();
  const found = reg[fileId];
  if (!found) return null;
  try {
    await fs.access(found.filePath);
    return found;
  } catch {
    return null;
  }
}

export async function saveUploadedInputFile(
  fileId: string,
  originalName: string,
  buffer: Buffer
): Promise<string> {
  await ensureWorkspaceDirs();
  const safeExt = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) || '.bin';
  const targetPath = path.join(INPUT_DIR, `${fileId}${safeExt}`);
  await fs.writeFile(targetPath, buffer);
  await registerWorkspaceFile({
    fileId,
    fileName: path.basename(originalName),
    filePath: targetPath,
    createdAt: new Date().toISOString(),
    kind: 'input',
  });
  return targetPath;
}

export function getOutputFilePath(outputFileId: string, extension: string): string {
  const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'mp3';
  return path.join(OUTPUT_DIR, `${outputFileId}.${cleanExt}`);
}

interface FfprobeStream {
  index: number;
  codec_type?: string;
  codec_name?: string;
  codec_long_name?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bit_rate?: string;
  bits_per_raw_sample?: string;
  bits_per_sample?: number;
  duration?: string;
  disposition?: { attached_pic?: number };
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: {
    format_name?: string;
    format_long_name?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
    tags?: Record<string, string>;
  };
}

function normalizeTag(tags: Record<string, string> | undefined, keys: string[]): string {
  if (!tags) return '';
  const lowerMap = new Map<string, string>();
  for (const [k, v] of Object.entries(tags)) {
    lowerMap.set(k.toLowerCase(), v);
  }
  for (const k of keys) {
    const val = lowerMap.get(k.toLowerCase());
    if (val && val.trim()) return val.trim();
  }
  return '';
}

export async function probeAudioFile(
  filePath: string,
  fileName: string,
  fileId: string,
  extra?: { isSample?: boolean; sourceUrl?: string; folderPath?: string }
): Promise<AudioTrackAnalysis> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
    { timeout: 15000 }
  );

  const parsed = JSON.parse(stdout) as FfprobeOutput;
  const streams = parsed.streams ?? [];
  const audioStream = streams.find((s) => s.codec_type === 'audio');

  if (!audioStream) {
    throw new Error('Aucun flux audio valide détecté dans ce fichier.');
  }

  const stat = await fs.stat(filePath);
  const format = parsed.format ?? {};
  const tags = format.tags ?? {};
  const codec = (audioStream.codec_name || 'unknown').toLowerCase();
  const sampleRateHz = Number(audioStream.sample_rate || 0) || 44100;
  const channels = audioStream.channels || 2;
  const durationSec = Number(format.duration || audioStream.duration || 0) || 0;
  const bitrateBps =
    Number(audioStream.bit_rate || format.bit_rate || 0) ||
    (durationSec > 0 ? Math.round((stat.size * 8) / durationSec) : 0);

  const rawBitDepth = Number(audioStream.bits_per_raw_sample || audioStream.bits_per_sample || 0);
  const bitDepth = rawBitDepth > 0 ? rawBitDepth : null;

  const hasAttachedPic = streams.some(
    (s) => s.disposition?.attached_pic === 1 || (s.codec_type === 'video' && ['mjpeg', 'png'].includes(s.codec_name || ''))
  );

  let coverArtDataUrl: string | undefined;
  if (hasAttachedPic) {
    coverArtDataUrl = await extractCoverArtDataUrl(filePath);
  }

  const metadata: AudioMetadata = {
    title: normalizeTag(tags, ['title', 'TIT2']),
    artist: normalizeTag(tags, ['artist', 'TPE1']),
    album: normalizeTag(tags, ['album', 'TALB']),
    year: normalizeTag(tags, ['date', 'year', 'TYER', 'TDRC']),
    genre: normalizeTag(tags, ['genre', 'TCON']),
    track: normalizeTag(tags, ['track', 'TRCK']),
    composer: normalizeTag(tags, ['composer', 'TCOM']),
    comment: normalizeTag(tags, ['comment', 'COMM']),
    albumArtist: normalizeTag(tags, ['album_artist', 'TPE2']),
    hasCoverArt: Boolean(coverArtDataUrl) || hasAttachedPic,
    coverArtDataUrl,
  };

  const lab = await analyzeAudioSignal(filePath, durationSec);

  const detectedFormat = (format.format_name || path.extname(fileName).replace('.', '') || 'audio')
    .split(',')[0]
    .toUpperCase();

  return {
    fileId,
    fileName,
    extension: path.extname(fileName).replace('.', '').toLowerCase(),
    detectedFormat,
    formatLongName: format.format_long_name || detectedFormat,
    codec,
    codecLongName: audioStream.codec_long_name || codec.toUpperCase(),
    isLosslessSource: LOSSLESS_CODECS.has(codec),
    durationSec,
    sizeBytes: stat.size,
    bitrateBps,
    sampleRateHz,
    channels,
    channelLayout: audioStream.channel_layout || (channels === 1 ? 'mono' : 'stereo'),
    bitDepth,
    metadata,
    lab,
    isSample: extra?.isSample,
    sourceUrl: extra?.sourceUrl,
    folderPath: extra?.folderPath,
  };
}

async function extractCoverArtDataUrl(filePath: string): Promise<string | undefined> {
  const tempImg = path.join(os.tmpdir(), `mv_cover_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
  try {
    await execFileAsync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', filePath, '-an', '-vcodec', 'mjpeg', '-vframes', '1', tempImg],
      { timeout: 8000 }
    );
    const bytes = await fs.readFile(tempImg);
    if (bytes.length > 0 && bytes.length < 2_000_000) {
      return `data:image/jpeg;base64,${bytes.toString('base64')}`;
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    await fs.unlink(tempImg).catch(() => {});
  }
}

export async function analyzeAudioSignal(filePath: string, durationSec: number): Promise<AudioLabMetrics> {
  const metrics = emptyLabMetrics();
  try {
    // Use ebur128, volumedetect, and silencedetect in a single fast pass
    const { stderr } = await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-nostats',
        '-i',
        filePath,
        '-map',
        '0:a:0',
        '-af',
        'ebur128=peak=true,volumedetect,silencedetect=n=-45dB:d=0.35',
        '-f',
        'null',
        '-',
      ],
      { timeout: 25000, maxBuffer: 4 * 1024 * 1024 }
    );

    const summaryIdx = stderr.lastIndexOf('Summary:');
    const summaryText = summaryIdx >= 0 ? stderr.slice(summaryIdx) : stderr;

    const lufsMatch = summaryText.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
    if (lufsMatch) metrics.integratedLufs = Number(lufsMatch[1]);

    const lraMatch = summaryText.match(/LRA:\s*(-?\d+(?:\.\d+)?)\s*LU/);
    if (lraMatch) metrics.loudnessRangeLu = Number(lraMatch[1]);

    const peakMatch = summaryText.match(/Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/);
    if (peakMatch) metrics.truePeakDbfs = Number(peakMatch[1]);

    const maxVolMatch = stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
    if (maxVolMatch) metrics.maxVolumeDb = Number(maxVolMatch[1]);

    const meanVolMatch = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/);
    if (meanVolMatch) metrics.meanVolumeDb = Number(meanVolMatch[1]);

    const peakToCheck = metrics.truePeakDbfs ?? metrics.maxVolumeDb;
    if (peakToCheck !== null && peakToCheck >= -0.05) {
      metrics.clippingDetected = true;
      metrics.clippingCount = 1;
    }

    // Parse silence segments
    const starts = [...stderr.matchAll(/silence_start:\s*(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    const ends = [...stderr.matchAll(/silence_end:\s*(-?\d+(?:\.\d+)?)\s*\|\s*silence_duration:\s*(\d+(?:\.\d+)?)/g)].map(
      (m) => ({
        end: Number(m[1]),
        dur: Number(m[2]),
      })
    );

    metrics.silenceSegmentsCount = Math.max(starts.length, ends.length);
    if (starts.length > 0 && starts[0] <= 0.15 && ends.length > 0) {
      metrics.leadingSilenceSec = Number(ends[0].dur.toFixed(2));
    }
    if (ends.length > 0 && durationSec > 0) {
      const lastEnd = ends[ends.length - 1];
      if (Math.abs(lastEnd.end - durationSec) <= 0.35) {
        metrics.trailingSilenceSec = Number(lastEnd.dur.toFixed(2));
      }
    }
  } catch {
    // Keep graceful fallback metrics if file is unusual or ultra-short
  }
  return metrics;
}

export async function runConversionJob(params: {
  sourceEntry: StoredFileEntry;
  sourceAnalysis: AudioTrackAnalysis;
  settings: ConversionSettings;
  studio: StudioOptions;
  metadata?: AudioMetadata;
  outputFileId: string;
  outputFileName: string;
  signal?: AbortSignal;
}): Promise<{
  outputFileId: string;
  outputFileName: string;
  outputSizeBytes: number;
  report: ConversionComparisonReport;
}> {
  const {
    sourceEntry,
    sourceAnalysis,
    settings,
    studio,
    metadata,
    outputFileId,
    outputFileName,
    signal,
  } = params;

  await ensureWorkspaceDirs();
  const outputPath = getOutputFilePath(outputFileId, settings.outputFormat);
  const streamDecision = evaluateSmartStreamCopy(sourceAnalysis, settings, studio);
  const warnings = evaluateConversionWarnings(sourceAnalysis, settings);

  const args = buildFfmpegArgs({
    inputPath: sourceEntry.filePath,
    outputPath,
    settings,
    analysis: sourceAnalysis,
    studio,
    metadata: metadata ?? sourceAnalysis.metadata,
    streamCopy: streamDecision.eligible,
  });

  const startedAt = Date.now();

  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderrLogs = '';

    const onAbort = () => {
      child.kill('SIGTERM');
      reject(new Error('CONVERSION_CANCELLED'));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stderr.on('data', (chunk: Buffer) => {
      stderrLogs += chunk.toString('utf8');
      if (stderrLogs.length > 16_000) {
        stderrLogs = stderrLogs.slice(-8_000);
      }
    });

    child.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort);
      reject(err);
    });

    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exit code ${code}: ${stderrLogs.slice(-400)}`));
      }
    });
  });

  const elapsedMs = Date.now() - startedAt;

  // Verify generated output integrity using ffprobe + audio lab analysis
  const resultAnalysis = await probeAudioFile(outputPath, outputFileName, outputFileId);
  await registerWorkspaceFile({
    fileId: outputFileId,
    fileName: outputFileName,
    filePath: outputPath,
    createdAt: new Date().toISOString(),
    kind: 'output',
  });

  const countMetadataFields = (m: AudioMetadata): number =>
    [m.title, m.artist, m.album, m.year, m.genre, m.track, m.composer, m.comment, m.albumArtist].filter(
      (v) => v && v.trim().length > 0
    ).length;

  const sourceMetaCount = countMetadataFields(metadata ?? sourceAnalysis.metadata);
  const resultMetaCount = countMetadataFields(resultAnalysis.metadata);

  const sourceBitrateLabel = sourceAnalysis.isLosslessSource
    ? `Sans perte (${Math.round(sourceAnalysis.bitrateBps / 1000)} kbps)`
    : `${Math.round(sourceAnalysis.bitrateBps / 1000)} kbps`;

  const resultBitrateLabel =
    settings.outputFormat === 'flac' || settings.outputFormat === 'wav'
      ? `Sans perte (${Math.round(resultAnalysis.bitrateBps / 1000)} kbps)`
      : streamDecision.eligible
        ? `${Math.round(resultAnalysis.bitrateBps / 1000)} kbps (Stream Copy)`
        : settings.outputFormat === 'mp3' && settings.encodingMode === 'vbr'
          ? `VBR V${settings.vbrQuality} (~${Math.round(resultAnalysis.bitrateBps / 1000)} kbps)`
          : `${Math.round(resultAnalysis.bitrateBps / 1000)} kbps`;

  const sizeDeltaBytes = resultAnalysis.sizeBytes - sourceAnalysis.sizeBytes;
  const sizeDeltaPercent =
    sourceAnalysis.sizeBytes > 0
      ? Math.round((sizeDeltaBytes / sourceAnalysis.sizeBytes) * 1000) / 10
      : 0;

  const report: ConversionComparisonReport = {
    source: {
      format: sourceAnalysis.detectedFormat,
      codec: sourceAnalysis.codec.toUpperCase(),
      durationSec: sourceAnalysis.durationSec,
      sampleRateHz: sourceAnalysis.sampleRateHz,
      channels: sourceAnalysis.channels,
      bitrateLabel: sourceBitrateLabel,
      sizeBytes: sourceAnalysis.sizeBytes,
      lab: sourceAnalysis.lab,
      metadataCount: sourceMetaCount,
    },
    result: {
      format: resultAnalysis.detectedFormat,
      codec: resultAnalysis.codec.toUpperCase(),
      durationSec: resultAnalysis.durationSec,
      sampleRateHz: resultAnalysis.sampleRateHz,
      channels: resultAnalysis.channels,
      bitrateLabel: resultBitrateLabel,
      sizeBytes: resultAnalysis.sizeBytes,
      lab: resultAnalysis.lab,
      metadataCount: resultMetaCount,
    },
    streamCopied: streamDecision.eligible,
    integrityVerified: resultAnalysis.durationSec > 0 && resultAnalysis.sizeBytes > 0,
    metadataPreserved: !studio.preserveMetadata || sourceMetaCount === 0 || resultMetaCount > 0,
    sizeDeltaBytes,
    sizeDeltaPercent,
    processingDurationMs: elapsedMs,
    warnings,
    ffmpegCommandPreview: formatCommandPreview(args),
  };

  return {
    outputFileId,
    outputFileName,
    outputSizeBytes: resultAnalysis.sizeBytes,
    report,
  };
}

export async function mergeAudioWorkspaceFiles(params: {
  inputEntries: StoredFileEntry[];
  outputFileId: string;
  outputFileName: string;
  outputFormat: ConversionSettings['outputFormat'];
}): Promise<{ outputFileId: string; outputFileName: string; analysis: AudioTrackAnalysis }> {
  await ensureWorkspaceDirs();
  const { inputEntries, outputFileId, outputFileName, outputFormat } = params;
  const outputPath = getOutputFilePath(outputFileId, outputFormat);

  const args: string[] = ['-hide_banner', '-y'];
  for (const entry of inputEntries) {
    args.push('-i', entry.filePath);
  }

  const filterInputs = inputEntries.map((_, i) => `[${i}:a:0]`).join('');
  args.push('-filter_complex', `${filterInputs}concat=n=${inputEntries.length}:v=0:a=1[outa]`);
  args.push('-map', '[outa]');

  if (outputFormat === 'mp3') {
    args.push('-c:a', 'libmp3lame', '-b:a', '320k', '-id3v2_version', '3');
  } else if (outputFormat === 'flac') {
    args.push('-c:a', 'flac');
  } else if (outputFormat === 'wav') {
    args.push('-c:a', 'pcm_s16le');
  } else if (outputFormat === 'ogg') {
    args.push('-c:a', 'libvorbis', '-b:a', '192k');
  } else if (outputFormat === 'opus') {
    args.push('-c:a', 'libopus', '-b:a', '160k');
  } else {
    args.push('-c:a', 'aac', '-b:a', '256k');
  }

  args.push('-metadata', 'title=MeloVox Merged Mix', '-metadata', 'artist=MeloVox Studio');
  args.push(outputPath);

  await execFileAsync('ffmpeg', args, { timeout: 60000 });

  await registerWorkspaceFile({
    fileId: outputFileId,
    fileName: outputFileName,
    filePath: outputPath,
    createdAt: new Date().toISOString(),
    kind: 'output',
  });

  const analysis = await probeAudioFile(outputPath, outputFileName, outputFileId);
  return { outputFileId, outputFileName, analysis };
}

export async function generateSampleAudioSuite(): Promise<AudioTrackAnalysis[]> {
  await ensureWorkspaceDirs();

  const specs = [
    {
      fileId: 'sample_master_wav',
      fileName: 'Master_Symphony_Lossless.wav',
      args: [
        '-f',
        'lavfi',
        '-i',
        'aevalsrc=0.35*sin(2*PI*220*t)+0.25*sin(2*PI*330*t)|0.35*sin(2*PI*220*t)+0.20*sin(2*PI*440*t):s=44100:d=6',
        '-ac',
        '2',
        '-c:a',
        'pcm_s16le',
        '-metadata',
        'title=Master Symphony',
        '-metadata',
        'artist=E-FLEX Studio Orchestra',
        '-metadata',
        'album=Acoustic Benchmark',
        '-metadata',
        'date=2026',
        '-metadata',
        'genre=Classical',
        '-metadata',
        'track=01',
      ],
    },
    {
      fileId: 'sample_vocal_flac',
      fileName: 'Podcast_Studio_Vocal.flac',
      args: [
        '-f',
        'lavfi',
        '-i',
        'aevalsrc=if(lt(t\\,0.8)\\,0\\,if(gt(t\\,5.2)\\,0\\,0.22*sin(2*PI*180*t)*sin(2*PI*3*t))):s=48000:d=6',
        '-c:a',
        'flac',
        '-metadata',
        'title=Episode 14 - Audio Mastering',
        '-metadata',
        'artist=MeloVox Lab',
        '-metadata',
        'album=Audio Engineering Talks',
        '-metadata',
        'date=2026',
        '-metadata',
        'genre=Podcast',
        '-metadata',
        'track=14',
      ],
    },
    {
      fileId: 'sample_voice_96k_mp3',
      fileName: 'Memo_Terrain_96k.mp3',
      args: [
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=260:sample_rate=44100:duration=5',
        '-ac',
        '1',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '96k',
        '-metadata',
        'title=Interview Terrain',
        '-metadata',
        'artist=Reporter Mobile',
      ],
    },
    {
      fileId: 'sample_club_320k_mp3',
      fileName: 'Club_Mix_Master_320k.mp3',
      args: [
        '-f',
        'lavfi',
        '-i',
        'aevalsrc=0.45*sin(2*PI*110*t)|0.45*sin(2*PI*165*t):s=44100:d=5',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '320k',
        '-metadata',
        'title=Midnight Pulse (320k)',
        '-metadata',
        'artist=E-FLEX Electronic',
        '-metadata',
        'album=Club Sessions',
        '-metadata',
        'date=2026',
        '-metadata',
        'genre=Electronic',
        '-metadata',
        'track=04',
      ],
    },
  ];

  const results: AudioTrackAnalysis[] = [];

  for (const spec of specs) {
    const filePath = path.join(INPUT_DIR, spec.fileName);
    let exists = false;
    try {
      await fs.access(filePath);
      exists = true;
    } catch {
      exists = false;
    }

    if (!exists) {
      await execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...spec.args, filePath], {
        timeout: 15000,
      });
    }

    await registerWorkspaceFile({
      fileId: spec.fileId,
      fileName: spec.fileName,
      filePath,
      createdAt: new Date().toISOString(),
      kind: 'input',
    });

    const analysis = await probeAudioFile(filePath, spec.fileName, spec.fileId, { isSample: true });
    results.push(analysis);
  }

  return results;
}

export async function getSystemDiagnostics(): Promise<DiagnosticsSnapshot> {
  let ffmpegVersion = 'Unavailable';
  let ffprobeVersion = 'Unavailable';
  let ffmpegAvailable = false;
  const encoders: Record<string, boolean> = {
    libmp3lame: false,
    aac: false,
    flac: false,
    pcm_s16le: false,
    libvorbis: false,
    libopus: false,
    alac: false,
  };

  try {
    const { stdout } = await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
    ffmpegVersion = stdout.split('\n')[0]?.trim() || 'Detected';
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', ['-version'], { timeout: 5000 });
    ffprobeVersion = stdout.split('\n')[0]?.trim() || 'Detected';
  } catch {
    ffprobeVersion = 'Unavailable';
  }

  try {
    const { stdout } = await execFileAsync('ffmpeg', ['-encoders'], { timeout: 5000 });
    for (const enc of Object.keys(encoders)) {
      encoders[enc] = new RegExp(`\\b${enc}\\b`).test(stdout);
    }
  } catch {
    // leave false
  }

  return {
    appName: 'MeloVox Audio Workspace',
    appVersion: '1.0.0',
    ffmpegAvailable,
    ffmpegVersion,
    ffprobeVersion,
    encoders,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpuCount: os.cpus().length,
  };
}
