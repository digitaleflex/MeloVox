'use client';

import React, { useState } from 'react';
import { BookMarked, Check, Plus, Trash2 } from 'lucide-react';
import { Translations } from '@/lib/audio/i18n';
import {
  ConversionGoal,
  ConversionSettings,
  Locale,
  Recipe,
  StudioOptions,
} from '@/lib/audio/types';

interface RecipesViewProps {
  locale: Locale;
  t: Translations;
  recipes: Recipe[];
  activeRecipeId: string | null;
  currentSettings: ConversionSettings;
  currentStudio: StudioOptions;
  currentGoal: ConversionGoal;
  onApplyRecipe: (recipe: Recipe) => void;
  onSaveRecipe: (name: string, description: string) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

export default function RecipesView({
  locale,
  t,
  recipes,
  activeRecipeId,
  currentSettings,
  currentStudio,
  onApplyRecipe,
  onSaveRecipe,
  onDeleteRecipe,
}: RecipesViewProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(
        locale === 'fr' ? 'Veuillez saisir un nom de recette.' : 'Please enter a recipe name.'
      );
      return;
    }
    setFormError('');
    onSaveRecipe(name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {locale === 'fr' ? 'Recettes de conversion réutilisables' : 'Reusable Conversion Recipes'}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {locale === 'fr'
            ? 'Appliquez un profil complet (format, débit, normalisation, silence) en un clic ou sauvegardez votre propre recette.'
            : 'Apply a complete preset (format, bitrate, loudness, silence) in one click or save your own workflow.'}
        </p>
      </div>

      {/* Create custom recipe */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {locale === 'fr'
              ? 'Enregistrer la configuration actuelle comme recette'
              : 'Save current configuration as recipe'}
          </h3>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {currentSettings.outputFormat.toUpperCase()} ·{' '}
            {currentSettings.encodingMode === 'vbr'
              ? `VBR V${currentSettings.vbrQuality}`
              : `${currentSettings.bitrateKbps} kbps`}
            {currentStudio.normalizeLoudness ? ` · ${currentStudio.targetLufs} LUFS` : ''}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[240px_1fr_auto]">
          <input
            type="text"
            aria-label={locale === 'fr' ? 'Nom de la recette' : 'Recipe name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Mastering_Radio_FR"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            aria-label={locale === 'fr' ? 'Description de la recette' : 'Recipe description'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              locale === 'fr'
                ? 'Description courte (ex: Voix normalisée -16 LUFS)'
                : 'Short description'
            }
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0E14] px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t.actions.saveRecipe}
          </button>
        </div>
        {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
      </form>

      {/* Recipes Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe) => {
          const isActive = recipe.id === activeRecipeId;
          return (
            <article
              key={recipe.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
                isActive
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookMarked className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <h3 className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {recipe.name}
                    </h3>
                  </div>
                  {!recipe.isBuiltIn && (
                    <button
                      type="button"
                      aria-label={`${t.actions.remove} ${recipe.name}`}
                      onClick={() => onDeleteRecipe(recipe.id)}
                      className="rounded p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {locale === 'fr' ? recipe.descriptionFr : recipe.descriptionEn}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>{(recipe.settings.outputFormat || 'mp3').toUpperCase()}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {recipe.settings.encodingMode === 'vbr'
                      ? `VBR V${recipe.settings.vbrQuality ?? 0}`
                      : recipe.settings.bitrateKbps
                        ? `${recipe.settings.bitrateKbps} kbps`
                        : 'Lossless'}
                  </span>
                  {recipe.studio.normalizeLoudness && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{recipe.studio.targetLufs ?? -16} LUFS</span>
                    </>
                  )}
                  {recipe.studio.removeSilence && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Silence trim</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {recipe.isBuiltIn
                    ? locale === 'fr'
                      ? 'Officielle MeloVox'
                      : 'Built-in'
                    : locale === 'fr'
                      ? 'Personnalisée'
                      : 'Custom'}
                </span>
                <button
                  type="button"
                  onClick={() => onApplyRecipe(recipe)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {isActive && <Check className="h-3.5 w-3.5" />}
                  {isActive
                    ? locale === 'fr'
                      ? 'Appliquée'
                      : 'Active'
                    : t.actions.applyRecipe}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
