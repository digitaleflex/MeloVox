import { Locale } from './types';

export interface Translations {
  brandSubtitle: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPromise: string;
  nav: {
    convert: string;
    lab: string;
    studio: string;
    recipes: string;
    library: string;
    history: string;
  };
  actions: {
    startConversion: string;
    converting: string;
    pause: string;
    resume: string;
    cancel: string;
    loadDemoTracks: string;
    selectFiles: string;
    importFolder: string;
    importUrl: string;
    clearQueue: string;
    download: string;
    retry: string;
    remove: string;
    details: string;
    applyRecipe: string;
    saveRecipe: string;
    clearHistory: string;
    mergeSelected: string;
  };
  goals: {
    title: string;
    manual: string;
    music: string;
    voice: string;
    podcast: string;
    share: string;
    archive: string;
    universal: string;
  };
  status: {
    pending: string;
    analyzing: string;
    ready: string;
    converting: string;
    completed: string;
    failed: string;
    cancelled: string;
  };
  settings: {
    simpleMode: string;
    advancedMode: string;
    outputFormat: string;
    qualityProfile: string;
    encodingMode: string;
    bitrate: string;
    vbrQuality: string;
    sampleRate: string;
    channels: string;
    namingPattern: string;
    existingPolicy: string;
    concurrency: string;
  };
  lab: {
    title: string;
    subtitle: string;
    sourceCol: string;
    resultCol: string;
    featureCol: string;
    emptyTitle: string;
    emptyDesc: string;
    streamCopyTitle: string;
    integrityOk: string;
    metadataOk: string;
  };
  studio: {
    title: string;
    subtitle: string;
    nonDestructiveNote: string;
    trimSection: string;
    dynamicsSection: string;
    metadataSection: string;
    mergeSection: string;
  };
  diagnostics: {
    title: string;
    privacyTitle: string;
    privacyBody: string;
  };
}

export const TRANSLATIONS: Record<Locale, Translations> = {
  fr: {
    brandSubtitle: 'AUDIO WORKSPACE · by E-FLEX',
    heroTitle: 'Tous vos formats. Un son maîtrisé.',
    heroSubtitle: 'Convertir · Optimiser · Organiser · Vérifier — localement avec FFmpeg & LAME.',
    heroPromise: 'Aucun transfert cloud tiers. Fichiers sources intacts. Smart Stream Copy intégré.',
    nav: {
      convert: 'Convertir',
      lab: 'Audio Lab',
      studio: 'Studio',
      recipes: 'Recettes',
      library: 'Bibliothèque',
      history: 'Historique',
    },
    actions: {
      startConversion: 'Lancer la conversion',
      converting: 'Conversion en cours…',
      pause: 'Pause',
      resume: 'Reprendre',
      cancel: 'Annuler',
      loadDemoTracks: 'Charger des pistes audio de test',
      selectFiles: 'Sélectionner des fichiers',
      importFolder: 'Importer un dossier',
      importUrl: 'Importer URL',
      clearQueue: 'Vider la file',
      download: 'Télécharger',
      retry: 'Relancer',
      remove: 'Supprimer',
      details: 'Inspecter',
      applyRecipe: 'Appliquer',
      saveRecipe: 'Enregistrer la recette',
      clearHistory: 'Effacer l’historique',
      mergeSelected: 'Fusionner la sélection',
    },
    goals: {
      title: 'Assistant intelligent — Votre objectif',
      manual: 'Manuel',
      music: 'Musique',
      voice: 'Voix',
      podcast: 'Podcast',
      share: 'Partage',
      archive: 'Archivage',
      universal: 'Universel',
    },
    status: {
      pending: 'En attente',
      analyzing: 'Analyse',
      ready: 'Prêt',
      converting: 'En cours',
      completed: 'Terminé',
      failed: 'Échec',
      cancelled: 'Annulé',
    },
    settings: {
      simpleMode: 'Mode simple',
      advancedMode: 'Mode avancé',
      outputFormat: 'Format de sortie',
      qualityProfile: 'Profil de qualité',
      encodingMode: 'Mode d’encodage',
      bitrate: 'Débit audio',
      vbrQuality: 'Qualité VBR (LAME)',
      sampleRate: 'Fréquence d’échantillonnage',
      channels: 'Canaux audio',
      namingPattern: 'Convention de nommage',
      existingPolicy: 'En cas de doublon',
      concurrency: 'Tâches simultanées',
    },
    lab: {
      title: 'Laboratoire d’Intelligence Audio',
      subtitle: 'Comparaison technique Source vs Résultat : loudness LUFS, saturation, silences et intégrité.',
      sourceCol: 'Source',
      resultCol: 'Résultat',
      featureCol: 'Caractéristique',
      emptyTitle: 'Aucune piste analysée pour le moment',
      emptyDesc: 'Importez un fichier audio ou chargez les pistes de démonstration FFmpeg pour inspecter le signal.',
      streamCopyTitle: 'Smart Stream Copy actif',
      integrityOk: 'Flux vérifié par FFprobe',
      metadataOk: 'Métadonnées conservées',
    },
    studio: {
      title: 'Studio de traitement non destructif',
      subtitle: 'Découpage, suppression des silences, normalisation EBU R128, fondus, vitesse et éditeur de tags ID3.',
      nonDestructiveNote: 'Ces traitements sont optionnels, désactivés par défaut, et ne modifient jamais le fichier original.',
      trimSection: 'Découpage & Transitions',
      dynamicsSection: 'Dynamique, Normalisation & Canaux',
      metadataSection: 'Éditeur de métadonnées & Pochette',
      mergeSection: 'Fusionner plusieurs pistes (Audio Merger)',
    },
    diagnostics: {
      title: 'Diagnostics moteur & Confidentialité',
      privacyTitle: 'Traitement local & Confidentialité',
      privacyBody:
        'MeloVox traite vos fichiers audio localement sur le moteur FFmpeg/FFprobe sans aucun compte ni envoi vers des services tiers. Les fichiers sources originaux ne sont jamais modifiés.',
    },
  },
  en: {
    brandSubtitle: 'AUDIO WORKSPACE · by E-FLEX',
    heroTitle: 'Every format. Mastered sound.',
    heroSubtitle: 'Convert · Optimize · Organize · Verify — locally powered by FFmpeg & LAME.',
    heroPromise: 'Zero third-party cloud uploads. Source files untouched. Smart Stream Copy built in.',
    nav: {
      convert: 'Convert',
      lab: 'Audio Lab',
      studio: 'Studio',
      recipes: 'Recipes',
      library: 'Library',
      history: 'History',
    },
    actions: {
      startConversion: 'Start Conversion',
      converting: 'Converting…',
      pause: 'Pause',
      resume: 'Resume',
      cancel: 'Cancel',
      loadDemoTracks: 'Load Test Audio Tracks',
      selectFiles: 'Select Files',
      importFolder: 'Import Folder',
      importUrl: 'Import URL',
      clearQueue: 'Clear Queue',
      download: 'Download',
      retry: 'Retry',
      remove: 'Remove',
      details: 'Inspect',
      applyRecipe: 'Apply',
      saveRecipe: 'Save Recipe',
      clearHistory: 'Clear History',
      mergeSelected: 'Merge Selected',
    },
    goals: {
      title: 'Smart Assistant — Target Goal',
      manual: 'Manual',
      music: 'Music',
      voice: 'Voice',
      podcast: 'Podcast',
      share: 'Share',
      archive: 'Archive',
      universal: 'Universal',
    },
    status: {
      pending: 'Pending',
      analyzing: 'Analyzing',
      ready: 'Ready',
      converting: 'Converting',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    },
    settings: {
      simpleMode: 'Simple mode',
      advancedMode: 'Advanced mode',
      outputFormat: 'Output format',
      qualityProfile: 'Quality profile',
      encodingMode: 'Encoding mode',
      bitrate: 'Audio bitrate',
      vbrQuality: 'VBR quality (LAME)',
      sampleRate: 'Sample rate',
      channels: 'Audio channels',
      namingPattern: 'Naming pattern',
      existingPolicy: 'On existing file',
      concurrency: 'Concurrent jobs',
    },
    lab: {
      title: 'Audio Intelligence Lab',
      subtitle: 'Source vs Output diagnostic report: LUFS loudness, clipping, silence detection & stream integrity.',
      sourceCol: 'Source',
      resultCol: 'Result',
      featureCol: 'Characteristic',
      emptyTitle: 'No analyzed tracks yet',
      emptyDesc: 'Import an audio file or load real FFmpeg test tracks to inspect signal telemetry.',
      streamCopyTitle: 'Smart Stream Copy active',
      integrityOk: 'Verified with FFprobe',
      metadataOk: 'Metadata preserved',
    },
    studio: {
      title: 'Non-Destructive Audio Studio',
      subtitle: 'Trimming, silence removal, EBU R128 loudness normalization, fades, speed control & ID3 tag editor.',
      nonDestructiveNote: 'All processing is optional, off by default, and never alters the original source file.',
      trimSection: 'Trim & Fades',
      dynamicsSection: 'Dynamics, Normalization & Channels',
      metadataSection: 'Metadata & Cover Art Editor',
      mergeSection: 'Audio Merger',
    },
    diagnostics: {
      title: 'Engine Diagnostics & Privacy',
      privacyTitle: 'Local Processing & Privacy',
      privacyBody:
        'MeloVox processes audio locally through FFmpeg/FFprobe without mandatory accounts or external cloud services. Original source files are never overwritten.',
    },
  },
};
