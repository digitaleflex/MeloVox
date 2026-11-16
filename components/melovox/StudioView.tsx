'use client';

import React, { useState } from 'react';
import {
  Combine,
  Disc3,
  Info,
  RotateCcw,
  Scissors,
  Sliders,
  Tag,
} from 'lucide-react';
import { DEFAULT_STUDIO_OPTIONS, hasActiveStudioProcessing } from '@/lib/audio/smart-engine';
import { Translations } from '@/lib/audio/i18n';
import {
  AudioMetadata,
  ConversionSettings,
  Locale,
  QueueItem,
  StudioOptions,
} from '@/lib/audio/types';

interface StudioViewProps {
  locale: Locale;
  t: Translations;
  studio: StudioOptions;
  onChangeStudio: (next: StudioOptions) => void;
  settings: ConversionSettings;
  queue: QueueItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onUpdateMetadata: (itemId: string, metadata: AudioMetadata) => void;
  onMergeTracks: (fileIds: string[], outputName: string) => Promise<void>;
  isMerging: boolean;
}

export default function StudioView({
  locale,
  t,
  studio,
  onChangeStudio,
  queue,
  selectedItemId,
  onSelectItem,
  onUpdateMetadata,
  onMergeTracks,
  isMerging,
}: StudioViewProps) {
  const activeItem = queue.find((q) => q.id === selectedItemId) ?? queue[0] ?? null;
  const activeMeta: AudioMetadata = activeItem?.editedMetadata ??
    activeItem?.analysis?.metadata ?? {
      title: '',
      artist: '',
      album: '',
      year: '',
      genre: '',
      track: '',
      composer: '',
      comment: '',
      albumArtist: '',
      hasCoverArt: false,
    };

  const [mergeName, setMergeName] = useState('MeloVox_Compilation');
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);

  const dspActive = hasActiveStudioProcessing(studio);

  const toggleMergeId = (fileId: string) => {
    setMergeSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleMetaField = (field: keyof AudioMetadata, value: string) => {
    if (!activeItem) return;
    onUpdateMetadata(activeItem.id, {
      ...activeMeta,
      [field]: value,
    });
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItem) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateMetadata(activeItem.id, {
          ...activeMeta,
          hasCoverArt: true,
          coverArtDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t.studio.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.studio.subtitle}</p>
        </div>
        {dspActive && (
          <button
            type="button"
            onClick={() => onChangeStudio(DEFAULT_STUDIO_OPTIONS)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121620] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {locale === 'fr' ? 'Désactiver les traitements DSP' : 'Reset DSP filters'}
          </button>
        )}
      </div>

      {/* Non-destructive guarantee banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/20 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {t.studio.nonDestructiveNote}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trim, Silence & Fades */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Scissors className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.studio.trimSection}
            </h3>
          </div>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {locale === 'fr' ? 'Découper la piste (Audio Trimmer)' : 'Trim audio range'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'fr'
                  ? 'Extrait une plage temporelle précise sans modifier l’original.'
                  : 'Extract a precise start/end segment non-destructively.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={studio.trimEnabled}
              onChange={(e) => onChangeStudio({ ...studio, trimEnabled: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
          </label>

          {studio.trimEnabled && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label
                  htmlFor="trim-start"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {locale === 'fr' ? 'Début (secondes)' : 'Start (seconds)'}
                </label>
                <input
                  id="trim-start"
                  type="number"
                  min={0}
                  step={0.5}
                  value={studio.trimStartSec}
                  onChange={(e) =>
                    onChangeStudio({ ...studio, trimStartSec: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-1.5 font-mono text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="trim-end"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {locale === 'fr' ? 'Fin (secondes, optionnel)' : 'End (seconds, optional)'}
                </label>
                <input
                  id="trim-end"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Auto"
                  value={studio.trimEndSec ?? ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    onChangeStudio({ ...studio, trimEndSec: val === '' ? null : Math.max(0, Number(val)) });
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-1.5 font-mono text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <label className="flex items-center justify-between gap-4 cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {locale === 'fr' ? 'Supprimer les silences (Silence Remover)' : 'Remove leading/trailing silence'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'fr'
                  ? `Seuil automatique à ${studio.silenceThresholdDb} dB.`
                  : `Automatic threshold at ${studio.silenceThresholdDb} dB.`}
              </p>
            </div>
            <input
              type="checkbox"
              checked={studio.removeSilence}
              onChange={(e) => onChangeStudio({ ...studio, removeSilence: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label
                htmlFor="fade-in"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Fade In (s)
              </label>
              <input
                id="fade-in"
                type="number"
                min={0}
                max={15}
                step={0.5}
                value={studio.fadeInSec}
                onChange={(e) =>
                  onChangeStudio({ ...studio, fadeInSec: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-1.5 font-mono text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="fade-out"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Fade Out (s)
              </label>
              <input
                id="fade-out"
                type="number"
                min={0}
                max={15}
                step={0.5}
                value={studio.fadeOutSec}
                onChange={(e) =>
                  onChangeStudio({ ...studio, fadeOutSec: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-1.5 font-mono text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </section>

        {/* Normalization, Volume & Speed */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.studio.dynamicsSection}
            </h3>
          </div>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {locale === 'fr' ? 'Normalisation EBU R128 (Volume Normalizer)' : 'EBU R128 Loudness Normalization'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'fr'
                  ? 'Harmonise le niveau sonore avec limiteur True Peak -1.5 dBFS.'
                  : 'Harmonizes loudness with -1.5 dBFS true-peak protection.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={studio.normalizeLoudness}
              onChange={(e) => onChangeStudio({ ...studio, normalizeLoudness: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
          </label>

          {studio.normalizeLoudness && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>{locale === 'fr' ? 'Cible loudness' : 'Target loudness'}</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {studio.targetLufs} LUFS
                </span>
              </div>
              <input
                aria-label="Target LUFS"
                type="range"
                min={-23}
                max={-10}
                step={1}
                value={studio.targetLufs}
                onChange={(e) => onChangeStudio({ ...studio, targetLufs: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>{locale === 'fr' ? 'Gain de volume manuel' : 'Manual output gain'}</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {studio.volumeGainDb > 0 ? `+${studio.volumeGainDb}` : studio.volumeGainDb} dB
              </span>
            </div>
            <input
              aria-label="Volume gain dB"
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={studio.volumeGainDb}
              onChange={(e) => onChangeStudio({ ...studio, volumeGainDb: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>{locale === 'fr' ? 'Contrôle de vitesse (Speed Control)' : 'Playback speed'}</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {studio.speedFactor.toFixed(2)}x
              </span>
            </div>
            <input
              aria-label="Speed factor"
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={studio.speedFactor}
              onChange={(e) => onChangeStudio({ ...studio, speedFactor: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <label className="flex items-center justify-between gap-4 cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {locale === 'fr' ? 'Conserver les métadonnées (ID3 / Vorbis)' : 'Preserve metadata tags'}
            </span>
            <input
              type="checkbox"
              checked={studio.preserveMetadata}
              onChange={(e) => onChangeStudio({ ...studio, preserveMetadata: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
          </label>
        </section>
      </div>

      {/* Metadata & Cover Manager */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.studio.metadataSection}
            </h3>
          </div>
          {queue.length > 0 && (
            <select
              aria-label={locale === 'fr' ? 'Sélectionner piste à éditer' : 'Select track to edit'}
              value={activeItem?.id ?? ''}
              onChange={(e) => onSelectItem(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            >
              {queue.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.fileName}
                </option>
              ))}
            </select>
          )}
        </div>

        {!activeItem ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {locale === 'fr'
              ? 'Ajoutez une piste dans Convertir pour éditer ses tags ID3 et sa pochette.'
              : 'Add a track in Convert to edit its ID3 tags and album cover.'}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[140px_1fr]">
            <div className="space-y-2">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                {activeMeta.coverArtDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeMeta.coverArtDataUrl}
                    alt={activeMeta.album || activeItem.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Disc3 className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                )}
              </div>
              <label className="inline-flex w-32 cursor-pointer items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                {locale === 'fr' ? 'Changer pochette' : 'Set cover art'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['title', locale === 'fr' ? 'Titre' : 'Title'],
                  ['artist', locale === 'fr' ? 'Artiste' : 'Artist'],
                  ['album', 'Album'],
                  ['albumArtist', locale === 'fr' ? 'Artiste de l’album' : 'Album artist'],
                  ['year', locale === 'fr' ? 'Année' : 'Year'],
                  ['genre', 'Genre'],
                  ['track', locale === 'fr' ? 'N° de piste' : 'Track #'],
                  ['composer', locale === 'fr' ? 'Compositeur' : 'Composer'],
                  ['comment', locale === 'fr' ? 'Commentaire' : 'Comment'],
                ] as [keyof AudioMetadata, string][]
              ).map(([field, label]) => (
                <div key={field}>
                  <label
                    htmlFor={`meta-${field}`}
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    {label}
                  </label>
                  <input
                    id={`meta-${field}`}
                    type="text"
                    value={String(activeMeta[field] ?? '')}
                    onChange={(e) => handleMetaField(field, e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Audio Merger */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Combine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.studio.mergeSection}
          </h3>
        </div>

        {queue.length < 2 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {locale === 'fr'
              ? 'Importez au moins 2 fichiers audio pour les fusionner en une seule piste.'
              : 'Import at least 2 audio tracks to merge them into a single file.'}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {queue.map((item) => {
                const checked = mergeSelectedIds.includes(item.fileId);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/25'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMergeId(item.fileId)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="truncate text-sm text-slate-800 dark:text-slate-200">
                      {item.fileName}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                aria-label={locale === 'fr' ? 'Nom du fichier fusionné' : 'Merged output filename'}
                value={mergeName}
                onChange={(e) => setMergeName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                disabled={mergeSelectedIds.length < 2 || isMerging}
                onClick={() => onMergeTracks(mergeSelectedIds, mergeName)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Combine className="h-4 w-4" />
                {isMerging
                  ? locale === 'fr'
                    ? 'Fusion en cours…'
                    : 'Merging…'
                  : `${t.actions.mergeSelected} (${mergeSelectedIds.length})`}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
