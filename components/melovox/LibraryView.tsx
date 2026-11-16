'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Copy,
  Download,
  FlaskConical,
  Music2,
  Play,
  Search,
  Sliders,
} from 'lucide-react';
import { detectLibraryIssues, formatBytes, formatDuration } from '@/lib/audio/smart-engine';
import { Translations } from '@/lib/audio/i18n';
import { AudioTrackAnalysis, Locale, QueueItem } from '@/lib/audio/types';

interface LibraryViewProps {
  locale: Locale;
  t: Translations;
  queue: QueueItem[];
  onInspectLab: (itemId: string) => void;
  onEditStudio: (itemId: string) => void;
  onGoToConvert: () => void;
}

type LibraryFilter = 'all' | 'lossless' | 'duplicates' | 'missing_meta';

export default function LibraryView({
  locale,
  t,
  queue,
  onInspectLab,
  onEditStudio,
  onGoToConvert,
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const analyzedTracks = useMemo(() => {
    const list: { item: QueueItem; analysis: AudioTrackAnalysis }[] = [];
    for (const item of queue) {
      if (item.analysis) {
        list.push({ item, analysis: item.analysis });
      }
    }
    return list;
  }, [queue]);

  const issues = useMemo(
    () => detectLibraryIssues(analyzedTracks.map((x) => x.analysis)),
    [analyzedTracks]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return analyzedTracks.filter(({ item, analysis }) => {
      const meta = item.editedMetadata ?? analysis.metadata;
      if (filter === 'lossless' && !analysis.isLosslessSource) return false;
      if (filter === 'duplicates' && !issues.duplicateIds.has(analysis.fileId)) return false;
      if (filter === 'missing_meta' && !issues.missingMetadataIds.has(analysis.fileId)) return false;

      if (!q) return true;
      return (
        item.fileName.toLowerCase().includes(q) ||
        meta.title.toLowerCase().includes(q) ||
        meta.artist.toLowerCase().includes(q) ||
        meta.album.toLowerCase().includes(q) ||
        meta.genre.toLowerCase().includes(q)
      );
    });
  }, [analyzedTracks, filter, issues, searchQuery]);

  const activePlaybackItem =
    analyzedTracks.find((x) => x.item.id === playingTrackId)?.item ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {locale === 'fr' ? 'Bibliothèque & Organisation audio' : 'Audio Library & Organization'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {locale === 'fr'
              ? 'Détection automatique des doublons, métadonnées manquantes et pré-écoute directe.'
              : 'Automatic duplicate detection, missing metadata inspection, and built-in playback.'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          <span>
            {analyzedTracks.length} {locale === 'fr' ? 'pistes' : 'tracks'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {issues.duplicateIds.size} {locale === 'fr' ? 'doublons' : 'duplicates'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {issues.missingMetadataIds.size} {locale === 'fr' ? 'tags incomplets' : 'incomplete tags'}
          </span>
        </div>
      </div>

      {/* Search + Segmented Filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label={locale === 'fr' ? 'Rechercher dans la bibliothèque' : 'Search audio library'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === 'fr'
                ? 'Rechercher par titre, artiste, album ou fichier…'
                : 'Search by title, artist, album, or filename…'
            }
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121620] py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 p-1">
          {(
            [
              ['all', locale === 'fr' ? 'Tous' : 'All'],
              ['lossless', locale === 'fr' ? 'Sans perte' : 'Lossless'],
              ['duplicates', locale === 'fr' ? 'Doublons' : 'Duplicates'],
              ['missing_meta', locale === 'fr' ? 'Tags manquants' : 'Missing tags'],
            ] as [LibraryFilter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === id
                  ? 'bg-white dark:bg-[#121620] text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Real HTML5 audio preview player */}
      {activePlaybackItem && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-[#121620] px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {activePlaybackItem.outputFileName || activePlaybackItem.fileName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activePlaybackItem.outputFileId
                ? locale === 'fr'
                  ? 'Lecture du fichier converti'
                  : 'Playing converted output'
                : locale === 'fr'
                  ? 'Lecture du fichier source'
                  : 'Playing source audio'}
            </p>
          </div>
          <audio
            controls
            autoPlay
            src={`/api/audio/file/${activePlaybackItem.outputFileId ?? activePlaybackItem.fileId}`}
            className="h-9 w-full sm:w-80"
          />
        </div>
      )}

      {/* Library Table */}
      {analyzedTracks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-10 text-center">
          <Music2 className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {locale === 'fr' ? 'Votre bibliothèque est vide' : 'Your audio library is empty'}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {locale === 'fr'
              ? 'Importez vos pistes depuis l’onglet Convertir pour détecter doublons et tags incomplets.'
              : 'Import audio files from Convert to detect duplicates and missing metadata.'}
          </p>
          <button
            type="button"
            onClick={onGoToConvert}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t.nav.convert}
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">{locale === 'fr' ? 'Fichier & Métadonnées' : 'Track & Tags'}</th>
                  <th className="px-4 py-3">{locale === 'fr' ? 'Format' : 'Format'}</th>
                  <th className="px-4 py-3 text-right">{locale === 'fr' ? 'Durée' : 'Duration'}</th>
                  <th className="px-4 py-3 text-right">{locale === 'fr' ? 'Taille' : 'Size'}</th>
                  <th className="px-4 py-3">{locale === 'fr' ? 'Diagnostic' : 'Health'}</th>
                  <th className="px-4 py-3 text-right">{locale === 'fr' ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map(({ item, analysis }) => {
                  const meta = item.editedMetadata ?? analysis.metadata;
                  const isDup = issues.duplicateIds.has(analysis.fileId);
                  const isMissingMeta = issues.missingMetadataIds.has(analysis.fileId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 max-w-[280px]">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {meta.title || item.fileName}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {[meta.artist || (locale === 'fr' ? 'Artiste inconnu' : 'Unknown artist'), meta.album]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {analysis.detectedFormat} · {(analysis.sampleRateHz / 1000).toFixed(1)}k
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatDuration(analysis.durationSec)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatBytes(analysis.sizeBytes)}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {isDup ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <Copy className="h-3.5 w-3.5" />
                            {locale === 'fr' ? 'Doublon probable' : 'Likely duplicate'}
                          </span>
                        ) : isMissingMeta ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {locale === 'fr' ? 'Tags incomplets' : 'Missing tags'}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {locale === 'fr' ? 'Indexé' : 'Healthy'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label={`${locale === 'fr' ? 'Écouter' : 'Play'} ${item.fileName}`}
                            onClick={() => setPlayingTrackId(item.id)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${locale === 'fr' ? 'Éditer tags de' : 'Edit tags for'} ${item.fileName}`}
                            onClick={() => onEditStudio(item.id)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${locale === 'fr' ? 'Inspecter dans Lab' : 'Inspect in Lab'} ${item.fileName}`}
                            onClick={() => onInspectLab(item.id)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                          </button>
                          {item.outputFileId && (
                            <a
                              href={`/api/audio/file/${item.outputFileId}?download=1`}
                              aria-label={`${t.actions.download} ${item.outputFileName}`}
                              className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
