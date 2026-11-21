import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarRange,
  Check,
  Clock,
  KanbanSquare,
  Layers,
  MessagesSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Badge, Button, ButtonLink } from '@/components/ui';
import { HeroMockup } from '@/features/landing/HeroMockup';
import { LandingHeader } from '@/features/landing/LandingHeader';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
};

function Section({ id, eyebrow, title, subtitle, children, className }) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-20 sm:py-28', className)}>
      <div className="container">
        <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>
          {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
        </motion.div>
        {children}
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: CalendarRange, title: 'Visual scheduler', text: 'Drag sessions across rooms and times. Room, speaker and hours conflicts are flagged instantly.' },
  { icon: KanbanSquare, title: 'Task board', text: 'A Kanban board per event with owners, priorities, deadlines and live progress.' },
  {
    icon: Boxes,
    title: 'Resources & volunteers',
    text: 'Track required vs allocated for anything — volunteers, projectors, meals — with safe concurrent claims.',
  },
  { icon: Users, title: 'Attendees & team', text: 'Import attendees from CSV with validation, manage registration status and assign responsibilities.' },
  { icon: MessagesSquare, title: 'Event chat', text: 'A real-time channel for every event with organizer announcements and unread indicators.' },
  { icon: BarChart3, title: 'Analytics', text: 'Completion, registrations, shortages and deadlines — computed from your real event data.' },
];

const STEPS = [
  { n: '01', title: 'Create an event', text: 'A guided wizard captures dates, hours, venue, size and the modules your event needs.' },
  { n: '02', title: 'Set up the workspace', text: 'Add rooms, speakers, resources and team members. Empty states walk you through each one.' },
  { n: '03', title: 'Plan the schedule', text: 'Build the timeline, drag to reschedule and resolve the conflicts EventFlow detects.' },
  { n: '04', title: 'Run it live', text: 'Coordinate tasks and chat in real time, check people in and watch analytics update.' },
];

const USE_CASES = {
  Hackathon: {
    needs: ['Mentors & judges', 'Team formation sessions', 'Labs and pitch rooms', 'Equipment & meals', 'Judging schedule'],
    blurb: '36 hours, hundreds of builders and a judging panel — all coordinated from one board.',
  },
  Conference: {
    needs: ['Multi-track sessions', 'Speakers & bios', 'Hall capacities', 'Registration desk', 'Volunteer shifts'],
    blurb: 'Run parallel tracks without double-booking a hall or a speaker.',
  },
  'College fest': {
    needs: ['Volunteer allocation', 'Stalls & activities', 'Stage equipment', 'Budgets', 'Task delegation'],
    blurb: 'Dozens of activities, one source of truth for every committee.',
  },
  Workshop: {
    needs: ['Trainers', 'Meeting rooms', 'Attendee lists', 'Materials & laptops', 'Follow-up tasks'],
    blurb: 'From a 20-seat training to a week-long bootcamp.',
  },
};

/* Example testimonials — illustrative, not from real customers. */
const TESTIMONIALS = [
  {
    name: 'Example: Student club lead',
    role: 'Robotics Society',
    text: 'We replaced four spreadsheets and a WhatsApp group. The conflict alerts alone saved our schedule.',
  },
  {
    name: 'Example: Conference producer',
    role: 'Tech meetup network',
    text: 'Seeing volunteers and equipment shortages at a glance changed how we plan the last week.',
  },
  {
    name: 'Example: HR events manager',
    role: 'Corporate L&D team',
    text: 'Every workshop gets its own workspace, so nothing from one training leaks into another.',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const [useCase, setUseCase] = useState('Hackathon');
  const ctaTo = user ? '/app' : '/signup';

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <LandingHeader />

      {/* Hero */}
      <section className="relative pt-32 sm:pt-40">
        <div className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-6 px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Smart scheduling with conflict detection
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] sm:text-6xl lg:text-7xl"
          >
            Every event, <span className="text-gradient">perfectly in flow.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Plan schedules, rooms, people and resources for hackathons, conferences, festivals and workshops — in one workspace built for organizers.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <ButtonLink to={ctaTo} size="lg" className="w-full sm:w-auto">
              Start planning free <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <a
              href="#how"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border bg-surface px-6 text-base font-medium transition hover:bg-muted sm:w-auto"
            >
              See how it works
            </a>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card · Works on desktop, tablet and mobile</p>
        </div>
        <div className="container mt-16 sm:mt-20">
          <Link
            to={user ? '/app' : '/signup'}
            aria-label={user ? 'Open your dashboard' : 'Sign up to start planning'}
            className="block rounded-2xl transition hover:-translate-y-1"
          >
            <HeroMockup />
          </Link>
        </div>
      </section>

      {/* Features */}
      <Section
        id="features"
        eyebrow="Features"
        title="Everything an organizer juggles, in one place"
        subtitle="Purpose-built modules that adapt to the kind of event you are running."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              className="group rounded-2xl border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" eyebrow="How EventFlow works" title="From idea to event day in four steps" className="bg-muted/40">
        <div className="grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="relative rounded-2xl border bg-card p-6">
              <span className="font-display text-4xl font-extrabold text-primary/20">{s.n}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              {i < STEPS.length - 1 && <ArrowRight className="absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground/50 md:block" />}
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <Section eyebrow="Why organizers switch" title="Less coordinating. More creating.">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Layers, title: 'One source of truth', text: 'Schedules, people and resources live together, so changes in one place show up everywhere.' },
            { icon: Zap, title: 'Real-time by default', text: 'Chat, allocations and tasks sync instantly across every organizer on the team.' },
            { icon: ShieldCheck, title: 'Isolated & secure', text: 'Each event is its own workspace, protected by per-event access rules.' },
          ].map(({ icon: Icon, title, text }) => (
            <motion.div key={title} {...fadeUp} className="flex gap-4 rounded-2xl p-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* About */}
      <Section
        id="about"
        eyebrow="About"
        title="About EventFlow"
        subtitle="EventFlow helps teams plan everything before the event: the schedule, rooms, speakers, attendees, resources, tasks and emails. Pick an event type to see what it sets up for you."
        className="bg-muted/40"
      >
        <div className="mx-auto max-w-4xl">
          <div role="tablist" aria-label="Event types" className="mb-8 flex flex-wrap justify-center gap-2">
            {Object.keys(USE_CASES).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={useCase === k}
                onClick={() => setUseCase(k)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition',
                  useCase === k ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30' : 'bg-card hover:bg-muted',
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={useCase}
              role="tabpanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid items-center gap-8 rounded-2xl border bg-card p-8 shadow-soft md:grid-cols-2"
            >
              <div>
                <h3 className="text-2xl font-bold">{useCase}</h3>
                <p className="mt-3 text-muted-foreground">{USE_CASES[useCase].blurb}</p>
                <ButtonLink to={ctaTo} variant="outline" className="mt-6">
                  Plan a {useCase.toLowerCase()} <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
              <ul className="space-y-3">
                {USE_CASES[useCase].needs.map((n) => (
                  <li key={n} className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm font-medium">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {n}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </Section>

      {/* Reviews */}
      <Section id="reviews" eyebrow="Reviews" title="What organizers say" subtitle="Example reviews to show the idea — not quotes from real customers.">
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              className="rounded-2xl border bg-card p-6 shadow-soft"
            >
              <Quote className="h-6 w-6 text-primary/40" />
              <blockquote className="mt-4 text-sm leading-relaxed">“{t.text}”</blockquote>
              <figcaption className="mt-5 border-t pt-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="pb-24">
        <div className="container">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 px-8 py-16 text-center text-white shadow-lift"
          >
            <div className="absolute inset-0 opacity-20 grid-bg" />
            <Clock className="relative mx-auto mb-5 h-10 w-10 opacity-80" />
            <h2 className="relative text-3xl font-extrabold sm:text-4xl">Your next event deserves a calmer week before it.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/80">Create your first workspace in under two minutes.</p>
            <ButtonLink to={ctaTo} size="lg" className="relative mt-8 bg-white text-indigo-700 shadow-none hover:bg-white/90">
              Get started <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              The smart event planning and management platform for clubs, organizations and companies.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Product</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-foreground">
                  About
                </a>
              </li>
              <li>
                <Link to="/signup" className="hover:text-foreground">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold">Account</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/login" className="hover:text-foreground">
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/app" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mt-10 flex flex-col justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} EventFlow. A university project.</p>
          <p>Built with React, TypeScript, Tailwind CSS & Firebase.</p>
        </div>
      </footer>
    </div>
  );
}
