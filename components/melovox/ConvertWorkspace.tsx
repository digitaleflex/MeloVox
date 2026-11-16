'use client';

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CopyCheck,
  Download,
  FileAudio,
  FlaskConical,
  FolderOpen,
  Globe,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  evaluateConversionWarnings,
  evaluateSmartStreamCopy,
  formatBytes,
  formatDuration,
  QUALITY_PRESETS,
  recommendConversionSettings,
  SUPPORTED_OUTPUT_FORMATS,
} from '@/lib/audio/smart-engine';
import { Translations } from '@/lib/audio/i18n';
import {
  ChannelOption,
  ConversionGoal,
  ConversionSettings,
  ExistingFilePolicy,
  Locale,
  Mp3Bitrate,
  NamingPattern,
  OutputFormat,
  QualityPresetId,
  QueueItem,
  SampleRateOption,
  StudioOptions,
  VbrQuality,
} from '@/lib/audio/types';

interface ConvertWorkspaceProps {
  locale: Locale;
  t: Translations;
  queue: QueueItem[];
  settings: ConversionSettings;
  studio: StudioOptions;
  activeGoal: ConversionGoal;
  isConverting: boolean;
  isPaused: boolean;
  isImporting: boolean;
  importError: string | null;
  elapsedSec: number;
  onSelectGoal: (goal: ConversionGoal) => void;
  onUpdateSettings: (next: ConversionSettings) => void;
  onLoadDemoTracks: () => Promise<void>;
  onUploadFiles: (files: FileList | File[]) => Promise<void>;
  onImportUrl: (url: string) => Promise<void>;
  onToggleSelect: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onCancelItem: (id: string) => void;
  onClearQueue: () => void;
  onStartBatch: (onlySelected: boolean) => void;
  onTogglePause: () => void;
  onCancelBatch: () => void;
  onInspectLab: (id: string) => void;
}

const BITRATES: Mp3Bitrate[] = [64, 96, 128, 160, 192, 224, 256, 320];
const VBR_LEVELS: VbrQuality[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function ConvertWorkspace({
  locale,
  t,
  queue,
  settings,
  studio,
  activeGoal,
  isConverting,
  isPaused,
  isImporting,
  importError,
  elapsedSec,
  onSelectGoal,
  onUpdateSettings,
  onLoadDemoTracks,
  onUploadFiles,
  onImportUrl,
  onToggleSelect,
  onRemoveItem,
  onRetryItem,
  onCancelItem,
  onClearQueue,
  onStartBatch,
  onTogglePause,
  onCancelBatch,
  onInspectLab,
}: ConvertWorkspaceProps) {
  const [advancedMode, setAdvancedMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const firstAnalysis = queue.find((q) => q.analysis)?.analysis;
  const activeRecommendation =
    activeGoal !== 'manual' ? recommendConversionSettings(activeGoal, firstAnalysis) : null;

  const completedItems = queue.filter((q) => q.status === 'completed');
  const failedItems = queue.filter((q) => q.status === 'failed');
  const activeItems = queue.filter((q) => q.status === 'converting' || q.status === 'pending');
  const selectedCount = queue.filter((q) => q.selected).length;

  const totalSourceBytes = completedItems.reduce((acc, q) => acc + (q.analysis?.sizeBytes ?? 0), 0);
  const totalOutputBytes = completedItems.reduce((acc, q) => acc + (q.outputSizeBytes ?? 0), 0);
  const savingsPercent =
    totalSourceBytes > 0
      ? Math.round(((totalOutputBytes - totalSourceBytes) / totalSourceBytes) * 1000) / 10
      : 0;

  const overallProgress =
    queue.length > 0
      ? Math.round(queue.reduce((acc, q) => acc + q.progress, 0) / queue.length)
      : 0;

  const handlePresetClick = (presetId: Exclude<QualityPresetId, 'custom'>) => {
    const p = QUALITY_PRESETS[presetId];
    onSelectGoal('manual');
    onUpdateSettings({
      ...settings,
      outputFormat: 'mp3',
      presetId,
      encodingMode: p.encodingMode,
      bitrateKbps: p.bitrateKbps,
      vbrQuality: p.vbrQuality,
    });
  };

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    await onImportUrl(urlInput.trim());
    setUrlInput('');
  };

  const playingItem = queue.find((q) => q.id === playingId) ?? null;

  return (
    <div className="space-y-6">
      {/* Hero & Import Dropzone */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => void handleDrop(e)}
        className={`rounded-xl border transition-colors p-6 lg:p-7 ${
          dragOver
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]'
        }`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 [text-wrap:balance]">
              {t.heroTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t.heroSubtitle}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.heroPromise}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.wav,.flac,.mp3,.aac,.m4a,.ogg,.opus,.wma,.aiff,.alac,.ape,.wv,.tta,.caf,.au"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void onUploadFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="sr-only"
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is supported in Chromium/WebKit/Firefox
              webkitdirectory=""
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void onUploadFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="sr-only"
            />

            <button
              type="button"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="h-4 w-4" />
              {t.actions.selectFiles}
            </button>

            <button
              type="button"
              disabled={isImporting}
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <FolderOpen className="h-4 w-4" />
              {t.actions.importFolder}
            </button>

            <button
              type="button"
              onClick={() => setShowUrlBar((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B0E14] px-3.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Globe className="h-4 w-4" />
              {t.actions.importUrl}
            </button>

            <button
              type="button"
              disabled={isImporting}
              onClick={() => void onLoadDemoTracks()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              {isImporting
                ? locale === 'fr'
                  ? 'Analyse FFprobe…'
                  : 'Probing…'
                : t.actions.loadDemoTracks}
            </button>
          </div>
        </div>

        {/* Direct URL import drawer */}
        {showUrlBar && (
          <form
            onSubmit={(e) => void handleUrlSubmit(e)}
            className="mt-4 flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 sm:flex-row"
          >
            <input
              type="url"
              aria-label={locale === 'fr' ? 'URL audio directe' : 'Direct audio URL'}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/audio/sample.wav"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={isImporting}
              className="rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {locale === 'fr' ? 'Télécharger & Analyser' : 'Download & Probe'}
            </button>
          </form>
        )}

        {importError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
      </section>

      {/* Smart Conversion Assistant + Settings Split */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Smart Goal Assistant */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.goals.title}
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {queue.length} {locale === 'fr' ? 'fichiers' : 'files'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                ['music', t.goals.music],
                ['voice', t.goals.voice],
                ['podcast', t.goals.podcast],
                ['share', t.goals.share],
                ['archive', t.goals.archive],
                ['universal', t.goals.universal],
              ] as [ConversionGoal, string][]
            ).map(([goalId, label]) => {
              const active = activeGoal === goalId;
              return (
                <button
                  key={goalId}
                  type="button"
                  onClick={() => onSelectGoal(goalId)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap truncate ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {activeRecommendation ? (
            <div className="rounded-lg border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 space-y-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {locale === 'fr' ? activeRecommendation.headlineFr : activeRecommendation.headlineEn}
              </p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {locale === 'fr'
                  ? activeRecommendation.rationaleFr
                  : activeRecommendation.rationaleEn}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0E14] p-3.5">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {locale === 'fr'
                  ? 'Configuration manuelle sélectionnée'
                  : 'Manual configuration active'}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {locale === 'fr'
                  ? 'Choisissez un objectif ci-dessus pour laisser MeloVox calculer les paramètres optimaux et éviter toute perte inutile.'
                  : 'Pick an objective above to let MeloVox select optimal settings and prevent quality degradation.'}
              </p>
            </div>
          )}
        </section>

        {/* Format & Quality Settings (Simple vs Advanced) */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t.settings.outputFormat} & {t.settings.qualityProfile}
              </h2>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1">
              <button
                type="button"
                onClick={() => setAdvancedMode(false)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  !advancedMode
                    ? 'bg-white dark:bg-[#121620] text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.settings.simpleMode}
              </button>
              <button
                type="button"
                onClick={() => setAdvancedMode(true)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  advancedMode
                    ? 'bg-white dark:bg-[#121620] text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.settings.advancedMode}
              </button>
            </div>
          </div>

          {/* Output format buttons */}
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_OUTPUT_FORMATS.map((fmt) => {
              const active = settings.outputFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    onSelectGoal('manual');
                    onUpdateSettings({ ...settings, outputFormat: fmt.id as OutputFormat });
                  }}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {fmt.label}
                </button>
              );
            })}
          </div>

          {/* Quality Presets */}
          {settings.outputFormat === 'mp3' && (
            <div className="grid gap-2 sm:grid-cols-5">
              {(Object.keys(QUALITY_PRESETS) as Exclude<QualityPresetId, 'custom'>[]).map(
                (presetKey) => {
                  const p = QUALITY_PRESETS[presetKey];
                  const active = settings.presetId === presetKey;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetClick(p.id)}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {locale === 'fr' ? p.labelFr : p.labelEn}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {p.encodingMode === 'vbr' ? `VBR V${p.vbrQuality}` : `${p.bitrateKbps}k`}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                        {locale === 'fr' ? p.descriptionFr : p.descriptionEn}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* Advanced Controls */}
          {advancedMode && (
            <div className="grid gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {settings.outputFormat === 'mp3' && (
                <div>
                  <label
                    htmlFor="enc-mode"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    {t.settings.encodingMode}
                  </label>
                  <select
                    id="enc-mode"
                    value={settings.encodingMode}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        presetId: 'custom',
                        encodingMode: e.target.value as 'cbr' | 'vbr',
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="cbr">CBR (Constant Bitrate)</option>
                    <option value="vbr">VBR (Variable Bitrate)</option>
                  </select>
                </div>
              )}

              {settings.encodingMode === 'vbr' && settings.outputFormat === 'mp3' ? (
                <div>
                  <label
                    htmlFor="vbr-quality"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    {t.settings.vbrQuality}
                  </label>
                  <select
                    id="vbr-quality"
                    value={settings.vbrQuality}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        presetId: 'custom',
                        vbrQuality: Number(e.target.value) as VbrQuality,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                  >
                    {VBR_LEVELS.map((v) => (
                      <option key={v} value={v}>
                        V{v} {v === 0 ? '(Max)' : v === 9 ? '(Min)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : settings.outputFormat !== 'wav' && settings.outputFormat !== 'flac' ? (
                <div>
                  <label
                    htmlFor="bitrate-select"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    {t.settings.bitrate}
                  </label>
                  <select
                    id="bitrate-select"
                    value={settings.bitrateKbps}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        presetId: 'custom',
                        bitrateKbps: Number(e.target.value) as Mp3Bitrate,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                  >
                    {BITRATES.map((b) => (
                      <option key={b} value={b}>
                        {b} kbps
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="sample-rate"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {t.settings.sampleRate}
                </label>
                <select
                  id="sample-rate"
                  value={settings.sampleRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateSettings({
                      ...settings,
                      sampleRate: (val === 'auto' ? 'auto' : Number(val)) as SampleRateOption,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="auto">{locale === 'fr' ? 'Automatique (Source)' : 'Auto (Source)'}</option>
                  <option value={22050}>22 050 Hz</option>
                  <option value={32000}>32 000 Hz</option>
                  <option value={44100}>44 100 Hz</option>
                  <option value={48000}>48 000 Hz</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="channels-select"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {t.settings.channels}
                </label>
                <select
                  id="channels-select"
                  value={settings.channels}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, channels: e.target.value as ChannelOption })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="auto">{locale === 'fr' ? 'Automatique (Source)' : 'Auto (Source)'}</option>
                  <option value="mono">Mono</option>
                  <option value="stereo">Stéréo</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="naming-pattern"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {t.settings.namingPattern}
                </label>
                <select
                  id="naming-pattern"
                  value={settings.namingPattern}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      namingPattern: e.target.value as NamingPattern,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="{original}">NomOriginal.{settings.outputFormat}</option>
                  <option value="{artist} - {title}">Artiste - Titre.{settings.outputFormat}</option>
                  <option value="{track} - {title}">Piste - Titre.{settings.outputFormat}</option>
                  <option value="{title}">Titre.{settings.outputFormat}</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="existing-policy"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  {t.settings.existingPolicy}
                </label>
                <select
                  id="existing-policy"
                  value={settings.existingPolicy}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      existingPolicy: e.target.value as ExistingFilePolicy,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="auto_rename">
                    {locale === 'fr' ? 'Renommer automatiquement' : 'Auto-rename'}
                  </option>
                  <option value="skip">{locale === 'fr' ? 'Ignorer le fichier' : 'Skip existing'}</option>
                  <option value="overwrite">
                    {locale === 'fr' ? 'Remplacer explicitement' : 'Overwrite'}
                  </option>
                </select>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Live Batch Progress Bar */}
      {isConverting && (
        <section className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-[#121620] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isPaused
                  ? locale === 'fr'
                    ? 'File d’attente en pause'
                    : 'Batch queue paused'
                  : t.actions.converting}
              </p>
              <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {completedItems.length}/{queue.length}{' '}
                {locale === 'fr' ? 'terminés' : 'completed'} · {activeItems.length}{' '}
                {locale === 'fr' ? 'restants' : 'remaining'} · {elapsedSec}s
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTogglePause}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {isPaused ? t.actions.resume : t.actions.pause}
              </button>
              <button
                type="button"
                onClick={onCancelBatch}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <X className="h-3.5 w-3.5" />
                {t.actions.cancel}
              </button>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </section>
      )}

      {/* Results Summary Strip */}
      {!isConverting && completedItems.length > 0 && (
        <section className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {locale === 'fr'
                  ? `${completedItems.length} conversion(s) réussie(s)`
                  : `${completedItems.length} conversion(s) completed`}
                {failedItems.length > 0
                  ? locale === 'fr'
                    ? ` · ${failedItems.length} échec(s)`
                    : ` · ${failedItems.length} failed`
                  : ''}
              </p>
              <p className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                {formatBytes(totalSourceBytes)} → {formatBytes(totalOutputBytes)} (
                {savingsPercent > 0 ? `+${savingsPercent}%` : `${savingsPercent}%`})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onInspectLab(completedItems[0].id)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#121620] px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 whitespace-nowrap shrink-0"
          >
            <FlaskConical className="h-4 w-4" />
            {locale === 'fr' ? 'Voir le rapport Audio Lab' : 'Open Audio Lab Report'}
          </button>
        </section>
      )}

      {/* Audio Preview Strip if playing */}
      {playingItem && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] px-4 py-3">
          <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
            {locale === 'fr' ? 'Pré-écoute :' : 'Preview:'}{' '}
            {playingItem.outputFileName || playingItem.fileName}
          </span>
          <audio
            controls
            autoPlay
            src={`/api/audio/file/${playingItem.outputFileId ?? playingItem.fileId}`}
            className="h-8 w-full sm:w-80"
          />
        </div>
      )}

      {/* Batch Queue Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {locale === 'fr' ? 'File de conversion' : 'Conversion Queue'}
            </h2>
            <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {queue.length} {locale === 'fr' ? 'piste(s)' : 'track(s)'}
            </span>
          </div>

          {queue.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedCount > 0 && selectedCount < queue.length && (
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={() => onStartBatch(true)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {locale === 'fr'
                    ? `Convertir la sélection (${selectedCount})`
                    : `Convert selected (${selectedCount})`}
                </button>
              )}
              <button
                type="button"
                disabled={isConverting}
                onClick={onClearQueue}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.actions.clearQueue}
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={() => onStartBatch(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                {t.actions.startConversion}
              </button>
            </div>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="p-10 text-center">
            <FileAudio className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {locale === 'fr'
                ? 'Déposez vos fichiers audio ici ou chargez les pistes de test FFmpeg'
                : 'Drop audio files here or load the FFmpeg test suite'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              MP3, WAV, FLAC, AAC, M4A, OGG, OPUS, WMA, AIFF, ALAC…
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-2.5 w-9"></th>
                  <th className="px-4 py-2.5">{locale === 'fr' ? 'Piste & Signal' : 'Track & Signal'}</th>
                  <th className="px-4 py-2.5 text-right">{locale === 'fr' ? 'Durée' : 'Duration'}</th>
                  <th className="px-4 py-2.5 text-right">{locale === 'fr' ? 'Taille' : 'Size'}</th>
                  <th className="px-4 py-2.5">{locale === 'fr' ? 'Moteur intelligent' : 'Smart Engine'}</th>
                  <th className="px-4 py-2.5">{locale === 'fr' ? 'Statut' : 'Status'}</th>
                  <th className="px-4 py-2.5 text-right">{locale === 'fr' ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {queue.map((item) => {
                  const analysis = item.analysis;
                  const streamDecision = evaluateSmartStreamCopy(analysis, settings, studio);
                  const warnings = analysis
                    ? evaluateConversionWarnings(analysis, settings)
                    : [];
                  const hasUpscaleWarn = warnings.some((w) => w.code === 'lossy_upscale');

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.fileName}`}
                          checked={item.selected}
                          onChange={() => onToggleSelect(item.id)}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-2.5 max-w-[260px]">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {item.fileName}
                        </p>
                        {analysis && (
                          <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {analysis.detectedFormat} · {analysis.codec.toUpperCase()} ·{' '}
                            {Math.round(analysis.bitrateBps / 1000)}k ·{' '}
                            {(analysis.sampleRateHz / 1000).toFixed(1)} kHz ·{' '}
                            {analysis.channels === 1 ? 'Mono' : 'Stéréo'}
                            {analysis.lab.integratedLufs !== null
                              ? ` · ${analysis.lab.integratedLufs.toFixed(1)} LUFS`
                              : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {analysis ? formatDuration(analysis.durationSec) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        {item.outputSizeBytes
                          ? `${formatBytes(analysis?.sizeBytes ?? 0)} → ${formatBytes(item.outputSizeBytes)}`
                          : analysis
                            ? formatBytes(analysis.sizeBytes)
                            : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {streamDecision.eligible ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                            <CopyCheck className="h-3.5 w-3.5 shrink-0" />
                            Smart Stream Copy
                          </span>
                        ) : hasUpscaleWarn ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {locale === 'fr' ? 'Source compressée' : 'Lossy upscale'}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            → {settings.outputFormat.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <div className="space-y-1">
                          <span
                            className={`font-medium ${
                              item.status === 'completed'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.status === 'failed'
                                  ? 'text-red-600 dark:text-red-400'
                                  : item.status === 'converting'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {t.status[item.status]}
                            {item.status === 'converting' ? ` (${item.progress}%)` : ''}
                          </span>
                          {item.errorMessage && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 max-w-[180px] truncate">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label={`${locale === 'fr' ? 'Écouter' : 'Play'} ${item.fileName}`}
                            onClick={() => setPlayingId(item.id)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`${t.actions.details} ${item.fileName}`}
                            onClick={() => onInspectLab(item.id)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <FlaskConical className="h-3.5 w-3.5" />
                          </button>
                          {item.outputFileId && (
                            <a
                              href={`/api/audio/file/${item.outputFileId}?download=1`}
                              aria-label={`${t.actions.download} ${item.outputFileName}`}
                              className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {(item.status === 'failed' || item.status === 'cancelled') && (
                            <button
                              type="button"
                              aria-label={`${t.actions.retry} ${item.fileName}`}
                              onClick={() => onRetryItem(item.id)}
                              className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {item.status === 'converting' ? (
                            <button
                              type="button"
                              aria-label={`${t.actions.cancel} ${item.fileName}`}
                              onClick={() => onCancelItem(item.id)}
                              className="rounded-md border border-red-200 dark:border-red-900 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`${t.actions.remove} ${item.fileName}`}
                              onClick={() => onRemoveItem(item.id)}
                              className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
