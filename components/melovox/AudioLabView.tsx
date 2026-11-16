'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CopyCheck,
  FileAudio,
  Info,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import {
  evaluateConversionWarnings,
  evaluateSmartStreamCopy,
  formatBytes,
  formatDuration,
} from '@/lib/audio/smart-engine';
import { Translations } from '@/lib/audio/i18n';
import {
  ConversionSettings,
  Locale,
  QueueItem,
  StudioOptions,
} from '@/lib/audio/types';

interface AudioLabViewProps {
  locale: Locale;
  t: Translations;
  queue: QueueItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  settings: ConversionSettings;
  studio: StudioOptions;
  onGoToConvert: () => void;
}

export default function AudioLabView({
  locale,
  t,
  queue,
  selectedItemId,
  onSelectItem,
  settings,
  studio,
  onGoToConvert,
}: AudioLabViewProps) {
  const activeItem =
    queue.find((q) => q.id === selectedItemId) ??
    queue.find((q) => q.report) ??
    queue[0] ??
    null;

  if (!activeItem || !activeItem.analysis) {
    return (
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
          <FileAudio className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t.lab.emptyTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {t.lab.emptyDesc}
        </p>
        <button
          type="button"
          onClick={onGoToConvert}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {t.nav.convert}
        </button>
      </section>
    );
  }

  const analysis = activeItem.analysis;
  const report = activeItem.report;
  const streamDecision = evaluateSmartStreamCopy(analysis, settings, studio);
  const warnings = report?.warnings ?? evaluateConversionWarnings(analysis, settings);

  const srcLufs =
    analysis.lab.integratedLufs !== null ? `${analysis.lab.integratedLufs.toFixed(1)} LUFS` : '—';
  const resLufs =
    report?.result.lab.integratedLufs !== null && report?.result.lab.integratedLufs !== undefined
      ? `${report.result.lab.integratedLufs.toFixed(1)} LUFS`
      : '—';

  const srcPeak =
    analysis.lab.truePeakDbfs !== null
      ? `${analysis.lab.truePeakDbfs.toFixed(1)} dBFS`
      : analysis.lab.maxVolumeDb !== null
        ? `${analysis.lab.maxVolumeDb.toFixed(1)} dB`
        : '—';
  const resPeak =
    report?.result.lab.truePeakDbfs !== null && report?.result.lab.truePeakDbfs !== undefined
      ? `${report.result.lab.truePeakDbfs.toFixed(1)} dBFS`
      : report?.result.lab.maxVolumeDb !== null && report?.result.lab.maxVolumeDb !== undefined
        ? `${report.result.lab.maxVolumeDb.toFixed(1)} dB`
        : '—';

  const comparisonRows = [
    {
      label: locale === 'fr' ? 'Format conteneur' : 'Container format',
      source: analysis.detectedFormat,
      result: report ? report.result.format : settings.outputFormat.toUpperCase(),
    },
    {
      label: locale === 'fr' ? 'Codec audio' : 'Audio codec',
      source: analysis.codec.toUpperCase(),
      result: report ? report.result.codec : streamDecision.eligible ? 'COPY' : settings.outputFormat.toUpperCase(),
    },
    {
      label: locale === 'fr' ? 'Durée' : 'Duration',
      source: formatDuration(analysis.durationSec),
      result: report ? formatDuration(report.result.durationSec) : '—',
    },
    {
      label: locale === 'fr' ? 'Fréquence d’échantillonnage' : 'Sample rate',
      source: `${(analysis.sampleRateHz / 1000).toFixed(1)} kHz`,
      result: report ? `${(report.result.sampleRateHz / 1000).toFixed(1)} kHz` : '—',
    },
    {
      label: locale === 'fr' ? 'Canaux' : 'Channels',
      source: analysis.channels === 1 ? 'Mono (1)' : `Stéréo (${analysis.channels})`,
      result: report
        ? report.result.channels === 1
          ? 'Mono (1)'
          : `Stéréo (${report.result.channels})`
        : '—',
    },
    {
      label: locale === 'fr' ? 'Débit' : 'Bitrate',
      source: analysis.isLosslessSource
        ? `${locale === 'fr' ? 'Sans perte' : 'Lossless'} (${Math.round(analysis.bitrateBps / 1000)} kbps)`
        : `${Math.round(analysis.bitrateBps / 1000)} kbps`,
      result: report ? report.result.bitrateLabel : '—',
    },
    {
      label: locale === 'fr' ? 'Taille du fichier' : 'File size',
      source: formatBytes(analysis.sizeBytes),
      result: report
        ? `${formatBytes(report.result.sizeBytes)} (${report.sizeDeltaPercent > 0 ? '+' : ''}${report.sizeDeltaPercent}%)`
        : '—',
    },
    {
      label: 'Loudness (EBU R128)',
      source: srcLufs,
      result: resLufs,
    },
    {
      label: locale === 'fr' ? 'Pic maximal' : 'True Peak',
      source: srcPeak,
      result: resPeak,
    },
    {
      label: locale === 'fr' ? 'Saturation (Clipping)' : 'Clipping',
      source: analysis.lab.clippingDetected
        ? locale === 'fr'
          ? 'Détectée'
          : 'Detected'
        : locale === 'fr'
          ? 'Aucune'
          : 'None',
      result: report
        ? report.result.lab.clippingDetected
          ? locale === 'fr'
            ? 'Détectée'
            : 'Detected'
          : locale === 'fr'
            ? 'Aucune'
            : 'None'
        : '—',
    },
    {
      label: locale === 'fr' ? 'Silences (début / fin)' : 'Silences (lead / trail)',
      source: `${analysis.lab.leadingSilenceSec}s / ${analysis.lab.trailingSilenceSec}s`,
      result: report
        ? `${report.result.lab.leadingSilenceSec}s / ${report.result.lab.trailingSilenceSec}s`
        : '—',
    },
    {
      label: locale === 'fr' ? 'Métadonnées' : 'Metadata tags',
      source: `${
        [analysis.metadata.title, analysis.metadata.artist, analysis.metadata.album].filter(Boolean)
          .length
      } ${locale === 'fr' ? 'champs clés' : 'key tags'}`,
      result: report
        ? report.metadataPreserved
          ? t.lab.metadataOk
          : locale === 'fr'
            ? 'Non incluses'
            : 'Not included'
        : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t.lab.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.lab.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="lab-track-select" className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {locale === 'fr' ? 'Piste inspectée :' : 'Inspected track:'}
          </label>
          <select
            id="lab-track-select"
            value={activeItem.id}
            onChange={(e) => onSelectItem(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121620] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {queue.map((q) => (
              <option key={q.id} value={q.id}>
                {q.fileName} {q.report ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Diagnostic banners */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={`rounded-xl border p-4 ${
            (report?.streamCopied ?? streamDecision.eligible)
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]'
          }`}
        >
          <div className="flex items-start gap-3">
            <CopyCheck
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                (report?.streamCopied ?? streamDecision.eligible)
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {(report?.streamCopied ?? streamDecision.eligible)
                  ? t.lab.streamCopyTitle
                  : locale === 'fr'
                    ? 'Mode de traitement : Réencodage maîtrisé'
                    : 'Processing mode: Controlled Re-encode'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {locale === 'fr' ? streamDecision.reasonFr : streamDecision.reasonEn}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-4">
          <div className="flex items-start gap-3">
            {report?.integrityVerified ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {report
                  ? report.integrityVerified
                    ? t.lab.integrityOk
                    : locale === 'fr'
                      ? 'Vérification incomplète'
                      : 'Verification incomplete'
                  : locale === 'fr'
                    ? 'Source analysée et prête pour conversion'
                    : 'Source probed and ready for conversion'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {report
                  ? locale === 'fr'
                    ? `Temps moteur : ${report.processingDurationMs} ms · Fichier source conservé intact.`
                    : `Engine time: ${report.processingDurationMs} ms · Original source preserved untouched.`
                  : locale === 'fr'
                    ? 'Lancez la conversion pour obtenir le tableau comparatif complet Avant / Après.'
                    : 'Run conversion to populate the complete Source vs Output comparison table.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit quality warnings */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          {warnings.map((w) => (
            <div
              key={w.code}
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                w.severity === 'warning'
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/25'
                  : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20'
              }`}
            >
              {w.severity === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {locale === 'fr' ? w.titleFr : w.titleEn}
                </p>
                <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                  {locale === 'fr' ? w.detailFr : w.detailEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparative Source vs Result Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {locale === 'fr' ? 'Rapport comparatif Source / Résultat' : 'Source vs Output Report'}
          </h3>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {activeItem.fileName}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="px-5 py-3">{t.lab.featureCol}</th>
                <th className="px-5 py-3">{t.lab.sourceCol}</th>
                <th className="px-5 py-3">{t.lab.resultCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {comparisonRows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                    {row.label}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                    {row.source}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {row.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FFmpeg Command transparency */}
      {report?.ffmpegCommandPreview && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Terminal className="h-4 w-4" />
            <span>{locale === 'fr' ? 'Commande FFmpeg exécutée' : 'Executed FFmpeg arguments'}</span>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 dark:bg-[#0B0E14] p-3 font-mono text-xs text-slate-800 dark:text-slate-200">
            {report.ffmpegCommandPreview}
          </pre>
        </div>
      )}
    </div>
  );
}
