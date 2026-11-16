'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  History,
  Lock,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { formatBytes } from '@/lib/audio/smart-engine';
import { Translations } from '@/lib/audio/i18n';
import {
  DiagnosticsSnapshot,
  HistoryEntry,
  Locale,
  TechnicalLogEntry,
} from '@/lib/audio/types';

interface HistoryAndDiagnosticsViewProps {
  locale: Locale;
  t: Translations;
  history: HistoryEntry[];
  logs: TechnicalLogEntry[];
  onClearHistory: () => void;
}

export default function HistoryAndDiagnosticsView({
  locale,
  t,
  history,
  logs,
  onClearHistory,
}: HistoryAndDiagnosticsViewProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);
  const [diagError, setDiagError] = useState<string | null>(null);

  const loadDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/diagnostics');
      if (!res.ok) throw new Error('Failed to load diagnostics');
      const data = (await res.json()) as DiagnosticsSnapshot;
      setDiagnostics(data);
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : 'Diagnostics unavailable');
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/diagnostics')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load diagnostics');
        return (await res.json()) as DiagnosticsSnapshot;
      })
      .then((data) => {
        if (active) {
          setDiagnostics(data);
          setDiagLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setDiagError(err instanceof Error ? err.message : 'Diagnostics unavailable');
          setDiagLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* History Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {locale === 'fr' ? 'Historique des conversions' : 'Conversion History'}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {locale === 'fr'
                ? 'Stocké localement dans votre navigateur. Aucune donnée n’est synchronisée vers un cloud.'
                : 'Stored locally in your browser. Zero cloud telemetry.'}
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121620] px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.actions.clearHistory}
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-8 text-center">
            <History className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {locale === 'fr'
                ? 'Aucune opération enregistrée pour le moment.'
                : 'No conversion history recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">{locale === 'fr' ? 'Date' : 'Timestamp'}</th>
                    <th className="px-4 py-3">{locale === 'fr' ? 'Fichier' : 'File'}</th>
                    <th className="px-4 py-3">{locale === 'fr' ? 'Format' : 'Format'}</th>
                    <th className="px-4 py-3">{locale === 'fr' ? 'Profil' : 'Profile'}</th>
                    <th className="px-4 py-3 text-right">{locale === 'fr' ? 'Taille' : 'Size'}</th>
                    <th className="px-4 py-3 text-right">{locale === 'fr' ? 'Durée' : 'Elapsed'}</th>
                    <th className="px-4 py-3">{locale === 'fr' ? 'Résultat' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 max-w-[220px] truncate font-medium text-slate-900 dark:text-slate-100">
                        {item.outputFileName || item.fileName}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {item.sourceFormat} → {item.outputFormat}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                        {item.qualityLabel}
                        {item.streamCopied ? ' · Smart Copy' : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {formatBytes(item.outputSizeBytes)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {item.durationMs} ms
                      </td>
                      <td className="px-4 py-2.5 text-xs font-medium">
                        {item.status === 'completed' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {t.status.completed}
                          </span>
                        ) : item.status === 'cancelled' ? (
                          <span className="text-slate-500">{t.status.cancelled}</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">{t.status.failed}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Engine Diagnostics & Technical Logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t.diagnostics.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => void loadDiagnostics()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-3 w-3" />
              {locale === 'fr' ? 'Actualiser' : 'Refresh'}
            </button>
          </div>

          {diagLoading ? (
            <p className="text-xs text-slate-500">
              {locale === 'fr' ? 'Interrogation FFmpeg/FFprobe…' : 'Querying FFmpeg/FFprobe…'}
            </p>
          ) : diagError || !diagnostics ? (
            <p className="text-xs text-red-600 dark:text-red-400">{diagError}</p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400">FFmpeg</p>
                <p className="font-mono text-slate-900 dark:text-slate-100 break-all">
                  {diagnostics.ffmpegVersion}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400">FFprobe</p>
                <p className="font-mono text-slate-900 dark:text-slate-100 break-all">
                  {diagnostics.ffprobeVersion}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {Object.entries(diagnostics.encoders).map(([enc, ok]) => (
                  <div key={enc} className="flex items-center gap-2 font-mono">
                    {ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className="text-slate-700 dark:text-slate-300">{enc}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-slate-500 dark:text-slate-400">
                {diagnostics.platform}/{diagnostics.arch} · {diagnostics.cpuCount} cores · Node{' '}
                {diagnostics.nodeVersion}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.diagnostics.privacyTitle}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {t.diagnostics.privacyBody}
          </p>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <h4 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {locale === 'fr' ? 'Journal technique récent' : 'Recent Technical Logs'}
            </h4>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'fr' ? 'Aucun événement enregistré.' : 'No operations logged yet.'}
              </p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                {logs.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-1"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      [{log.operation}] {log.fileName} — {log.message}
                    </span>
                    <span
                      className={`shrink-0 ${
                        log.result === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : log.result === 'cancelled'
                            ? 'text-slate-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {log.durationMs}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
