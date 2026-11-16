import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFfmpegArgs,
  DEFAULT_CONVERSION_SETTINGS,
  DEFAULT_STUDIO_OPTIONS,
  detectLibraryIssues,
  emptyLabMetrics,
  evaluateConversionWarnings,
  evaluateSmartStreamCopy,
  formatOutputFilename,
  recommendConversionSettings,
} from './smart-engine';
import { AudioTrackAnalysis } from './types';

function makeTrack(overrides: Partial<AudioTrackAnalysis> = {}): AudioTrackAnalysis {
  return {
    fileId: 'file_1',
    fileName: 'Studio_Master.flac',
    extension: 'flac',
    detectedFormat: 'flac',
    formatLongName: 'raw FLAC',
    codec: 'flac',
    codecLongName: 'FLAC (Free Lossless Audio Codec)',
    isLosslessSource: true,
    durationSec: 120,
    sizeBytes: 24_000_000,
    bitrateBps: 980_000,
    sampleRateHz: 44100,
    channels: 2,
    channelLayout: 'stereo',
    bitDepth: 16,
    metadata: {
      title: 'Horizon Nocturne',
      artist: 'E-FLEX Ensemble',
      album: 'Acoustic Sessions',
      year: '2026',
      genre: 'Electronic',
      track: '01',
      composer: '',
      comment: '',
      albumArtist: '',
      hasCoverArt: false,
    },
    lab: {
      ...emptyLabMetrics(),
      integratedLufs: -14.2,
      truePeakDbfs: -1.1,
      maxVolumeDb: -1.1,
    },
    ...overrides,
  };
}

test('Smart Recommendation: podcast goal configures mono + -16 LUFS + silence trim', () => {
  const flac = makeTrack();
  const rec = recommendConversionSettings('podcast', flac);
  assert.equal(rec.recommendedSettings.outputFormat, 'mp3');
  assert.equal(rec.recommendedSettings.channels, 'mono');
  assert.equal(rec.recommendedStudio.normalizeLoudness, true);
  assert.equal(rec.recommendedStudio.targetLufs, -16);
  assert.equal(rec.recommendedStudio.removeSilence, true);
});

test('Smart Recommendation: archive goal selects FLAC without lossy processing', () => {
  const wav = makeTrack({ codec: 'pcm_s16le', detectedFormat: 'wav', extension: 'wav' });
  const rec = recommendConversionSettings('archive', wav);
  assert.equal(rec.recommendedSettings.outputFormat, 'flac');
  assert.equal(rec.recommendedStudio.normalizeLoudness, false);
});

test('Smart Stream Copy: eligible when MP3 320k -> MP3 320k CBR with no Studio DSP', () => {
  const mp3_320 = makeTrack({
    fileName: 'Master_320.mp3',
    extension: 'mp3',
    detectedFormat: 'mp3',
    codec: 'mp3',
    isLosslessSource: false,
    bitrateBps: 320_000,
  });
  const decision = evaluateSmartStreamCopy(
    mp3_320,
    DEFAULT_CONVERSION_SETTINGS,
    DEFAULT_STUDIO_OPTIONS
  );
  assert.equal(decision.eligible, true);
});

test('Smart Stream Copy: disabled when Studio normalization or trim is active', () => {
  const mp3_320 = makeTrack({
    fileName: 'Master_320.mp3',
    extension: 'mp3',
    detectedFormat: 'mp3',
    codec: 'mp3',
    isLosslessSource: false,
    bitrateBps: 320_000,
  });
  const decision = evaluateSmartStreamCopy(mp3_320, DEFAULT_CONVERSION_SETTINGS, {
    ...DEFAULT_STUDIO_OPTIONS,
    normalizeLoudness: true,
  });
  assert.equal(decision.eligible, false);
});

test('Smart Stream Copy: disabled when transcoding FLAC -> MP3', () => {
  const flac = makeTrack();
  const decision = evaluateSmartStreamCopy(flac, DEFAULT_CONVERSION_SETTINGS, DEFAULT_STUDIO_OPTIONS);
  assert.equal(decision.eligible, false);
});

test('Quality Warnings: flags 96 kbps MP3 upscaled to 320 kbps CBR', () => {
  const mp3_96 = makeTrack({
    fileName: 'VoiceNote_96k.mp3',
    extension: 'mp3',
    detectedFormat: 'mp3',
    codec: 'mp3',
    isLosslessSource: false,
    bitrateBps: 96_000,
  });
  const warnings = evaluateConversionWarnings(mp3_96, DEFAULT_CONVERSION_SETTINGS);
  assert.ok(warnings.some((w) => w.code === 'lossy_upscale'));
});

test('buildFfmpegArgs: builds libmp3lame 320k CBR with ID3v2.3 and metadata', () => {
  const flac = makeTrack();
  const args = buildFfmpegArgs({
    inputPath: '/tmp/in.flac',
    outputPath: '/tmp/out.mp3',
    settings: DEFAULT_CONVERSION_SETTINGS,
    analysis: flac,
    studio: DEFAULT_STUDIO_OPTIONS,
    metadata: flac.metadata,
    streamCopy: false,
  });

  assert.ok(args.includes('libmp3lame'));
  assert.ok(args.includes('320k'));
  assert.ok(args.includes('-id3v2_version'));
  assert.ok(args.includes('title=Horizon Nocturne'));
  assert.equal(args[args.length - 1], '/tmp/out.mp3');
});

test('buildFfmpegArgs: builds stream copy command when eligible', () => {
  const mp3 = makeTrack({ codec: 'mp3', detectedFormat: 'mp3', isLosslessSource: false, bitrateBps: 320_000 });
  const args = buildFfmpegArgs({
    inputPath: '/tmp/in.mp3',
    outputPath: '/tmp/out.mp3',
    settings: DEFAULT_CONVERSION_SETTINGS,
    analysis: mp3,
    studio: DEFAULT_STUDIO_OPTIONS,
    streamCopy: true,
  });
  const cIndex = args.indexOf('-c:a');
  assert.notEqual(cIndex, -1);
  assert.equal(args[cIndex + 1], 'copy');
});

test('buildFfmpegArgs: never artificially upsamples 22050 Hz source to 48000 Hz', () => {
  const lowRateTrack = makeTrack({ sampleRateHz: 22050 });
  const args = buildFfmpegArgs({
    inputPath: '/tmp/in.wav',
    outputPath: '/tmp/out.mp3',
    settings: { ...DEFAULT_CONVERSION_SETTINGS, sampleRate: 48000 },
    analysis: lowRateTrack,
    studio: DEFAULT_STUDIO_OPTIONS,
    streamCopy: false,
  });
  const arIndex = args.indexOf('-ar');
  assert.notEqual(arIndex, -1);
  assert.equal(args[arIndex + 1], '22050');
});

test('formatOutputFilename: handles collision policies cleanly', () => {
  const existing = new Set(['song.mp3']);
  const renamed = formatOutputFilename('Song.wav', '{original}', 'mp3', undefined, existing, 'auto_rename');
  assert.equal(renamed.fileName, 'Song (1).mp3');
  assert.equal(renamed.skipped, false);

  const skipped = formatOutputFilename('Song.wav', '{original}', 'mp3', undefined, existing, 'skip');
  assert.equal(skipped.skipped, true);
});

test('detectLibraryIssues: detects duplicate audio signatures and missing metadata', () => {
  const t1 = makeTrack({ fileId: 'a', sizeBytes: 5000, durationSec: 10.0, sampleRateHz: 44100 });
  const t2 = makeTrack({
    fileId: 'b',
    fileName: 'Copy.flac',
    sizeBytes: 5000,
    durationSec: 10.0,
    sampleRateHz: 44100,
    metadata: {
      ...t1.metadata,
      title: '',
      artist: '',
    },
  });

  const issues = detectLibraryIssues([t1, t2]);
  assert.equal(issues.duplicateIds.has('a'), true);
  assert.equal(issues.duplicateIds.has('b'), true);
  assert.equal(issues.missingMetadataIds.has('b'), true);
  assert.equal(issues.missingMetadataIds.has('a'), false);
});
