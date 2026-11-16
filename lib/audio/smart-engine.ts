import {
  AudioLabMetrics,
  AudioMetadata,
  AudioTrackAnalysis,
  ConversionGoal,
  ConversionSettings,
  ConversionWarning,
  ExistingFilePolicy,
  Mp3Bitrate,
  NamingPattern,
  OutputFormat,
  QualityPresetId,
  Recipe,
  SampleRateOption,
  SmartRecommendation,
  SmartStreamCopyDecision,
  StudioOptions,
} from './types';

export const LOSSLESS_CODECS = new Set([
  'pcm_s16le',
  'pcm_s24le',
  'pcm_s32le',
  'pcm_f32le',
  'pcm_s16be',
  'pcm_s24be',
  'pcm_u8',
  'flac',
  'alac',
  'ape',
  'wavpack',
  'tta',
  'mlp',
  'truehd',
]);

export const SUPPORTED_OUTPUT_FORMATS: {
  id: OutputFormat;
  label: string;
  extension: string;
  lossless: boolean;
  supportsMetadata: boolean;
}[] = [
  { id: 'mp3', label: 'MP3', extension: 'mp3', lossless: false, supportsMetadata: true },
  { id: 'flac', label: 'FLAC', extension: 'flac', lossless: true, supportsMetadata: true },
  { id: 'wav', label: 'WAV', extension: 'wav', lossless: true, supportsMetadata: true },
  { id: 'aac', label: 'AAC', extension: 'aac', lossless: false, supportsMetadata: false },
  { id: 'm4a', label: 'M4A', extension: 'm4a', lossless: false, supportsMetadata: true },
  { id: 'ogg', label: 'OGG', extension: 'ogg', lossless: false, supportsMetadata: true },
  { id: 'opus', label: 'OPUS', extension: 'opus', lossless: false, supportsMetadata: true },
];

export const QUALITY_PRESETS: Record<
  Exclude<QualityPresetId, 'custom'>,
  {
    id: Exclude<QualityPresetId, 'custom'>;
    labelFr: string;
    labelEn: string;
    specLabel: string;
    descriptionFr: string;
    descriptionEn: string;
    encodingMode: 'cbr' | 'vbr';
    bitrateKbps: Mp3Bitrate;
    vbrQuality: 0 | 2 | 4;
  }
> = {
  economique: {
    id: 'economique',
    labelFr: 'Économique',
    labelEn: 'Economy',
    specLabel: 'MP3 128 kbps CBR',
    descriptionFr: 'Taille réduite.',
    descriptionEn: 'Reduced file size.',
    encodingMode: 'cbr',
    bitrateKbps: 128,
    vbrQuality: 4,
  },
  standard: {
    id: 'standard',
    labelFr: 'Standard',
    labelEn: 'Standard',
    specLabel: 'MP3 192 kbps CBR',
    descriptionFr: 'Usage quotidien.',
    descriptionEn: 'Everyday playback.',
    encodingMode: 'cbr',
    bitrateKbps: 192,
    vbrQuality: 2,
  },
  haute_qualite: {
    id: 'haute_qualite',
    labelFr: 'Haute qualité',
    labelEn: 'High Quality',
    specLabel: 'MP3 256 kbps CBR',
    descriptionFr: 'Écoute soignée.',
    descriptionEn: 'Higher fidelity.',
    encodingMode: 'cbr',
    bitrateKbps: 256,
    vbrQuality: 0,
  },
  maximum: {
    id: 'maximum',
    labelFr: 'Maximum',
    labelEn: 'Maximum',
    specLabel: 'MP3 320 kbps CBR',
    descriptionFr: 'Débit MP3 maximal.',
    descriptionEn: 'Max MP3 bitrate.',
    encodingMode: 'cbr',
    bitrateKbps: 320,
    vbrQuality: 0,
  },
  intelligent: {
    id: 'intelligent',
    labelFr: 'Intelligent',
    labelEn: 'Smart VBR',
    specLabel: 'MP3 VBR V0',
    descriptionFr: 'Qualité & taille.',
    descriptionEn: 'Best ratio.',
    encodingMode: 'vbr',
    bitrateKbps: 320,
    vbrQuality: 0,
  },
};

export const DEFAULT_CONVERSION_SETTINGS: ConversionSettings = {
  outputFormat: 'mp3',
  presetId: 'maximum',
  encodingMode: 'cbr',
  bitrateKbps: 320,
  vbrQuality: 0,
  sampleRate: 'auto',
  channels: 'auto',
  namingPattern: '{original}',
  existingPolicy: 'auto_rename',
  preserveFolderStructure: false,
  outputSubfolder: 'MeloVox_Output',
  concurrentJobs: 2,
};

export const DEFAULT_STUDIO_OPTIONS: StudioOptions = {
  trimEnabled: false,
  trimStartSec: 0,
  trimEndSec: null,
  removeSilence: false,
  silenceThresholdDb: -45,
  normalizeLoudness: false,
  targetLufs: -16,
  fadeInSec: 0,
  fadeOutSec: 0,
  speedFactor: 1,
  volumeGainDb: 0,
  preserveMetadata: true,
};

export const BUILT_IN_RECIPES: Recipe[] = [
  {
    id: 'recipe_music_hq',
    name: 'Music_High_Quality',
    descriptionFr: 'MP3 320 kbps CBR, préservation stéréo et métadonnées complètes.',
    descriptionEn: 'MP3 320 kbps CBR with stereo preservation and full tags.',
    isBuiltIn: true,
    goal: 'music',
    settings: {
      outputFormat: 'mp3',
      presetId: 'maximum',
      encodingMode: 'cbr',
      bitrateKbps: 320,
      sampleRate: 'auto',
      channels: 'auto',
    },
    studio: {
      normalizeLoudness: false,
      removeSilence: false,
      preserveMetadata: true,
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'recipe_podcast_320k',
    name: 'Podcast_320K',
    descriptionFr: 'Voix claire normalisée à -16 LUFS, silence initial coupé, MP3 192–320k.',
    descriptionEn: 'Broadcast-ready voice normalized to -16 LUFS with silence trim.',
    isBuiltIn: true,
    goal: 'podcast',
    settings: {
      outputFormat: 'mp3',
      presetId: 'standard',
      encodingMode: 'cbr',
      bitrateKbps: 192,
      sampleRate: 44100,
      channels: 'mono',
    },
    studio: {
      normalizeLoudness: true,
      targetLufs: -16,
      removeSilence: true,
      preserveMetadata: true,
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'recipe_whatsapp_voice',
    name: 'WhatsApp_Voice',
    descriptionFr: 'Fichier léger pour messagerie mobile : OPUS/MP3 mono 96 kbps.',
    descriptionEn: 'Compact mobile messaging profile: mono 96 kbps.',
    isBuiltIn: true,
    goal: 'share',
    settings: {
      outputFormat: 'mp3',
      presetId: 'custom',
      encodingMode: 'cbr',
      bitrateKbps: 96,
      sampleRate: 44100,
      channels: 'mono',
    },
    studio: {
      normalizeLoudness: true,
      targetLufs: -16,
      removeSilence: true,
      preserveMetadata: true,
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'recipe_archive_flac',
    name: 'Archive_FLAC',
    descriptionFr: 'Archivage sans perte en FLAC avec conservation intégrale des tags.',
    descriptionEn: 'Lossless FLAC archival preserving original sample rate & metadata.',
    isBuiltIn: true,
    goal: 'archive',
    settings: {
      outputFormat: 'flac',
      presetId: 'custom',
      sampleRate: 'auto',
      channels: 'auto',
    },
    studio: {
      normalizeLoudness: false,
      removeSilence: false,
      preserveMetadata: true,
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'recipe_voice_recording',
    name: 'Voice_Recording',
    descriptionFr: 'Optimisé pour dictaphone, cours et interviews (Mono, VBR V2).',
    descriptionEn: 'Optimized for spoken interviews and lectures (Mono, VBR V2).',
    isBuiltIn: true,
    goal: 'voice',
    settings: {
      outputFormat: 'mp3',
      presetId: 'custom',
      encodingMode: 'vbr',
      vbrQuality: 2,
      sampleRate: 44100,
      channels: 'mono',
    },
    studio: {
      normalizeLoudness: true,
      targetLufs: -18,
      removeSilence: false,
      preserveMetadata: true,
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'recipe_web_optimized',
    name: 'Web_Optimized',
    descriptionFr: 'MP3 VBR V0 universel pour diffusion web rapide et fidèle.',
    descriptionEn: 'Universal MP3 VBR V0 for fast web streaming and high fidelity.',
    isBuiltIn: true,
    goal: 'universal',
    settings: {
      outputFormat: 'mp3',
      presetId: 'intelligent',
      encodingMode: 'vbr',
      vbrQuality: 0,
      sampleRate: 'auto',
      channels: 'auto',
    },
    studio: {
      normalizeLoudness: false,
      preserveMetadata: true,
    },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
];

export function hasActiveStudioProcessing(studio: StudioOptions): boolean {
  return (
    studio.trimEnabled ||
    studio.removeSilence ||
    studio.normalizeLoudness ||
    studio.fadeInSec > 0 ||
    studio.fadeOutSec > 0 ||
    Math.abs(studio.speedFactor - 1) > 0.001 ||
    Math.abs(studio.volumeGainDb) > 0.01
  );
}

export function recommendConversionSettings(
  goal: Exclude<ConversionGoal, 'manual'>,
  analysis?: AudioTrackAnalysis
): SmartRecommendation {
  const sourceRate = analysis?.sampleRateHz ?? 44100;
  const clampedMp3Rate: SampleRateOption = sourceRate > 48000 ? 48000 : 'auto';
  const sourceKbps = analysis ? Math.round(analysis.bitrateBps / 1000) : 0;

  switch (goal) {
    case 'music':
      return {
        goal,
        recommendedSettings: {
          outputFormat: 'mp3',
          presetId: 'maximum',
          encodingMode: 'cbr',
          bitrateKbps: 320,
          sampleRate: clampedMp3Rate,
          channels: 'auto',
        },
        recommendedStudio: {
          normalizeLoudness: false,
          removeSilence: false,
          preserveMetadata: true,
        },
        headlineFr: 'Profil Musique — MP3 320 kbps CBR (fidélité maximale)',
        headlineEn: 'Music Profile — MP3 320 kbps CBR (maximum fidelity)',
        rationaleFr:
          analysis && !analysis.isLosslessSource && sourceKbps > 0 && sourceKbps < 256
            ? `Source déjà compressée à ${sourceKbps} kbps : MP3 VBR V0 ou 320k préserve ce qui reste sans recréer les fréquences perdues.`
            : 'Conserve la spatialisation stéréo, les métadonnées ID3 et la fréquence d’échantillonnage jusqu’à 48 kHz sans traitement altérant la dynamique.',
        rationaleEn:
          analysis && !analysis.isLosslessSource && sourceKbps > 0 && sourceKbps < 256
            ? `Source is already lossy at ${sourceKbps} kbps: conversion preserves remaining fidelity without restoring lost detail.`
            : 'Preserves stereo imaging, ID3 tags, and source sample rate up to 48 kHz without altering dynamic range.',
      };

    case 'voice':
      return {
        goal,
        recommendedSettings: {
          outputFormat: 'mp3',
          presetId: 'custom',
          encodingMode: 'vbr',
          vbrQuality: 2,
          sampleRate: sourceRate >= 44100 ? 44100 : 'auto',
          channels: 'mono',
        },
        recommendedStudio: {
          normalizeLoudness: true,
          targetLufs: -18,
          removeSilence: false,
          preserveMetadata: true,
        },
        headlineFr: 'Profil Voix — MP3 Mono VBR V2 + normalisation douce (-18 LUFS)',
        headlineEn: 'Voice Profile — MP3 Mono VBR V2 + gentle normalization (-18 LUFS)',
        rationaleFr:
          'La voix parlée ne nécessite pas de stéréo lourde : le passage en mono divise la bande passante requise tout en assurant une intelligibilité homogène.',
        rationaleEn:
          'Spoken voice benefits from mono channel consolidation and -18 LUFS leveling for crisp, consistent speech.',
      };

    case 'podcast':
      return {
        goal,
        recommendedSettings: {
          outputFormat: 'mp3',
          presetId: 'standard',
          encodingMode: 'cbr',
          bitrateKbps: 192,
          sampleRate: 44100,
          channels: 'mono',
        },
        recommendedStudio: {
          normalizeLoudness: true,
          targetLufs: -16,
          removeSilence: true,
          preserveMetadata: true,
        },
        headlineFr: 'Profil Podcast — MP3 192 kbps · -16 LUFS · Silences optimisés',
        headlineEn: 'Podcast Profile — MP3 192 kbps · -16 LUFS · Silence trim',
        rationaleFr:
          'Conforme au standard d’écoute mobile (-16 LUFS), compatibilité universelle avec tous les lecteurs RSS et poids maîtrisé.',
        rationaleEn:
          'Matches podcast loudness standard (-16 LUFS) with universal RSS player compatibility and lean file size.',
      };

    case 'share':
      return {
        goal,
        recommendedSettings: {
          outputFormat: 'mp3',
          presetId: 'economique',
          encodingMode: 'cbr',
          bitrateKbps: 128,
          sampleRate: 44100,
          channels: 'auto',
        },
        recommendedStudio: {
          normalizeLoudness: false,
          removeSilence: false,
          preserveMetadata: true,
        },
        headlineFr: 'Profil Partage — MP3 128 kbps CBR compact',
        headlineEn: 'Share Profile — Compact MP3 128 kbps CBR',
        rationaleFr:
          'Divise le poids par ~2,5 par rapport au 320 kbps pour un envoi rapide par e-mail ou messagerie tout en restant propre à l’écoute.',
        rationaleEn:
          'Reduces file size by ~2.5x vs 320 kbps for fast email and chat sharing while keeping clean playback.',
      };

    case 'archive':
      return {
        goal,
        recommendedSettings: {
          outputFormat: 'flac',
          presetId: 'custom',
          sampleRate: 'auto',
          channels: 'auto',
        },
        recommendedStudio: {
          normalizeLoudness: false,
          removeSilence: false,
          preserveMetadata: true,
        },
        headlineFr: 'Profil Archivage — FLAC sans perte (bit-perfect)',
        headlineEn: 'Archive Profile — Lossless FLAC (bit-perfect)',
        rationaleFr:
          analysis && !analysis.isLosslessSource
            ? 'Attention : votre source est déjà compressée avec perte. Le FLAC préservera exactement le signal actuel sans dégradation future, sans restaurer les pertes passées.'
            : 'Compression mathématiquement sans perte avec vérification d’intégrité et conservation complète des tags.',
        rationaleEn:
          analysis && !analysis.isLosslessSource
            ? 'Note: your source is already lossy. FLAC prevents any future generational loss without restoring prior compression artifacts.'
            : 'Mathematically lossless compression with stream integrity and complete metadata retention.',
      };

    case 'universal':
      return {
        goal,
        recommendedSettings: {
          outputFormat: 'mp3',
          presetId: 'intelligent',
          encodingMode: 'vbr',
          vbrQuality: 0,
          sampleRate: clampedMp3Rate,
          channels: 'auto',
        },
        recommendedStudio: {
          normalizeLoudness: false,
          removeSilence: false,
          preserveMetadata: true,
        },
        headlineFr: 'Compatibilité Universelle — MP3 VBR V0',
        headlineEn: 'Universal Compatibility — MP3 VBR V0',
        rationaleFr:
          'Lisible sur 100 % des autoradios, smartphones, téléviseurs et OS avec une transparence acoustique quasi indiscernable du 320 kbps CBR.',
        rationaleEn:
          'Plays on virtually every car stereo, phone, and OS with acoustic transparency matching 320 kbps at smaller size.',
      };
  }
}

export function evaluateSmartStreamCopy(
  analysis: AudioTrackAnalysis | undefined,
  settings: ConversionSettings,
  studio: StudioOptions
): SmartStreamCopyDecision {
  if (!analysis) {
    return {
      eligible: false,
      reasonFr: 'Analyse en attente.',
      reasonEn: 'Waiting for file probe.',
    };
  }

  if (hasActiveStudioProcessing(studio)) {
    return {
      eligible: false,
      reasonFr: 'Réencodage requis : des traitements Studio (découpe, normalisation ou fondu) sont activés.',
      reasonEn: 'Re-encode required: Studio DSP filters are active.',
    };
  }

  const codec = analysis.codec.toLowerCase();
  const target = settings.outputFormat;

  const codecMatchesTarget =
    (target === 'mp3' && codec === 'mp3') ||
    (target === 'flac' && codec === 'flac') ||
    (target === 'aac' && codec === 'aac') ||
    (target === 'm4a' && codec === 'aac') ||
    (target === 'ogg' && codec === 'vorbis') ||
    (target === 'opus' && codec === 'opus') ||
    (target === 'wav' && codec.startsWith('pcm_s16le'));

  if (!codecMatchesTarget) {
    return {
      eligible: false,
      reasonFr: `Transcodage nécessaire (${codec.toUpperCase()} → ${target.toUpperCase()}).`,
      reasonEn: `Transcode required (${codec.toUpperCase()} → ${target.toUpperCase()}).`,
    };
  }

  if (settings.sampleRate !== 'auto' && settings.sampleRate !== analysis.sampleRateHz) {
    return {
      eligible: false,
      reasonFr: `Rééchantillonnage demandé (${analysis.sampleRateHz} Hz → ${settings.sampleRate} Hz).`,
      reasonEn: `Resampling requested (${analysis.sampleRateHz} Hz → ${settings.sampleRate} Hz).`,
    };
  }

  if (
    (settings.channels === 'mono' && analysis.channels !== 1) ||
    (settings.channels === 'stereo' && analysis.channels !== 2)
  ) {
    return {
      eligible: false,
      reasonFr: 'Remixage de canaux demandé.',
      reasonEn: 'Channel remix requested.',
    };
  }

  if (target === 'mp3') {
    const sourceKbps = Math.round(analysis.bitrateBps / 1000);
    if (settings.encodingMode === 'cbr') {
      // Allow stream copy if source MP3 already matches target CBR bitrate (within tolerance)
      if (Math.abs(sourceKbps - settings.bitrateKbps) <= 12) {
        return {
          eligible: true,
          reasonFr: `Smart Stream Copy actif : la source est déjà en MP3 ~${sourceKbps} kbps. Le flux audio est copié sans perte ni réencodage.`,
          reasonEn: `Smart Stream Copy active: source is already MP3 ~${sourceKbps} kbps. Audio frames copied losslessly without re-encoding.`,
        };
      }
      return {
        eligible: false,
        reasonFr: `Débit cible différent (${sourceKbps} kbps → ${settings.bitrateKbps} kbps).`,
        reasonEn: `Target bitrate differs (${sourceKbps} kbps → ${settings.bitrateKbps} kbps).`,
      };
    }
    // VBR mode: if source is already MP3 and user didn't force CBR change
    if (sourceKbps >= 220 && settings.vbrQuality === 0) {
      return {
        eligible: true,
        reasonFr: `Smart Stream Copy actif : flux MP3 haute qualité (${sourceKbps} kbps) copié à l'identique.`,
        reasonEn: `Smart Stream Copy active: high-bitrate MP3 (${sourceKbps} kbps) copied bit-for-bit.`,
      };
    }
    return {
      eligible: false,
      reasonFr: 'Réencodage VBR demandé.',
      reasonEn: 'VBR re-encoding requested.',
    };
  }

  return {
    eligible: true,
    reasonFr: `Smart Stream Copy actif : conteneur et codec ${codec.toUpperCase()} déjà conformes.`,
    reasonEn: `Smart Stream Copy active: ${codec.toUpperCase()} stream already matches target.`,
  };
}

export function evaluateConversionWarnings(
  analysis: AudioTrackAnalysis,
  settings: ConversionSettings
): ConversionWarning[] {
  const warnings: ConversionWarning[] = [];
  const sourceKbps = Math.round(analysis.bitrateBps / 1000);

  if (
    !analysis.isLosslessSource &&
    settings.outputFormat === 'mp3' &&
    settings.encodingMode === 'cbr' &&
    sourceKbps > 0 &&
    settings.bitrateKbps > sourceKbps + 32
  ) {
    warnings.push({
      code: 'lossy_upscale',
      severity: 'warning',
      titleFr: `Attention : conversion ${sourceKbps} kbps → ${settings.bitrateKbps} kbps`,
      titleEn: `Notice: upscaling ${sourceKbps} kbps → ${settings.bitrateKbps} kbps`,
      detailFr:
        'Augmenter le débit vers 320 kbps augmente la taille du fichier mais ne restaure jamais les fréquences déjà perdues dans la source compressée.',
      detailEn:
        'Raising bitrate to 320 kbps increases file size without restoring audio detail already discarded in the lossy source.',
    });
  }

  if (!analysis.isLosslessSource && (settings.outputFormat === 'flac' || settings.outputFormat === 'wav')) {
    warnings.push({
      code: 'lossy_to_lossless',
      severity: 'info',
      titleFr: 'Source compressée vers format sans perte',
      titleEn: 'Lossy source to lossless container',
      detailFr:
        'Le fichier de sortie ne subira aucune perte supplémentaire mais conservera les artefacts de la source compressée.',
      detailEn:
        'Output preserves exact decoded audio without new compression artifacts, though source loss remains.',
    });
  }

  if (settings.outputFormat === 'mp3' && analysis.sampleRateHz > 48000 && settings.sampleRate === 'auto') {
    warnings.push({
      code: 'sample_rate_clamp',
      severity: 'info',
      titleFr: `Fréquence adaptée (${analysis.sampleRateHz} Hz → 48 000 Hz)`,
      titleEn: `Sample rate adapted (${analysis.sampleRateHz} Hz → 48,000 Hz)`,
      detailFr: 'La norme MPEG-1 Layer III (MP3) plafonne à 48 kHz.',
      detailEn: 'The MP3 specification supports sample rates up to 48 kHz.',
    });
  }

  if (analysis.lab.clippingDetected) {
    warnings.push({
      code: 'clipping_source',
      severity: 'warning',
      titleFr: 'Saturation détectée dans le fichier source',
      titleEn: 'Source clipping detected',
      detailFr: `Pic maximal mesuré à ${analysis.lab.truePeakDbfs ?? analysis.lab.maxVolumeDb ?? 0} dBFS. Activez la normalisation Studio si nécessaire.`,
      detailEn: `Peak measured at ${analysis.lab.truePeakDbfs ?? analysis.lab.maxVolumeDb ?? 0} dBFS. Consider enabling Studio normalization.`,
    });
  }

  if (settings.outputFormat === 'aac') {
    warnings.push({
      code: 'metadata_limited',
      severity: 'info',
      titleFr: 'Métadonnées limitées en AAC brut (.aac)',
      titleEn: 'Limited metadata in raw ADTS (.aac)',
      detailFr: 'Préférez le conteneur M4A pour conserver pochette et tags ID3/iTunes.',
      detailEn: 'Use M4A container to preserve full tags and album artwork.',
    });
  }

  return warnings;
}

export function buildFfmpegArgs(params: {
  inputPath: string;
  outputPath: string;
  settings: ConversionSettings;
  analysis: AudioTrackAnalysis;
  studio: StudioOptions;
  metadata?: AudioMetadata;
  streamCopy: boolean;
}): string[] {
  const { inputPath, outputPath, settings, analysis, studio, metadata, streamCopy } = params;
  const args: string[] = ['-hide_banner', '-y', '-i', inputPath];

  // Map primary audio stream explicitly
  args.push('-map', '0:a:0');

  if (streamCopy) {
    args.push('-c:a', 'copy');
    if (studio.preserveMetadata) {
      args.push('-map_metadata', '0');
    } else {
      args.push('-map_metadata', '-1');
    }
    if (settings.outputFormat === 'mp3') {
      args.push('-id3v2_version', '3');
    }
    args.push(...buildMetadataArgs(metadata, studio.preserveMetadata));
    args.push('-progress', 'pipe:1', '-nostats', outputPath);
    return args;
  }

  // Audio filters chain
  const filters: string[] = [];

  if (studio.trimEnabled) {
    const start = Math.max(0, studio.trimStartSec);
    if (studio.trimEndSec !== null && studio.trimEndSec > start) {
      filters.push(`atrim=start=${start.toFixed(3)}:end=${studio.trimEndSec.toFixed(3)},asetpts=PTS-STARTPTS`);
    } else if (start > 0) {
      filters.push(`atrim=start=${start.toFixed(3)},asetpts=PTS-STARTPTS`);
    }
  }

  if (studio.removeSilence) {
    const thresh = studio.silenceThresholdDb || -45;
    filters.push(
      `silenceremove=start_periods=1:start_duration=0.1:start_threshold=${thresh}dB:stop_periods=-1:stop_duration=0.25:stop_threshold=${thresh}dB`
    );
  }

  if (Math.abs(studio.volumeGainDb) > 0.05) {
    filters.push(`volume=${studio.volumeGainDb.toFixed(1)}dB`);
  }

  if (studio.normalizeLoudness) {
    const lufs = Math.min(-9, Math.max(-24, studio.targetLufs || -16));
    filters.push(`loudnorm=I=${lufs}:TP=-1.5:LRA=11`);
  }

  if (studio.fadeInSec > 0) {
    filters.push(`afade=t=in:st=0:d=${studio.fadeInSec.toFixed(2)}`);
  }

  if (studio.fadeOutSec > 0 && analysis.durationSec > studio.fadeOutSec) {
    const effectiveDur =
      studio.trimEnabled && studio.trimEndSec !== null
        ? Math.max(0.2, studio.trimEndSec - studio.trimStartSec)
        : analysis.durationSec;
    const fadeStart = Math.max(0, effectiveDur - studio.fadeOutSec);
    filters.push(`afade=t=out:st=${fadeStart.toFixed(2)}:d=${studio.fadeOutSec.toFixed(2)}`);
  }

  if (Math.abs(studio.speedFactor - 1) > 0.01) {
    const speed = Math.min(2.0, Math.max(0.5, studio.speedFactor));
    filters.push(`atempo=${speed.toFixed(2)}`);
  }

  if (filters.length > 0) {
    args.push('-af', filters.join(','));
  }

  // Codec & quality settings
  switch (settings.outputFormat) {
    case 'mp3': {
      args.push('-c:a', 'libmp3lame');
      if (settings.encodingMode === 'vbr') {
        args.push('-q:a', String(settings.vbrQuality));
      } else {
        args.push('-b:a', `${settings.bitrateKbps}k`);
      }
      args.push('-id3v2_version', '3');
      break;
    }
    case 'wav':
      args.push('-c:a', 'pcm_s16le');
      break;
    case 'flac':
      args.push('-c:a', 'flac', '-compression_level', '5');
      break;
    case 'aac':
    case 'm4a':
      args.push('-c:a', 'aac', '-b:a', `${Math.min(320, Math.max(96, settings.bitrateKbps))}k`);
      break;
    case 'ogg':
      args.push('-c:a', 'libvorbis', '-b:a', `${Math.min(320, Math.max(96, settings.bitrateKbps))}k`);
      break;
    case 'opus':
      args.push('-c:a', 'libopus', '-b:a', `${Math.min(256, Math.max(64, settings.bitrateKbps))}k`);
      break;
  }

  // Sample rate (never artificially upsample above source)
  if (settings.sampleRate !== 'auto') {
    const requestedRate = settings.sampleRate;
    const cappedRate =
      analysis.sampleRateHz > 0 ? Math.min(requestedRate, analysis.sampleRateHz) : requestedRate;
    args.push('-ar', String(cappedRate));
  } else if (settings.outputFormat === 'mp3' && analysis.sampleRateHz > 48000) {
    args.push('-ar', '48000');
  } else if (settings.outputFormat === 'opus') {
    args.push('-ar', '48000');
  }

  // Channels
  if (settings.channels === 'mono') {
    args.push('-ac', '1');
  } else if (settings.channels === 'stereo') {
    args.push('-ac', '2');
  }

  // Metadata
  if (studio.preserveMetadata) {
    args.push('-map_metadata', '0');
  } else {
    args.push('-map_metadata', '-1');
  }
  args.push(...buildMetadataArgs(metadata, studio.preserveMetadata));

  args.push('-progress', 'pipe:1', '-nostats', outputPath);
  return args;
}

function buildMetadataArgs(metadata: AudioMetadata | undefined, preserve: boolean): string[] {
  if (!metadata || !preserve) return [];
  const entries: [string, string][] = [
    ['title', metadata.title],
    ['artist', metadata.artist],
    ['album', metadata.album],
    ['date', metadata.year],
    ['genre', metadata.genre],
    ['track', metadata.track],
    ['composer', metadata.composer],
    ['comment', metadata.comment],
    ['album_artist', metadata.albumArtist],
  ];
  const args: string[] = [];
  for (const [key, val] of entries) {
    if (val && val.trim().length > 0) {
      args.push('-metadata', `${key}=${val.trim()}`);
    }
  }
  return args;
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'audio_track';
}

export function formatOutputFilename(
  originalFileName: string,
  pattern: NamingPattern,
  targetFormat: OutputFormat,
  metadata: AudioMetadata | undefined,
  existingNames: Set<string>,
  policy: ExistingFilePolicy
): { fileName: string; skipped: boolean; conflict: boolean } {
  const baseOriginal = originalFileName.replace(/\.[^/.]+$/, '');
  const title = metadata?.title?.trim() || baseOriginal;
  const artist = metadata?.artist?.trim() || 'Unknown Artist';
  const track = metadata?.track?.trim() || '01';

  let stem = baseOriginal;
  if (pattern === '{artist} - {title}') {
    stem = `${artist} - ${title}`;
  } else if (pattern === '{track} - {title}') {
    stem = `${track} - ${title}`;
  } else if (pattern === '{title}') {
    stem = title;
  }

  const safeStem = sanitizeFilename(stem);
  const candidate = `${safeStem}.${targetFormat}`;

  if (!existingNames.has(candidate.toLowerCase())) {
    return { fileName: candidate, skipped: false, conflict: false };
  }

  if (policy === 'skip') {
    return { fileName: candidate, skipped: true, conflict: true };
  }

  if (policy === 'overwrite') {
    return { fileName: candidate, skipped: false, conflict: true };
  }

  // auto_rename or resolved collision
  let counter = 1;
  while (existingNames.has(`${safeStem} (${counter}).${targetFormat}`.toLowerCase())) {
    counter += 1;
  }
  return { fileName: `${safeStem} (${counter}).${targetFormat}`, skipped: false, conflict: true };
}

export function detectLibraryIssues(tracks: AudioTrackAnalysis[]): {
  duplicateIds: Set<string>;
  missingMetadataIds: Set<string>;
} {
  const seenSignatures = new Map<string, string>();
  const duplicateIds = new Set<string>();
  const missingMetadataIds = new Set<string>();

  for (const t of tracks) {
    // Signature based on normalized title/size+duration
    const durationBucket = Math.round(t.durationSec * 10);
    const sig = `${t.sizeBytes}:${durationBucket}:${t.sampleRateHz}`;
    if (seenSignatures.has(sig)) {
      duplicateIds.add(t.fileId);
      duplicateIds.add(seenSignatures.get(sig)!);
    } else {
      seenSignatures.set(sig, t.fileId);
    }

    if (!t.metadata.title.trim() || !t.metadata.artist.trim()) {
      missingMetadataIds.add(t.fileId);
    }
  }

  return { duplicateIds, missingMetadataIds };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 10 || idx === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatCommandPreview(args: string[]): string {
  return `ffmpeg ${args
    .map((a) => (a.includes(' ') ? `"${a}"` : a))
    .join(' ')
    .replace(/\/tmp\/[^ ]+/g, '<workspace-file>')}`;
}

export function emptyLabMetrics(): AudioLabMetrics {
  return {
    integratedLufs: null,
    loudnessRangeLu: null,
    truePeakDbfs: null,
    maxVolumeDb: null,
    meanVolumeDb: null,
    clippingDetected: false,
    clippingCount: 0,
    leadingSilenceSec: 0,
    trailingSilenceSec: 0,
    silenceSegmentsCount: 0,
  };
}
