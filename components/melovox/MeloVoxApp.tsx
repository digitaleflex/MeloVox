'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRightLeft,
  BookMarked,
  FlaskConical,
  History,
  Library,
  Menu,
  Moon,
  Play,
  Sliders,
  Sun,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '@/lib/audio/i18n';
import {
  BUILT_IN_RECIPES,
  DEFAULT_CONVERSION_SETTINGS,
  DEFAULT_STUDIO_OPTIONS,
  formatOutputFilename,
  QUALITY_PRESETS,
  recommendConversionSettings,
} from '@/lib/audio/smart-engine';
import {
  AudioMetadata,
  AudioTrackAnalysis,
  ConversionComparisonReport,
  ConversionGoal,
  ConversionSettings,
  HistoryEntry,
  Locale,
  QueueItem,
  Recipe,
  StudioOptions,
  TechnicalLogEntry,
  ThemeMode,
  WorkspaceTab,
} from '@/lib/audio/types';
import AudioLabView from './AudioLabView';
import ConvertWorkspace from './ConvertWorkspace';
import HistoryAndDiagnosticsView from './HistoryAndDiagnosticsView';
import LibraryView from './LibraryView';
import RecipesView from './RecipesView';
import StudioView from './StudioView';

const HISTORY_STORAGE_KEY = 'melovox_history_v1';
const RECIPES_STORAGE_KEY = 'melovox_custom_recipes_v1';
const PREFS_STORAGE_KEY = 'melovox_prefs_v1';

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function MeloVoxApp() {
  const [locale, setLocale] = useState<Locale>('fr');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('convert');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_CONVERSION_SETTINGS);
  const [studio, setStudio] = useState<StudioOptions>(DEFAULT_STUDIO_OPTIONS);
  const [activeGoal, setActiveGoal] = useState<ConversionGoal>('manual');

  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [logs, setLogs] = useState<TechnicalLogEntry[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const queueRef = useRef<QueueItem[]>(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const t = TRANSLATIONS[locale];

  // Hydrate persisted preferences, history, and custom recipes
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const prefsRaw = localStorage.getItem(PREFS_STORAGE_KEY);
        if (prefsRaw) {
          const prefs = JSON.parse(prefsRaw) as { locale?: Locale; theme?: ThemeMode };
          if (prefs.locale === 'fr' || prefs.locale === 'en') setLocale(prefs.locale);
          if (prefs.theme === 'dark' || prefs.theme === 'light') setTheme(prefs.theme);
        }

        const histRaw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (histRaw) setHistory(JSON.parse(histRaw) as HistoryEntry[]);

        const recRaw = localStorage.getItem(RECIPES_STORAGE_KEY);
        if (recRaw) setCustomRecipes(JSON.parse(recRaw) as Recipe[]);
      } catch {
        // Ignore corrupted localStorage
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ locale, theme }));
    } catch {
      // Ignore storage quota
    }
  }, [locale, theme]);

  // Persist history & custom recipes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
    } catch {
      // Ignore
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(customRecipes));
    } catch {
      // Ignore
    }
  }, [customRecipes]);

  // Elapsed timer during batch conversion
  useEffect(() => {
    if (!isConverting) return;
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setElapsedSec((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isConverting]);

  const appendLog = useCallback((entry: Omit<TechnicalLogEntry, 'id' | 'timestamp'>) => {
    setLogs((prev) => [
      {
        id: makeId('log'),
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const addTracksToQueue = useCallback((analyses: AudioTrackAnalysis[]) => {
    setQueue((prev) => {
      const existingFileIds = new Set(prev.map((q) => q.fileId));
      const newItems: QueueItem[] = [];
      for (const a of analyses) {
        if (existingFileIds.has(a.fileId)) continue;
        newItems.push({
          id: makeId('job'),
          fileId: a.fileId,
          fileName: a.fileName,
          selected: true,
          priority: 1,
          status: 'ready',
          progress: 0,
          analysis: a,
        });
      }
      return [...prev, ...newItems];
    });
    if (analyses.length > 0) {
      setSelectedItemId((prev) => prev ?? null);
    }
  }, []);

  const handleLoadDemoTracks = useCallback(async () => {
    setIsImporting(true);
    setImportError(null);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/samples', { method: 'POST' });
      const data = (await res.json()) as { tracks?: AudioTrackAnalysis[]; error?: string };
      if (!res.ok || !data.tracks) {
        throw new Error(data.error || 'Échec du chargement des pistes de démonstration.');
      }
      addTracksToQueue(data.tracks);
      appendLog({
        operation: 'analyze',
        fileName: `${data.tracks.length} pistes test FFmpeg`,
        result: 'success',
        durationMs: Date.now() - t0,
        message: 'Pistes WAV/FLAC/MP3 analysées avec FFprobe et EBU R128.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur import.';
      setImportError(msg);
      appendLog({
        operation: 'analyze',
        fileName: 'Demo suite',
        result: 'error',
        durationMs: Date.now() - t0,
        message: msg,
      });
    } finally {
      setIsImporting(false);
    }
  }, [addTracksToQueue, appendLog]);

  // Support ?autostart=1 for automated quick demo load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      const timer = setTimeout(() => {
        void handleLoadDemoTracks();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [handleLoadDemoTracks]);

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsImporting(true);
    setImportError(null);

    const existingNames = new Set(queueRef.current.map((q) => q.fileName.toLowerCase()));
    const analyzed: AudioTrackAnalysis[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (existingNames.has(file.name.toLowerCase())) {
        continue; // Skip duplicate file name in batch import
      }
      const t0 = Date.now();
      try {
        const fd = new FormData();
        fd.append('file', file);
        const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        if (relPath) fd.append('folderPath', relPath);

        const res = await fetch('/api/audio/analyze', { method: 'POST', body: fd });
        const data = (await res.json()) as { analysis?: AudioTrackAnalysis; error?: string };
        if (!res.ok || !data.analysis) {
          throw new Error(data.error || `Échec d'analyse pour ${file.name}`);
        }
        analyzed.push(data.analysis);
        existingNames.add(file.name.toLowerCase());
        appendLog({
          operation: 'analyze',
          fileName: file.name,
          result: 'success',
          durationMs: Date.now() - t0,
          message: `${data.analysis.detectedFormat} · ${data.analysis.codec}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur FFprobe.';
        errors.push(`${file.name}: ${msg}`);
        appendLog({
          operation: 'analyze',
          fileName: file.name,
          result: 'error',
          durationMs: Date.now() - t0,
          message: msg,
        });
      }
    }

    if (analyzed.length > 0) {
      addTracksToQueue(analyzed);
    }
    if (errors.length > 0) {
      setImportError(errors[0]);
    }
    setIsImporting(false);
  };

  const handleImportUrl = async (url: string) => {
    setIsImporting(true);
    setImportError(null);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/audio/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { analysis?: AudioTrackAnalysis; error?: string };
      if (!res.ok || !data.analysis) {
        throw new Error(data.error || 'Téléchargement impossible.');
      }
      addTracksToQueue([data.analysis]);
      appendLog({
        operation: 'download',
        fileName: data.analysis.fileName,
        result: 'success',
        durationMs: Date.now() - t0,
        message: 'Import URL sécurisé + FFprobe OK.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur téléchargement.';
      setImportError(msg);
      appendLog({
        operation: 'download',
        fileName: url,
        result: 'error',
        durationMs: Date.now() - t0,
        message: msg,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectGoal = (goal: ConversionGoal) => {
    setActiveGoal(goal);
    setActiveRecipeId(null);
    if (goal === 'manual') return;

    const sampleAnalysis = queue.find((q) => q.analysis)?.analysis;
    const rec = recommendConversionSettings(goal, sampleAnalysis);
    setSettings((prev) => ({ ...prev, ...rec.recommendedSettings }));
    setStudio((prev) => ({ ...prev, ...rec.recommendedStudio }));
  };

  const convertSingleItem = async (
    item: QueueItem,
    usedNames: Set<string>
  ): Promise<void> => {
    if (!item.analysis) return;

    const naming = formatOutputFilename(
      item.fileName,
      settings.namingPattern,
      settings.outputFormat,
      item.editedMetadata ?? item.analysis.metadata,
      usedNames,
      settings.existingPolicy
    );

    if (naming.skipped) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: 'cancelled', progress: 0, errorMessage: 'Ignoré (doublon)' } : q
        )
      );
      return;
    }

    usedNames.add(naming.fileName.toLowerCase());

    const controller = new AbortController();
    abortControllersRef.current.set(item.id, controller);

    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id ? { ...q, status: 'converting', progress: 35, errorMessage: undefined } : q
      )
    );

    const startedAt = Date.now();

    try {
      const res = await fetch('/api/audio/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          fileId: item.fileId,
          outputFileName: naming.fileName,
          settings,
          studio,
          metadata: item.editedMetadata ?? item.analysis.metadata,
          analysis: item.analysis,
        }),
      });

      const data = (await res.json()) as {
        outputFileId?: string;
        outputFileName?: string;
        outputSizeBytes?: number;
        report?: ConversionComparisonReport;
        error?: string;
      };

      if (!res.ok || !data.outputFileId || !data.report) {
        throw new Error(data.error || 'Échec de conversion.');
      }

      const qualityLabel =
        settings.outputFormat === 'mp3'
          ? settings.presetId !== 'custom'
            ? QUALITY_PRESETS[settings.presetId].specLabel
            : settings.encodingMode === 'vbr'
              ? `MP3 VBR V${settings.vbrQuality}`
              : `MP3 ${settings.bitrateKbps} kbps`
          : settings.outputFormat.toUpperCase();

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: 'completed',
                progress: 100,
                outputFileId: data.outputFileId,
                outputFileName: data.outputFileName,
                outputSizeBytes: data.outputSizeBytes,
                report: data.report,
                completedAt: Date.now(),
              }
            : q
        )
      );

      setHistory((prev) => [
        {
          id: makeId('hist'),
          timestamp: new Date().toISOString(),
          fileName: item.fileName,
          outputFileName: data.outputFileName || naming.fileName,
          sourceFormat: item.analysis!.detectedFormat,
          outputFormat: settings.outputFormat.toUpperCase(),
          qualityLabel,
          streamCopied: data.report!.streamCopied,
          status: 'completed',
          durationMs: data.report!.processingDurationMs,
          sourceSizeBytes: item.analysis!.sizeBytes,
          outputSizeBytes: data.outputSizeBytes ?? 0,
        },
        ...prev,
      ]);

      appendLog({
        operation: 'convert',
        fileName: item.fileName,
        result: 'success',
        durationMs: Date.now() - startedAt,
        message: data.report.streamCopied
          ? 'Smart Stream Copy effectué sans perte.'
          : `Converti vers ${settings.outputFormat.toUpperCase()}.`,
      });
    } catch (err) {
      const aborted =
        controller.signal.aborted ||
        (err instanceof Error && err.name === 'AbortError');
      const msg = aborted
        ? 'Conversion annulée'
        : err instanceof Error
          ? err.message
          : 'Erreur FFmpeg.';

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: aborted ? 'cancelled' : 'failed',
                progress: 0,
                errorMessage: aborted ? undefined : msg,
              }
            : q
        )
      );

      appendLog({
        operation: 'convert',
        fileName: item.fileName,
        result: aborted ? 'cancelled' : 'error',
        durationMs: Date.now() - startedAt,
        message: msg,
      });
    } finally {
      abortControllersRef.current.delete(item.id);
    }
  };

  const handleStartBatch = async (onlySelected: boolean) => {
    const targets = queueRef.current.filter((q) =>
      onlySelected ? q.selected && q.status !== 'converting' : q.status !== 'converting'
    );
    if (targets.length === 0) return;

    cancelledRef.current = false;
    pausedRef.current = false;
    setIsPaused(false);
    setElapsedSec(0);
    setIsConverting(true);

    // Mark targets pending
    const targetIds = new Set(targets.map((x) => x.id));
    setQueue((prev) =>
      prev.map((q) =>
        targetIds.has(q.id) ? { ...q, status: 'pending', progress: 0, errorMessage: undefined } : q
      )
    );

    const usedNames = new Set<string>();
    const concurrency = Math.max(1, Math.min(4, settings.concurrentJobs || 2));
    let cursor = 0;

    const worker = async () => {
      while (cursor < targets.length && !cancelledRef.current) {
        while (pausedRef.current && !cancelledRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (cancelledRef.current) break;
        const idx = cursor;
        cursor += 1;
        const job = targets[idx];
        if (job) {
          await convertSingleItem(job, usedNames);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
    setIsConverting(false);
    setIsPaused(false);
  };

  const handleCancelBatch = () => {
    cancelledRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    for (const ctrl of abortControllersRef.current.values()) {
      ctrl.abort();
    }
    abortControllersRef.current.clear();
    setQueue((prev) =>
      prev.map((q) =>
        q.status === 'pending' || q.status === 'converting'
          ? { ...q, status: 'cancelled', progress: 0 }
          : q
      )
    );
    setIsConverting(false);
  };

  const handleRetryItem = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    void convertSingleItem(item, new Set());
  };

  const handleCancelItem = (id: string) => {
    const ctrl = abortControllersRef.current.get(id);
    if (ctrl) ctrl.abort();
  };

  const handleMergeTracks = async (fileIds: string[], outputName: string) => {
    setIsMerging(true);
    const t0 = Date.now();
    try {
      const ext = settings.outputFormat;
      const cleanName = outputName.endsWith(`.${ext}`) ? outputName : `${outputName}.${ext}`;
      const res = await fetch('/api/audio/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds,
          outputFormat: ext,
          outputFileName: cleanName,
        }),
      });
      const data = (await res.json()) as { analysis?: AudioTrackAnalysis; error?: string };
      if (!res.ok || !data.analysis) {
        throw new Error(data.error || 'Fusion impossible.');
      }
      addTracksToQueue([data.analysis]);
      appendLog({
        operation: 'merge',
        fileName: data.analysis.fileName,
        result: 'success',
        durationMs: Date.now() - t0,
        message: `${fileIds.length} pistes fusionnées avec FFmpeg concat.`,
      });
      setActiveTab('convert');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur fusion.';
      setImportError(msg);
      appendLog({
        operation: 'merge',
        fileName: outputName,
        result: 'error',
        durationMs: Date.now() - t0,
        message: msg,
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleApplyRecipe = (recipe: Recipe) => {
    setActiveRecipeId(recipe.id);
    setActiveGoal(recipe.goal);
    setSettings((prev) => ({ ...prev, ...recipe.settings }));
    setStudio((prev) => ({ ...DEFAULT_STUDIO_OPTIONS, ...recipe.studio }));
    setActiveTab('convert');
  };

  const handleSaveRecipe = (name: string, description: string) => {
    const newRecipe: Recipe = {
      id: makeId('rec'),
      name,
      descriptionFr: description || 'Recette personnalisée MeloVox',
      descriptionEn: description || 'Custom MeloVox recipe',
      isBuiltIn: false,
      goal: activeGoal,
      settings: { ...settings },
      studio: { ...studio },
      createdAt: new Date().toISOString(),
    };
    setCustomRecipes((prev) => [newRecipe, ...prev]);
    setActiveRecipeId(newRecipe.id);
  };

  const navItems: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'convert', label: `01. ${t.nav.convert}`, icon: ArrowRightLeft },
    { id: 'lab', label: `02. ${t.nav.lab}`, icon: FlaskConical },
    { id: 'studio', label: `03. ${t.nav.studio}`, icon: Sliders },
    { id: 'recipes', label: `04. ${t.nav.recipes}`, icon: BookMarked },
    { id: 'library', label: `05. ${t.nav.library}`, icon: Library },
    { id: 'history', label: `06. ${t.nav.history}`, icon: History },
  ];

  const allRecipes = [...BUILT_IN_RECIPES, ...customRecipes];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label ?? t.nav.convert;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[252px] lg:shrink-0 lg:flex-col border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#10141D]">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800/90">
          <div className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            MeloVox
          </div>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
            {t.brandSubtitle}
          </p>
        </div>

        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800/90 p-4 space-y-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
              onClick={() => setLocale((prev) => (prev === 'fr' ? 'en' : 'fr'))}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {locale === 'fr' ? 'Langue : FR' : 'Lang: EN'}
            </button>
            <button
              type="button"
              aria-label={
                theme === 'dark'
                  ? locale === 'fr'
                    ? 'Activer le thème clair'
                    : 'Switch to light theme'
                  : locale === 'fr'
                    ? 'Activer le thème sombre'
                    : 'Switch to dark theme'
              }
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {locale === 'fr' ? 'Moteur local confidentiel' : 'Private local engine'}
            </p>
            <p className="mt-1 leading-relaxed">
              {locale === 'fr'
                ? 'FFmpeg & LAME exécutés localement. Vos originaux restent intacts.'
                : 'FFmpeg & LAME run locally. Source files are never modified.'}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-64 flex-col bg-white dark:bg-[#10141D] border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <span className="font-display text-lg font-bold">MeloVox</span>
              <button
                type="button"
                aria-label={locale === 'fr' ? 'Fermer le menu' : 'Close menu'}
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale((prev) => (prev === 'fr' ? 'en' : 'fr'))}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {locale.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#0B0E14]/90 backdrop-blur px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label={locale === 'fr' ? 'Ouvrir le menu' : 'Open menu'}
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="hidden sm:inline font-display font-semibold text-slate-900 dark:text-white">
                MeloVox
              </span>
              <span className="hidden sm:inline text-slate-400">/</span>
              <span className="font-medium text-slate-600 dark:text-slate-300 truncate">
                {activeNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={queue.length === 0 || isConverting}
              onClick={() => {
                setActiveTab('convert');
                void handleStartBatch(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 sm:px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.actions.startConversion}</span>
              <span className="sm:hidden">{locale === 'fr' ? 'Convertir' : 'Convert'}</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'convert' && (
                <ConvertWorkspace
                  locale={locale}
                  t={t}
                  queue={queue}
                  settings={settings}
                  studio={studio}
                  activeGoal={activeGoal}
                  isConverting={isConverting}
                  isPaused={isPaused}
                  isImporting={isImporting}
                  importError={importError}
                  elapsedSec={elapsedSec}
                  onSelectGoal={handleSelectGoal}
                  onUpdateSettings={(next) => {
                    setActiveRecipeId(null);
                    setSettings(next);
                  }}
                  onLoadDemoTracks={handleLoadDemoTracks}
                  onUploadFiles={handleUploadFiles}
                  onImportUrl={handleImportUrl}
                  onToggleSelect={(id) =>
                    setQueue((prev) =>
                      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
                    )
                  }
                  onRemoveItem={(id) =>
                    setQueue((prev) => prev.filter((q) => q.id !== id))
                  }
                  onRetryItem={handleRetryItem}
                  onCancelItem={handleCancelItem}
                  onClearQueue={() => setQueue([])}
                  onStartBatch={(onlySel) => void handleStartBatch(onlySel)}
                  onTogglePause={() => {
                    pausedRef.current = !pausedRef.current;
                    setIsPaused(pausedRef.current);
                  }}
                  onCancelBatch={handleCancelBatch}
                  onInspectLab={(id) => {
                    setSelectedItemId(id);
                    setActiveTab('lab');
                  }}
                />
              )}

              {activeTab === 'lab' && (
                <AudioLabView
                  locale={locale}
                  t={t}
                  queue={queue}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  settings={settings}
                  studio={studio}
                  onGoToConvert={() => setActiveTab('convert')}
                />
              )}

              {activeTab === 'studio' && (
                <StudioView
                  locale={locale}
                  t={t}
                  studio={studio}
                  onChangeStudio={setStudio}
                  settings={settings}
                  queue={queue}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  onUpdateMetadata={(itemId, meta: AudioMetadata) =>
                    setQueue((prev) =>
                      prev.map((q) => (q.id === itemId ? { ...q, editedMetadata: meta } : q))
                    )
                  }
                  onMergeTracks={handleMergeTracks}
                  isMerging={isMerging}
                />
              )}

              {activeTab === 'recipes' && (
                <RecipesView
                  locale={locale}
                  t={t}
                  recipes={allRecipes}
                  activeRecipeId={activeRecipeId}
                  currentSettings={settings}
                  currentStudio={studio}
                  currentGoal={activeGoal}
                  onApplyRecipe={handleApplyRecipe}
                  onSaveRecipe={handleSaveRecipe}
                  onDeleteRecipe={(id) =>
                    setCustomRecipes((prev) => prev.filter((r) => r.id !== id))
                  }
                />
              )}

              {activeTab === 'library' && (
                <LibraryView
                  locale={locale}
                  t={t}
                  queue={queue}
                  onInspectLab={(id) => {
                    setSelectedItemId(id);
                    setActiveTab('lab');
                  }}
                  onEditStudio={(id) => {
                    setSelectedItemId(id);
                    setActiveTab('studio');
                  }}
                  onGoToConvert={() => setActiveTab('convert')}
                />
              )}

              {activeTab === 'history' && (
                <HistoryAndDiagnosticsView
                  locale={locale}
                  t={t}
                  history={history}
                  logs={logs}
                  onClearHistory={() => setHistory([])}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
