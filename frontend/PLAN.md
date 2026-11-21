# EventFlow: Concept, Design & Engineering Plan

This document covers the eight explanation points from the brief, in order. Every section matches what is actually implemented in this codebase.

---

## 1. What EventFlow is, what problem it solves, who uses it

**EventFlow** is a centralized event planning and management platform. Organizers create an event, describe what it needs, and get a dedicated **workspace** for it. The workspace holds:

- the schedule
- speakers and rooms
- attendees
- the organizing team
- resources and volunteers
- tasks
- a group chat

**The problem.** Events are usually run from scattered spreadsheets, chat groups, documents and memory. That causes:

- double-booked rooms and speakers
- volunteer and equipment shortages discovered too late
- tasks with no owner
- no single view of whether the event is ready

**Who uses it**

- **Student clubs and societies:** hackathons, college fests, tech talks.
- **Organizations and NGOs:** conferences, community meetups.
- **Companies:** internal workshops, trainings, offsites.
- **Individual organizers:** any one-off event.

**Key principle: nothing is hard-coded.** Events are user-created. A new event starts **empty**. The choices made in the creation wizard (category and required modules) shape the workspace's setup checklist and the resources it suggests. The scheduler adapts to the event's actual dates, daily hours and rooms.

---

## 2. User journey (landing page to managing an event)

1. **Landing page (`/`).** The visitor sees the value proposition, a product preview, features, how it works, use cases and example testimonials (clearly labelled as examples). They click **Get started**.
2. **Sign up / log in (`/signup`, `/login`).** Email and password with validation and a password-strength meter. The session persists (Firebase IndexedDB persistence). Protected routes redirect back to the page the user originally asked for.
3. **First dashboard (`/app`).** An empty state explains what an event workspace is. It offers **Create your first event** or **Load sample events** (labelled sample data).
4. **Create the event (`/app/events/new`).** A 6-step wizard:
   1. Basics
   2. Date & time
   3. Venue & size
   4. Look & feel
   5. Requirements
   6. Review

   Each step is validated before moving on. Picking a category pre-selects typical modules.
5. **Workspace overview (`/app/events/:id`).** The **setup checklist** shows only the steps this event needs (rooms → speakers → schedule → resources → team → tasks → attendees). Each step links to its tab.
6. **Set up the event:**
   - add rooms and speakers
   - build the schedule by drag-and-drop and fix the conflicts EventFlow flags
   - define resources and assign volunteers
   - invite the team and create tasks
   - import attendees from CSV
7. **Run the event:**
   - move tasks across the Kanban board
   - chat with the team in real time and post organizer announcements
   - check attendees in
   - watch the dashboard and analytics update live
8. **Work across events.** Switch events from the sidebar, the header switcher or the Ctrl/⌘+K search. The **calendar** and **analytics** pages aggregate every event.

---

## 3. Pages: purpose, features, design

| Page | Purpose | Key features | Design notes |
|---|---|---|---|
| **Landing** | Convert visitors | Sticky glass nav, hero with gradient headline, animated dashboard mockup, 6 feature cards, 4-step "how it works", benefits, tabbed use cases, example testimonials, CTA band, footer, theme toggle | Faint grid background with radial mask; scroll-reveal animations (`whileInView`, once only); generous whitespace |
| **Login / Signup** | Authentication | Zod validation, show/hide password, inline errors with `aria-describedby`, loading buttons, friendly Firebase error messages, demo account in sample mode | Split screen: form on the left, brand gradient panel on the right (hidden on mobile) |
| **Dashboard** | "What needs my attention?" | Personalized greeting banner; Total / Upcoming / Active / Completed cards (each clickable → filtered list); readiness bars per event; mini calendar; tasks-by-event chart; event-mix donut; upcoming sessions; deadlines with urgency badges; resource shortages; recent activity; quick actions | 12-column responsive grid, cards with soft shadows, colour-coded status |
| **Events list** | Browse and manage | Status tabs synced to the URL, category filter, debounced search, sort, animated card grid, edit/delete menu with confirmation | Theme-gradient card headers, readiness progress |
| **Create / Edit event** | Structured data entry | `useReducer` stepper, per-step Zod validation, animated step transitions, category cards, theme swatches, banner preview with lazy image and fallback, editable review | Sticky vertical stepper on desktop, horizontal on mobile |
| **Workspace** | One event's control center | Themed header (banner, status, sample badge, event switcher, edit), tab bar with unread chat badge, code-split tabs | Tabs underline the active section; header uses the event's theme |
| **Overview tab** | Event health | Countdown, attendee / task / resource stats, guided setup checklist, event info, next sessions, health check (conflicts, shortages, overdue tasks) | |
| **Schedule tab** | Interactive scheduler | Day tabs, **by-room timeline** (rooms × time) with drag-and-drop between rooms and times (15-min snap), double-click to create, **by-time agenda** view, live conflict panel, session dialog with live conflict preview | Out-of-hours areas hatched; conflicts get a red ring and warning icon |
| **Speakers & Rooms tab** | Venue and people | Room list (capacity, location, session count), speaker cards (bio, email, session count), CRUD dialogs; deleting cleans up session references | |
| **Attendees tab** | Registration | Stats and capacity bar, debounced and deferred search, status/ticket filters, sortable columns, **virtualised** table, inline status change, add dialog with duplicate check, **CSV import** (drag-drop or paste, row-level validation, duplicate skipping, preview), CSV export | |
| **Team tab** | Organizers | Member cards with role, responsibilities and task workload | |
| **Resources tab** | Required vs allocated | Stats, suggested resources from the event's requirements, cards with required / allocated / remaining, status badge and progress, per-person or per-vendor allocations, "claim a slot for myself" (**transaction**), release | Red / amber / green shortage tones |
| **Tasks tab** | Kanban | To Do / In Progress / Completed columns, drag between and within columns (dnd-kit sortable, keyboard accessible), **optimistic** writes with rollback, search, priority and assignee filters, completion stats, overdue highlighting | Slight tilt on the drag overlay; due-date urgency colours |
| **Chat tab** | Communication | Real-time listener, bubbles grouped by author, day separators, "New messages" divider, pinned latest announcement, organizer-only announcements, optimistic sending, Enter/Shift+Enter, load older on scroll-up (pagination), jump-to-latest button | |
| **Calendar** | Cross-event calendar | Month grid with events, sessions and deadlines toggles; day detail panel | |
| **Analytics** | Reports | Scope selector (all or one event); KPIs; cumulative registrations; task completion radial; completion per event; registration status donut; people allocation stacked bars; distribution; shortages table; deadlines | Recharts with a shared palette and a custom tooltip that works in both themes |
| **Settings** | Preferences | Profile, light / dark / system theme, data mode indicator, remove all sample events | |

---

## 4. Design system

**Direction:** calm, premium SaaS. Gradients only on brand surfaces (hero, welcome banner, event headers); everything else is neutral.

**Colour palette** (HSL CSS variables in `src/index.css`, switched by the `.dark` class)

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | Indigo 600 `243 75% 59%` | `239 84% 67%` | actions, active nav, focus rings |
| `accent` | Sky 500 | Sky 400 | highlights, secondary charts |
| `success` / `warning` / `danger` | Emerald / Amber / Rose | brighter variants | status, progress tones, conflicts |
| `background` / `card` / `muted` / `border` | cool slate neutrals | deep navy neutrals | surfaces |

- **Event themes:** six gradient presets (Indigo, Ocean, Sunset, Forest, Rose, Slate), each with a swatch colour used for calendar and sidebar dots.
- **Chart palette:** indigo, sky, emerald, amber, rose, violet.

**Typography**

- **Plus Jakarta Sans** (600–800) for headings.
- **Inter** for UI text.
- Scale: 12 / 14 / 16 / 20 / 24–28 / 48–72 (hero).

**Shape and depth**

- Radius: 10px for controls, 14–18px for cards, 24px for hero blocks.
- Shadows: two levels, `shadow-soft` for resting and `shadow-lift` for hover, overlays and modals.

**Motion** (Motion library)

- 150–250 ms ease-out for UI.
- Springs for dialogs and drawers.
- Scroll reveals run only once.
- `prefers-reduced-motion` is respected.

**Layout**

- Collapsible 264 → 76 px sidebar (the state is remembered); it becomes an off-canvas drawer below 1024 px.
- Sticky glass top bar.
- Content max width 1440 px.

**Components** (`components/ui`): Button (variants, sizes, loading), Card, Input, Textarea, Select, FormField (label, error, hint, ARIA), Badge (tones), Progress, Avatar (deterministic colour), Skeleton (shimmer), EmptyState, PageHeader, Dialog and ConfirmDialog (portal, focus trap), Dropdown (keyboard menu), Toasts (portal).

---

## 5. Advanced React concepts: where and why

| Concept | Where | Why it's there |
|---|---|---|
| JavaScript + JSX | everywhere | Plain JS with JSDoc comments; Zod schemas validate data at runtime
| Functional components and hooks | everywhere | |
| `useState` / `useEffect` | all features | |
| `useRef` | Dialog focus restore, chat scroll position, Kanban pending-write counter, dropdown items | DOM access and mutable values that shouldn't re-render |
| `useMemo` | conflict detection, analytics aggregation, filtered lists, calendar items | Expensive derivations recomputed only when inputs change |
| `useCallback` | context actions (`add` / `update` / `remove`), toast API, scheduler `onMove` | Stable references, so memoised children don't re-render |
| **Custom hooks** | `useCollection`, `useEventsOverview`, `useDebounce`, `useMediaQuery`, `useUnread` | Reusable real-time and data logic |
| **React Router** | `App.jsx`, nested workspace routes, URL-synced filters (`?status=`) | |
| **`React.lazy` + `Suspense`, route-based code splitting** | every page and every workspace tab | The build splits into ~40 chunks; heavy libraries (recharts, firebase, dnd-kit, motion) are vendor chunks |
| **Context API** | `AuthContext`, `ThemeContext`, `ToastContext`, `EventsContext`, `WorkspaceContext` | Shared state without prop drilling. `WorkspaceProvider` is keyed by event id, so switching events can't mix data |
| **Form validation (React Hook Form + Zod)** | auth, sessions, tasks, rooms, speakers, resources, attendees, team | One schema per form, reused for CSV rows |
| **`useReducer`** | `EventWizard` | Step navigation, field updates, category presets and per-step errors in one predictable reducer |
| **`useTransition`** | scheduler day switching | Keeps the tab click responsive while the timeline re-renders |
| **`useDeferredValue`** | attendee search, global event search, events list | Filtering thousands of rows doesn't block typing |
| **`React.memo`** | `StatCard`, `EventCard`, `SessionBlock`, `ResourceCard`, `SortableTaskCard` | Live listeners re-render often; cards only re-render when their props change |
| **Protected routes** | `ProtectedRoute` / `PublicOnlyRoute` | Waits for the first auth state to avoid flicker; remembers the intended URL |
| **Error boundaries** | the root, and around each workspace | A crash in one module shows a recoverable card |
| **Portals** | `Dialog`, toasts → `#portal-root` | Escape overflow and stacking contexts; focus trap, Esc, scroll lock |
| **dnd-kit** | scheduler (`useDraggable` / `useDroppable`), Kanban (`@dnd-kit/sortable`) | Pointer and **keyboard** drag (Space to pick up, arrows to move) |
| **Firestore real-time listeners** | all workspace data, events list, chat, activity | |
| **Optimistic UI** | Kanban moves (with rollback), scheduler drops, chat sending | |
| **Pagination / infinite scroll** | chat history: `limitToLast(n)` cursor that grows by 30 when you scroll to the top, with the scroll position preserved | |
| **Debounced search** | `useDebounce` in the events list, tasks and attendees | |
| **Virtualised list** | attendees table (`@tanstack/react-virtual`) | Only visible rows are in the DOM |
| **Lazy image loading** | event banners (`loading="lazy"`, `decoding="async"`, error fallback) | |
| **Accessibility** | labelled controls, `aria-invalid` / `describedby`, roles for tabs, radios and menus, focus-visible rings, keyboard menus and drag, live regions in chat and toasts, reduced motion | |
| **Testing** | Vitest + Testing Library | Unit tests (conflicts, CSV, backend transaction) and an integration test (wizard) |

---

## 6. Component architecture and folder structure

```
src/
├─ main.jsx                    Providers: ErrorBoundary → Router → Theme → Toast → Auth
├─ App.jsx                     Lazy routes, Protected/PublicOnly guards
├─ components/
│  ├─ ui/                      Design-system primitives (no app knowledge)
│  ├─ common/                  App-aware shared components
│  └─ layout/                  AppLayout (EventsProvider), Sidebar, Topbar
├─ context/                    Auth, Theme, Toast, Events
├─ features/                   Feature modules (UI + feature logic)
│  ├─ workspace/               WorkspaceContext, useUnread, overview/, venue/
│  ├─ scheduler/  tasks/  resources/  attendees/  team/  chat/  events/  landing/
├─ hooks/                      Generic hooks
├─ lib/                        Pure logic: conflicts, analytics, time, csv, constants
├─ pages/                      Route components (thin; compose features)
├─ schemas/                    Zod schemas
├─ services/                   Data layer (see §7)
└─ types/                      Domain types
```

**Composition pattern**

- **Pages** compose **features**.
- Features read from **contexts** and call the **service layer** only through context actions or `backend`.
- **Pure logic** lives in `lib/` and is unit-tested.
- No component imports Firestore directly.

---

## 7. Firestore design and integration

```
users/{uid}                         profile
users/{uid}/activity/{id}           recent activity feed (dashboard)
events/{eventId}                    ownerId, memberIds[], title, category, dates, dailyStart/End,
                                    venue, city, expectedAttendees, theme, bannerUrl, requirements[], isSample
events/{eventId}/rooms/{id}
events/{eventId}/speakers/{id}
events/{eventId}/sessions/{id}      day, start, end, roomId, speakerIds[]
events/{eventId}/tasks/{id}         status, priority, assigneeId, dueDate, order
events/{eventId}/resources/{id}     required, allocated
events/{eventId}/allocations/{id}   resourceId, assignee, quantity
events/{eventId}/attendees/{id}
events/{eventId}/team/{id}
events/{eventId}/messages/{id}      authorId, text, isAnnouncement, createdAt
```

**Why sub-collections.** Each event's data is physically scoped under it. That gives:

- natural isolation between events
- simple security rules (check membership on the parent event)
- cheap per-event listeners

**Service abstraction** (`services/types.ts`): one `DataBackend` interface with generic `subscribeSub` / `addSub` / `updateSub` / `removeSub` / `addSubBatch` methods, plus `claimResource` and `releaseAllocation`. There are two implementations:

- `firestoreBackend`: `onSnapshot` listeners, `writeBatch` for imports and cascading deletes, `runTransaction` for allocation, IndexedDB offline cache.
- `sampleBackend`: the same contract on local storage, used only when Firebase isn't configured. It is clearly labelled in the UI, and cross-tab `storage` events make chat "live" between tabs.

The backend is chosen once in `services/index.ts`. Swapping it requires no UI changes.

**Transactions.** `claimResource` reads the resource, checks `allocated + qty <= required`, then increments the count and writes the allocation record atomically. If two organizers claim the last volunteer slot at once, one transaction is retried and fails cleanly. The unit test checks this against the sample backend. The security rules also enforce `allocated <= required`.

**Security rules** (`firestore.rules`)

- Users can access only their own profile and activity.
- An event and all its sub-collections are readable and writable only by its `memberIds`.
- Only the owner can delete an event or change its membership.
- Messages must be authored by the requester; announcements are owner-only; messages are not editable.
- Resource counts are validated.

**Credentials.** Only `VITE_FIREBASE_*` env variables are used; nothing is hard-coded. `.env` is git-ignored.

**Sample data.** `services/sampleData.ts` seeds through the same API (so it works against Firestore too). It sets `isSample: true` and a "Sample:" title prefix and shows a badge. Sample events can be removed in one click from Settings.

---

## 8. Development roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Vite + TS + Tailwind setup, design tokens, UI primitives, layout shell, theming | ✅ |
| 2 | Landing page, auth UI, protected routing | ✅ |
| 3 | Service abstraction, sample backend and seed data, Events and Workspace contexts | ✅ |
| 4 | Dashboard, events list, creation/edit wizard | ✅ |
| 5 | Workspace: overview, speakers & rooms, scheduler with conflict detection and dnd | ✅ |
| 6 | Resources (transactions), Kanban tasks (optimistic), team, attendees (CSV, virtualised), chat | ✅ |
| 7 | Calendar, analytics, settings | ✅ |
| 8 | Firestore backend, security rules, Firebase Auth | ✅ (connect your project via `.env`) |
| 9 | Tests (22), production build, Netlify config, docs | ✅ |
| Next (optional) | Invite other organizers by email (add to `memberIds`), Firestore emulator tests for rules, Storage uploads for banners, PDF report export, PWA offline shell | ideas |

**Suggested demo script (about 5 minutes)**

1. Landing page: toggle the theme.
2. Log in with the demo account; walk through the dashboard.
3. Open HackSphere. On **Schedule**, show the red conflict, drag "Ask Me Anything" to a free slot, and watch the conflict clear.
4. **Resources:** click "Claim a slot" until it's full and show the transaction error.
5. **Tasks:** drag a card to Completed; the stats update.
6. **Chat:** open two tabs and send a message; it appears live.
7. **Attendees:** import the example CSV, including an invalid row.
8. **Analytics.**
9. Create a new event with the wizard and show the empty, guided workspace.

---

## 9. Version 2 additions: backend, AI, email alerts, calendar

The project is now split into `frontend/` (this app) and `backend/` (Node + Express). See the root `README.md` for setup.

| Addition | Frontend | Backend | Advanced concepts shown |
|---|---|---|---|
| AI event planner | `features/ai/AiPlanner.jsx`: describe the event, preview the plan, apply it to the wizard (remounted via `key`), and optionally create starter rooms, sessions, tasks and resources (`createExtras.js`) | `POST /api/ai/generate-event`: Gemini structured JSON output (response schema), validated with Zod | Controlled remount with `key`, async UI states |
| AI briefing | `features/ai/AiBriefing.jsx` on Overview | `POST /api/ai/explain-event` | Derived stats with `useMemo` |
| Date-clash detection | `lib/eventClashes.ts` (pure + tested), live in the wizard, badges on cards, Overview health check, Alerts tab | `date-clash` email template | Pure functions + memoisation |
| Email alerts & history | `features/alerts/*`: digest / invite / reminder composer, recipients from the team, history stored in the `events/{id}/notifications` sub-collection, toast "email sent" alerts with a preview link | Mailgun HTTP API or a preview outbox; HTML templates; `.ics` attachment | Custom hooks (`useEmail`, `useEventAlerts`) |
| Task assignment email | Checkbox in `TaskDialog` when the assignee changes | `task-assigned` template | |
| Google Calendar | `features/calendar/CalendarMenu.jsx`: template link and `.ics` download | Google Calendar template links + .ics export (no OAuth needed) | Cross-window messaging, popup-blocker-safe flow |
| Multiple organizers & roles | `features/team/OrganizersCard.jsx`, `EventsContext` (auto-join), `services/*Backend.js` (`inviteOrganizer`, `acceptInvite`, `removeMember`, `transferOwnership`) | `firestore.rules`: admin = `ownerId`, organizers = `memberIds`, invitees = `invites` (by email); four separate update rules (edit details / admin manages access / invitee accepts / organizer leaves) | Real-time listeners on two queries (`memberIds` and `invites`), set-based rule validation |
| Secure API calls | `services/api.ts` exchanges the Firebase ID token for a backend JWT (`/api/auth/session`) | `backend/lib/auth.js` verifies it with Firebase Admin (`serviceAccountKey.json`) and signs a JWT with `JWT_SECRET`; Helmet, CORS allow-list, rate limits, Zod validation, central error handler | |
