import { useMemo, useReducer, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ImageOff, Rocket } from 'lucide-react';
import { Badge, Button, Card, FormField, Input, Textarea } from '@/components/ui';
import { CATEGORY_DEFAULT_REQUIREMENTS, CATEGORY_META, REQUIREMENT_META, THEMES } from '@/lib/constants';
import { dateRange, formatTime, isoPlusDays } from '@/lib/time';
import { cn } from '@/lib/utils';
import { eventBasicsSchema, eventScheduleSchema, eventVenueSchema } from '@/schemas';
import { detectEventClashes } from '@/lib/eventClashes';
import { PasswordInput } from '@/components/common/PasswordInput';

function reducer(state, action) {
  switch (action.type) {
    case 'set': {
      const errors = { ...state.errors };
      delete errors[action.field];
      return { ...state, values: { ...state.values, [action.field]: action.value }, errors };
    }
    case 'category':
      // Picking a category pre-selects the modules that kind of event usually needs.
      return { ...state, values: { ...state.values, category: action.value, requirements: CATEGORY_DEFAULT_REQUIREMENTS[action.value] } };
    case 'toggleRequirement': {
      const has = state.values.requirements.includes(action.key);
      return {
        ...state,
        values: { ...state.values, requirements: has ? state.values.requirements.filter((r) => r !== action.key) : [...state.values.requirements, action.key] },
      };
    }
    case 'errors':
      return { ...state, errors: action.errors };
    case 'next':
      return { ...state, step: state.step + 1, direction: 1, errors: {} };
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1), direction: -1, errors: {} };
    case 'goto':
      return { ...state, step: action.step, direction: action.step > state.step ? 1 : -1 };
  }
}

const STEPS = [
  { title: 'Basics', desc: 'Name & type' },
  { title: 'Date & time', desc: 'When it runs' },
  { title: 'Venue', desc: 'Where & how big' },
  { title: 'Look & feel', desc: 'Banner & theme' },
  { title: 'Requirements', desc: 'What you need' },
  { title: 'Review', desc: 'Confirm & create' },
];

const STEP_SCHEMAS = [eventBasicsSchema, eventScheduleSchema, eventVenueSchema, null, null, null];

export const DEFAULT_EVENT = {
  title: '',
  description: '',
  category: 'conference',
  startDate: isoPlusDays(14),
  endDate: isoPlusDays(14),
  dailyStart: '09:00',
  dailyEnd: '18:00',
  venue: '',
  city: '',
  expectedAttendees: 100,
  theme: 'indigo',
  bannerUrl: '',
  requirements: CATEGORY_DEFAULT_REQUIREMENTS.conference,
};

export function EventWizard({ initial, submitLabel, onSubmit, onCancel, otherEvents = [], editingId }) {
  const [state, dispatch] = useReducer(reducer, { step: 0, direction: 1, values: { ...DEFAULT_EVENT, ...initial }, errors: {} });
  const [submitting, setSubmitting] = useState(false);
  const [bannerBroken, setBannerBroken] = useState(false);
  const { step, values: v, errors, direction } = state;
  const [emailClashAlert, setEmailClashAlert] = useState(true);
  const [viewerPassword, setViewerPassword] = useState('');
  // Live date-clash detection against the user's other events.
  const clashes = useMemo(
    () => (v.startDate && v.endDate && v.endDate >= v.startDate ? detectEventClashes({ ...v, id: editingId }, otherEvents) : []),
    [v, otherEvents, editingId],
  );
  const set = (field, value) => dispatch({ type: 'set', field, value });

  const validateStep = (i) => {
    const schema = STEP_SCHEMAS[i];
    if (!schema) return true;
    const res = schema.safeParse(v);
    if (res.success) return true;
    const errs = {};
    for (const issue of res.error.issues) errs[issue.path[0]] ??= issue.message;
    dispatch({ type: 'errors', errors: errs });
    return false;
  };

  const next = () => validateStep(step) && dispatch({ type: 'next' });

  const submit = async () => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validateStep(i)) return dispatch({ type: 'goto', step: i });
    }
    setSubmitting(true);
    try {
      await onSubmit(
        { ...v, expectedAttendees: Number(v.expectedAttendees), bannerUrl: v.bannerUrl?.trim() || undefined },
        { emailClashAlert: emailClashAlert && clashes.length > 0, clashes, viewerPassword: viewerPassword.trim() },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = (k) => ({ id: k, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-error` : undefined });

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Stepper */}
      <nav aria-label="Progress" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:pb-0">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.title} className="shrink-0">
                <button
                  onClick={() => (i < step ? dispatch({ type: 'goto', step: i }) : i === step + 1 ? next() : undefined)}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                    current ? 'bg-primary/10' : 'hover:bg-muted',
                    i > step + 1 && 'cursor-default opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition',
                      done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : current
                          ? 'border-primary text-primary'
                          : 'border-border text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="hidden sm:block">
                    <span className={cn('block text-sm font-medium', current ? 'text-primary' : '')}>{s.title}</span>
                    <span className="block text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 hidden h-1.5 overflow-hidden rounded-full bg-muted lg:block">
          <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </nav>

      <Card className="overflow-hidden">
        <div className="border-b px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-0.5 text-xl font-bold">{STEPS[step].title}</h2>
        </div>

        <div className="relative min-h-[380px] overflow-hidden px-6 py-6">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -32 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <FormField label="Event title" htmlFor="title" error={errors.title}>
                    <Input
                      {...fieldProps('title')}
                      value={v.title}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder="e.g. HackSphere 2026"
                      maxLength={80}
                    />
                  </FormField>
                  <FormField label="Description" htmlFor="description" error={errors.description} hint={`${v.description.length}/1000`}>
                    <Textarea
                      {...fieldProps('description')}
                      value={v.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder="What is this event about, and who is it for?"
                      maxLength={1000}
                    />
                  </FormField>
                  <div>
                    <p className="mb-2 text-sm font-medium" id="category-label">
                      Category
                    </p>
                    <div role="radiogroup" aria-labelledby="category-label" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.keys(CATEGORY_META).map((c) => {
                        const M = CATEGORY_META[c];
                        const selected = v.category === c;
                        return (
                          <button
                            key={c}
                            role="radio"
                            aria-checked={selected}
                            onClick={() => dispatch({ type: 'category', value: c })}
                            className={cn(
                              'flex items-start gap-3 rounded-xl border p-3.5 text-left transition hover:border-primary/40',
                              selected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                              )}
                            >
                              <M.icon className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold">{M.label}</span>
                              <span className="block text-xs text-muted-foreground">{M.hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Start date" htmlFor="startDate" error={errors.startDate}>
                    <Input
                      type="date"
                      {...fieldProps('startDate')}
                      value={v.startDate}
                      onChange={(e) => {
                        set('startDate', e.target.value);
                        if (v.endDate < e.target.value) set('endDate', e.target.value);
                      }}
                    />
                  </FormField>
                  <FormField label="End date" htmlFor="endDate" error={errors.endDate}>
                    <Input type="date" {...fieldProps('endDate')} min={v.startDate} value={v.endDate} onChange={(e) => set('endDate', e.target.value)} />
                  </FormField>
                  <FormField
                    label="Daily start time"
                    htmlFor="dailyStart"
                    error={errors.dailyStart}
                    hint="Used by the scheduler to flag sessions outside event hours"
                  >
                    <Input type="time" {...fieldProps('dailyStart')} value={v.dailyStart} onChange={(e) => set('dailyStart', e.target.value)} />
                  </FormField>
                  <FormField label="Daily end time" htmlFor="dailyEnd" error={errors.dailyEnd}>
                    <Input type="time" {...fieldProps('dailyEnd')} value={v.dailyEnd} onChange={(e) => set('dailyEnd', e.target.value)} />
                  </FormField>
                  <div className="rounded-xl bg-muted/60 p-4 text-sm sm:col-span-2">
                    <span className="font-medium">{dateRange(v)}</span> · {formatTime(v.dailyStart)} – {formatTime(v.dailyEnd)} each day
                  </div>
                  <div className="sm:col-span-2">
                    <ClashPanel clashes={clashes} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Venue" htmlFor="venue" error={errors.venue} className="sm:col-span-2">
                    <Input
                      {...fieldProps('venue')}
                      value={v.venue}
                      onChange={(e) => set('venue', e.target.value)}
                      placeholder="e.g. Innovation Centre, Block C"
                    />
                  </FormField>
                  <FormField label="City" htmlFor="city" error={errors.city}>
                    <Input {...fieldProps('city')} value={v.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Bengaluru" />
                  </FormField>
                  <FormField label="Expected attendees" htmlFor="expectedAttendees" error={errors.expectedAttendees}>
                    <Input
                      type="number"
                      min={1}
                      {...fieldProps('expectedAttendees')}
                      value={v.expectedAttendees}
                      onChange={(e) => set('expectedAttendees', e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <input
                      type="range"
                      min={10}
                      max={2000}
                      step={10}
                      value={Math.min(2000, v.expectedAttendees || 10)}
                      onChange={(e) => set('expectedAttendees', Number(e.target.value))}
                      className="w-full accent-[hsl(var(--primary))]"
                      aria-label="Expected attendees slider"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <>
                  <div>
                    <p className="mb-2 text-sm font-medium" id="theme-label">
                      Theme
                    </p>
                    <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {Object.keys(THEMES).map((t) => (
                        <button
                          key={t}
                          role="radio"
                          aria-checked={v.theme === t}
                          aria-label={THEMES[t].label}
                          onClick={() => set('theme', t)}
                          className={cn('group rounded-xl p-1 transition', v.theme === t ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-border')}
                        >
                          <span className={cn('flex h-14 items-center justify-center rounded-lg bg-gradient-to-br', THEMES[t].gradient)}>
                            {v.theme === t && <Check className="h-5 w-5 text-white" />}
                          </span>
                          <span className="mt-1 block text-center text-xs">{THEMES[t].label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <FormField
                    label="Banner image URL (optional)"
                    htmlFor="bannerUrl"
                    hint="Paste a link to an image you have rights to use. Leave empty to use the theme gradient."
                  >
                    <Input
                      id="bannerUrl"
                      type="url"
                      value={v.bannerUrl ?? ''}
                      onChange={(e) => {
                        set('bannerUrl', e.target.value);
                        setBannerBroken(false);
                      }}
                      placeholder="https://…"
                    />
                  </FormField>
                  <div>
                    <p className="mb-2 text-sm font-medium">Preview</p>
                    <div className={cn('relative h-40 overflow-hidden rounded-xl bg-gradient-to-br', THEMES[v.theme].gradient)}>
                      {v.bannerUrl && !bannerBroken && (
                        <img
                          src={v.bannerUrl}
                          alt="Banner preview"
                          loading="lazy"
                          onError={() => setBannerBroken(true)}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      {bannerBroken && (
                        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 text-xs text-white">
                          <ImageOff className="h-3.5 w-3.5" /> Image failed to load
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-4 left-5 text-white">
                        <p className="text-xs opacity-80">{CATEGORY_META[v.category].label}</p>
                        <p className="text-xl font-bold">{v.title || 'Your event title'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Choose the modules this event needs. We pre-selected the usual ones for a {CATEGORY_META[v.category].label.toLowerCase()}. Your workspace
                    will start empty and guide you through setting each one up.
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {Object.keys(REQUIREMENT_META).map((k) => {
                      const on = v.requirements.includes(k);
                      return (
                        <label
                          key={k}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition hover:border-primary/40',
                            on && 'border-primary bg-primary/5',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => dispatch({ type: 'toggleRequirement', key: k })}
                            className="h-4 w-4 rounded accent-[hsl(var(--primary))]"
                          />
                          <span className="text-sm font-medium">{REQUIREMENT_META[k].label}</span>
                          {REQUIREMENT_META[k].resource && (
                            <Badge tone="muted" className="ml-auto">
                              Resource
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className={cn('relative h-32 overflow-hidden rounded-xl bg-gradient-to-br', THEMES[v.theme].gradient)}>
                    {v.bannerUrl && !bannerBroken && <img src={v.bannerUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <p className="absolute bottom-4 left-5 text-xl font-bold text-white">{v.title}</p>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      ['Category', CATEGORY_META[v.category].label, 0],
                      ['Dates', dateRange(v), 1],
                      ['Daily hours', `${formatTime(v.dailyStart)} – ${formatTime(v.dailyEnd)}`, 1],
                      ['Venue', `${v.venue}, ${v.city}`, 2],
                      ['Expected attendees', String(v.expectedAttendees), 2],
                      ['Modules', v.requirements.map((r) => REQUIREMENT_META[r].label).join(', ') || 'None', 4],
                    ].map(([k, val, s]) => (
                      <div key={k} className="rounded-lg border p-3">
                        <dt className="flex items-center justify-between text-xs text-muted-foreground">
                          {k}
                          <button className="font-medium text-primary hover:underline" onClick={() => dispatch({ type: 'goto', step: s })}>
                            Edit
                          </button>
                        </dt>
                        <dd className="mt-1 font-medium">{val}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                  <ClashPanel clashes={clashes} />
                  {clashes.length > 0 && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={emailClashAlert}
                        onChange={(e) => setEmailClashAlert(e.target.checked)}
                        className="accent-[hsl(var(--primary))]"
                      />
                      Email me a date-clash alert when I save
                    </label>
                  )}
                  {!editingId && (
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <label htmlFor="viewer-pw" className="text-sm font-semibold">
                        Event password <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                        Everyone can see this event's name and date in “All events”. People with this password can open it in view-only mode. You can change it
                        later in the Team tab.
                      </p>
                      <PasswordInput
                        id="viewer-pw"
                        value={viewerPassword}
                        onChange={(e) => setViewerPassword(e.target.value)}
                        placeholder="Leave empty to keep it private"
                        autoComplete="new-password"
                      />
                      {viewerPassword && viewerPassword.trim().length < 4 && <p className="mt-1 text-xs text-danger">Use at least 4 characters.</p>}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
          <Button variant="ghost" onClick={step === 0 ? onCancel : () => dispatch({ type: 'back' })}>
            <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting}>
              <Rocket className="h-4 w-4" /> {submitLabel}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Date-clash warnings shown while picking dates and on the review step. */
function ClashPanel({ clashes }) {
  if (!clashes.length)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> No date clashes with your other events.
      </p>
    );
  const high = clashes.some((c) => c.severity === 'high');
  return (
    <div role="alert" className={cn('rounded-xl border p-3', high ? 'border-danger/30 bg-danger/5' : 'border-warning/40 bg-warning/10')}>
      <p className={cn('mb-1.5 flex items-center gap-2 text-sm font-semibold', high ? 'text-danger' : 'text-amber-700 dark:text-amber-400')}>
        <AlertTriangle className="h-4 w-4" /> Date clash with {clashes.length} event{clashes.length > 1 ? 's' : ''}
      </p>
      <ul className="space-y-1 text-sm">
        {clashes.map((c) => (
          <li key={c.other.id} className="flex items-start gap-2">
            <Badge tone={c.severity === 'high' ? 'danger' : c.severity === 'medium' ? 'warning' : 'muted'} className="mt-0.5 capitalize">
              {c.severity}
            </Badge>
            {c.message}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-muted-foreground">You can still save — the clash will be shown on the event and in its Alerts tab.</p>
    </div>
  );
}
