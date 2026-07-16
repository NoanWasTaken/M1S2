'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type WidgetType = 'kpi' | 'timeseries' | 'heatmap';
type Mode = 'count' | 'rate';

type Filter = { field: string; value: string };

type WidgetFormData = {
  type: WidgetType;
  title: string;
  metric: string;
  mode: Mode;
  step: string;
  pageUrl: string;
  filters: Filter[];
};

type WidgetBuilderModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (widget: WidgetFormData) => void;
  pageUrls?: string[];
};

const STEPS = ['widgetBuilderStepType', 'widgetBuilderStepConfig', 'widgetBuilderStepTitle'] as const;

const WIDGET_TYPES: { key: WidgetType; icon: React.ReactNode }[] = [
  {
    key: 'kpi',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'timeseries',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    key: 'heatmap',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
];

const METRICS = ['pageview', 'click', 'hover', 'page_exit', 'tabchange'];
const STEPS_OPTIONS = ['hour', 'day', 'week', 'month'];

export function WidgetBuilderModal({ open, onClose, onSave, pageUrls }: WidgetBuilderModalProps) {
  const t = useTranslations('dashboard');
  const tm = useTranslations('metrics');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WidgetFormData>({
    type: 'kpi',
    title: '',
    metric: 'pageview',
    mode: 'count',
    step: 'hour',
    pageUrl: pageUrls?.[0] ?? '',
    filters: [],
  });

  if (!open) return null;

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 2) return form.title.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 2) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSave = () => {
    onSave(form);
    setStep(0);
    setForm({ type: 'kpi', title: '', metric: 'pageview', mode: 'count', step: '1h', pageUrl: pageUrls?.[0] ?? '', filters: [] });
  };

  const handleClose = () => {
    setStep(0);
    setForm({ type: 'kpi', title: '', metric: 'pageview', mode: 'count', step: '1h', pageUrl: pageUrls?.[0] ?? '', filters: [] });
    onClose();
  };

  const addFilter = () => {
    setForm((f) => ({ ...f, filters: [...f.filters, { field: '', value: '' }] }));
  };

  const updateFilter = (index: number, key: 'field' | 'value', val: string) => {
    setForm((f) => {
      const filters = f.filters.map((flt, i) => (i === index ? { ...flt, [key]: val } : flt));
      return { ...f, filters };
    });
  };

  const removeFilter = (index: number) => {
    setForm((f) => ({ ...f, filters: f.filters.filter((_, i) => i !== index) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            {STEPS.map((key, i) => (
              <span
                key={key}
                className={`font-medium transition-colors ${
                  i <= step ? 'text-accent' : 'text-text-tertiary'
                }`}
              >
                {t(key)}
              </span>
            ))}
          </div>
          <button
            onClick={handleClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            aria-label={t('widgetBuilderCancel')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 h-1.5 w-full rounded-full bg-border-subtle">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {step === 0 && (
          <div className="space-y-3">
            {WIDGET_TYPES.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => setForm((f) => ({ ...f, type: key }))}
                className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                  form.type === key
                    ? 'border-accent bg-accent/5'
                    : 'border-border-subtle hover:border-border-card'
                }`}
              >
                <span className="text-accent">{icon}</span>
                <span className="font-medium text-text-primary">{t(`widgetType${key.charAt(0).toUpperCase() + key.slice(1)}`)}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {form.type !== 'heatmap' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                {t('metric')}
              </label>
              <select
                value={form.metric}
                onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              >
                {METRICS.map((m) => (
                  <option key={m} value={m}>
                    {tm(m)}
                  </option>
                ))}
              </select>
            </div>
            )}

            {form.type !== 'heatmap' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                {t('mode')}
              </label>
              <div className="flex gap-2">
                {(['count', 'rate'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, mode: m }))}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      form.mode === m
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border-subtle text-text-secondary hover:border-border-card'
                    }`}
                  >
                    {t(`mode${m.charAt(0).toUpperCase() + m.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
            )}

            {form.type !== 'heatmap' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                {t('configStep')}
              </label>
              <select
                value={form.step}
                onChange={(e) => setForm((f) => ({ ...f, step: e.target.value }))}
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              >
                {STEPS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            )}

            {form.type === 'heatmap' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {t('heatmapSelectPage')}
                </label>
                {pageUrls && pageUrls.length > 0 ? (
                  <select
                    value={form.pageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, pageUrl: e.target.value }))}
                    className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                  >
                    {pageUrls.map((url) => (
                      <option key={url} value={url}>
                        {url}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.pageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, pageUrl: e.target.value }))}
                    placeholder="https://example.com/page"
                    className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                  />
                )}
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {t('filters')}
                </span>
                <button
                  onClick={addFilter}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  + {t('filterAdd')}
                </button>
              </div>
              {form.filters.map((flt, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={flt.field}
                    onChange={(e) => updateFilter(i, 'field', e.target.value)}
                    placeholder={t('filterField')}
                    className="flex-1 rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                  />
                  <input
                    type="text"
                    value={flt.value}
                    onChange={(e) => updateFilter(i, 'value', e.target.value)}
                    placeholder={t('filterValue')}
                    className="flex-1 rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                  />
                  <button
                    onClick={() => removeFilter(i)}
                    className="px-2 text-sm text-danger hover:underline"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
                {t('widgetBuilderStepTitle')}
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('widgetBuilderStepTitle')}
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                autoFocus
              />
            </div>

            <div className="rounded-lg border border-border-subtle bg-bg-sidebar/30 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
                {t('widgetBuilderStepConfig')}
              </p>
              <div className="space-y-1 text-sm text-text-primary">
                <p>{t(`widgetType${form.type.charAt(0).toUpperCase() + form.type.slice(1)}`)}</p>
                {form.type !== 'heatmap' && <p>{t('metric')}: {tm(form.metric)}</p>}
                {form.type !== 'heatmap' && <p>{t('mode')}: {t(`mode${form.mode.charAt(0).toUpperCase() + form.mode.slice(1)}`)}</p>}
                {form.type !== 'heatmap' && <p>{t('configStep')}: {form.step}</p>}
                {form.type === 'heatmap' && form.pageUrl && (
                  <p className="truncate">{form.pageUrl}</p>
                )}
                {form.filters.length > 0 && (
                  <p>{t('filters')}: {form.filters.filter((f) => f.field).length}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
          <button
            onClick={handleClose}
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {t('widgetBuilderCancel')}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover transition-colors"
              >
                {t('widgetBuilderBack')}
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#05070d] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {t('widgetBuilderNext')}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canNext()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#05070d] hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {t('widgetBuilderAdd')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
