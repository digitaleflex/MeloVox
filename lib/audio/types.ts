export type Locale = 'fr' | 'en';
export type ThemeMode = 'dark' | 'light';

export type WorkspaceTab =
  | 'convert'
  | 'lab'
  | 'studio'
  | 'recipes'
  | 'library'
  | 'history';

export type OutputFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'm4a' | 'ogg' | 'opus';

export type EncodingMode = 'cbr' | 'vbr';

export type Mp3Bitrate = 64 | 96 | 128 | 160 | 192 | 224 | 256 | 320;
export type VbrQuality = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SampleRateOption = 'auto' | 22050 | 32000 | 44100 | 48000;
export type ChannelOption = 'auto' | 'mono' | 'stereo';

export type QualityPresetId =
  | 'economique'
  | 'standard'
  | 'haute_qualite'
  | 'maximum'
  | 'intelligent'
  | 'custom';

export type ConversionGoal =
  | 'manual'
  | 'music'
  | 'voice'
  | 'podcast'
  | 'share'
  | 'archive'
  | 'universal';

export type ExistingFilePolicy = 'auto_rename' | 'ask' | 'skip' | 'overwrite';

export type NamingPattern =
  | '{original}'
  | '{artist} - {title}'
  | '{track} - {title}'
  | '{title}';

export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  track: string;
  composer: string;
  comment: string;
  albumArtist: string;
  hasCoverArt: boolean;
  coverArtDataUrl?: string;
}

export interface AudioLabMetrics {
  integratedLufs: number | null;
  loudnessRangeLu: number | null;
  truePeakDbfs: number | null;
  maxVolumeDb: number | null;
  meanVolumeDb: number | null;
  clippingDetected: boolean;
  clippingCount: number;
  leadingSilenceSec: number;
  trailingSilenceSec: number;
  silenceSegmentsCount: number;
}

export interface AudioTrackAnalysis {
  fileId: string;
  fileName: string;
  extension: string;
  detectedFormat: string;
  formatLongName: string;
  codec: string;
  codecLongName: string;
  isLosslessSource: boolean;
  durationSec: number;
  sizeBytes: number;
  bitrateBps: number;
  sampleRateHz: number;
  channels: number;
  channelLayout: string;
  bitDepth: number | null;
  metadata: AudioMetadata;
  lab: AudioLabMetrics;
  isSample?: boolean;
  sourceUrl?: string;
  folderPath?: string;
}

export interface StudioOptions {
  trimEnabled: boolean;
  trimStartSec: number;
  trimEndSec: number | null;
  removeSilence: boolean;
  silenceThresholdDb: number;
  normalizeLoudness: boolean;
  targetLufs: number;
  fadeInSec: number;
  fadeOutSec: number;
  speedFactor: number;
  volumeGainDb: number;
  preserveMetadata: boolean;
}

export interface ConversionSettings {
  outputFormat: OutputFormat;
  presetId: QualityPresetId;
  encodingMode: EncodingMode;
  bitrateKbps: Mp3Bitrate;
  vbrQuality: VbrQuality;
  sampleRate: SampleRateOption;
  channels: ChannelOption;
  namingPattern: NamingPattern;
  existingPolicy: ExistingFilePolicy;
  preserveFolderStructure: boolean;
  outputSubfolder: string;
  concurrentJobs: number;
}

export interface SmartStreamCopyDecision {
  eligible: boolean;
  reasonFr: string;
  reasonEn: string;
}

export interface ConversionWarning {
  code: 'lossy_upscale' | 'sample_rate_clamp' | 'lossy_to_lossless' | 'metadata_limited' | 'clipping_source';
  severity: 'warning' | 'info';
  titleFr: string;
  titleEn: string;
  detailFr: string;
  detailEn: string;
}

export interface SmartRecommendation {
  goal: Exclude<ConversionGoal, 'manual'>;
  recommendedSettings: Partial<ConversionSettings>;
  recommendedStudio: Partial<StudioOptions>;
  headlineFr: string;
  headlineEn: string;
  rationaleFr: string;
  rationaleEn: string;
}

export type QueueStatus =
  | 'pending'
  | 'analyzing'
  | 'ready'
  | 'converting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ConversionComparisonReport {
  source: {
    format: string;
    codec: string;
    durationSec: number;
    sampleRateHz: number;
    channels: number;
    bitrateLabel: string;
    sizeBytes: number;
    lab: AudioLabMetrics;
    metadataCount: number;
  };
  result: {
    format: string;
    codec: string;
    durationSec: number;
    sampleRateHz: number;
    channels: number;
    bitrateLabel: string;
    sizeBytes: number;
    lab: AudioLabMetrics;
    metadataCount: number;
  };
  streamCopied: boolean;
  integrityVerified: boolean;
  metadataPreserved: boolean;
  sizeDeltaBytes: number;
  sizeDeltaPercent: number;
  processingDurationMs: number;
  warnings: ConversionWarning[];
  ffmpegCommandPreview: string;
}

export interface QueueItem {
  id: string;
  fileId: string;
  fileName: string;
  selected: boolean;
  priority: number;
  status: QueueStatus;
  progress: number;
  errorMessage?: string;
  analysis?: AudioTrackAnalysis;
  editedMetadata?: AudioMetadata;
  studioOverrides?: Partial<StudioOptions>;
  outputFileId?: string;
  outputFileName?: string;
  outputSizeBytes?: number;
  report?: ConversionComparisonReport;
  startedAt?: number;
  completedAt?: number;
}

export interface Recipe {
  id: string;
  name: string;
  descriptionFr: string;
  descriptionEn: string;
  isBuiltIn: boolean;
  goal: ConversionGoal;
  settings: Partial<ConversionSettings>;
  studio: Partial<StudioOptions>;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  fileName: string;
  outputFileName: string;
  sourceFormat: string;
  outputFormat: string;
  qualityLabel: string;
  streamCopied: boolean;
  status: 'completed' | 'failed' | 'cancelled';
  durationMs: number;
  sourceSizeBytes: number;
  outputSizeBytes: number;
  errorMessage?: string;
}

export interface TechnicalLogEntry {
  id: string;
  timestamp: string;
  operation: 'analyze' | 'convert' | 'download' | 'merge' | 'system';
  fileName: string;
  result: 'success' | 'error' | 'cancelled';
  durationMs: number;
  code?: string;
  message: string;
}

export interface DiagnosticsSnapshot {
  appName: string;
  appVersion: string;
  ffmpegAvailable: boolean;
  ffmpegVersion: string;
  ffprobeVersion: string;
  encoders: Record<string, boolean>;
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuCount: number;
}
