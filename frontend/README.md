# EventFlow: Smart Event Planning & Management Platform

EventFlow is a React web app (mostly JSX, with a few TypeScript files) for planning and running events: hackathons, conferences, college festivals, workshops and meetups. Each event has its own workspace with these sections:

- Overview
- Schedule (drag-and-drop, with conflict detection)
- Speakers & rooms
- Attendees (CSV import)
- Team
- Resources and volunteers
- Kanban tasks
- Real-time chat

There are also cross-event dashboard, calendar and analytics pages.

> The full concept, user journey, design system, architecture and roadmap are in **[PLAN.md](./PLAN.md)**.
>
> This folder is the **frontend**. The AI planner, email alerts and Google Calendar sync need the **backend** in `../backend`; see the root `README.md`. Run both from the project root with `npm run dev`.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

The first time you run it **without Firebase keys**, the app starts in **Sample Data Mode**:

- Data is stored in your browser.
- An amber banner says so on every page.
- The login page has a **"Try the demo account"** button, which loads three events labelled **Sample:** with a "Sample data" badge.

You can explore every feature this way. Once you add Firebase keys (below), the app switches to Firestore automatically. You don't need to change any code.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc`) and production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest unit and component tests |

## Connecting Firebase (Auth + Cloud Firestore)

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method →** enable **Email/Password**.
3. **Firestore Database →** create a database (production mode).
4. **Project settings → Your apps →** add a **Web app** and copy its config.
5. `cp .env.example .env` and fill in the values:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

6. Deploy the security rules:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules
   ```

7. `npm run dev`, sign up, then use **Load sample events** on the empty dashboard if you want demo data in Firestore. It is labelled as sample data and can be removed from Settings.

> Firebase web config values are public identifiers, not secrets. Access is enforced by `firestore.rules`. `.env` is git-ignored, so no credentials are hard-coded or committed.

## Deploying to Netlify

`netlify.toml` already configures:

- the build command (`npm run build`) and publish directory (`dist`)
- Node 20
- the **React Router SPA fallback** (`/* → /index.html 200`), so deep links like `/app/events/abc/schedule` work on refresh. `public/_redirects` is included as a backup.
- long-term caching for hashed assets, plus basic security headers

**Option A: Git**

1. Push the repo to GitHub.
2. In Netlify, choose **Add new site → Import from Git** and pick the repo.
3. **Site settings → Environment variables:** add every `VITE_FIREBASE_*` variable from `.env.example`.
4. Deploy.
5. In Firebase, go to **Authentication → Settings → Authorized domains** and add your `*.netlify.app` domain.

**Option B: CLI**

```bash
npm i -g netlify-cli
netlify login
netlify init                        # or: netlify link
netlify env:set VITE_FIREBASE_API_KEY "..."   # repeat for each variable
netlify deploy --build --prod
```

If you deploy without the variables, the live site runs in Sample Data Mode. That is useful for a quick demo link.

## Project structure

```
src/
  App.jsx                 routes (React.lazy + Suspense, protected routes)
  main.jsx                providers + root error boundary
  components/
    ui/                   design-system primitives (Button, Card, Dialog via portal, Dropdown…)
    common/               shared app components (StatCard, EventCard, MonthCalendar, ErrorBoundary…)
    layout/               AppLayout, collapsible Sidebar, Topbar with Ctrl+K search
  context/                Auth, Theme, Toast, Events (shared real-time state)
  features/
    landing/              hero mockup
    events/               multi-step EventWizard (useReducer)
    workspace/            WorkspaceContext (per-event listeners), overview, speakers & rooms
    scheduler/            timeline grid (dnd-kit), session dialog with live conflict preview
    tasks/                Kanban board (dnd-kit sortable, optimistic updates)
    resources/            resource cards with transactional allocation
    attendees/            virtualised table, CSV import/export
    team/                 team members and workload
    chat/                 real-time chat, announcements, unread markers, paginated history
  hooks/                  useCollection, useEventsOverview, useDebounce, useMediaQuery
  lib/                    conflicts (pure + tested), analytics, time, csv, constants, utils
  pages/                  route-level pages
  schemas/                Zod validation schemas
  services/               DataBackend interface + Firestore & Sample implementations, auth, seed data
  types/                  domain model
firestore.rules           security rules
netlify.toml              deployment config
```

## Tests

```bash
npm test
```

There are 29 tests:

- scheduling conflict detection (room, speaker, hours, dates, invalid ranges)
- CSV parsing and validation
- data-backend behaviour, including **concurrent claims never over-allocating the last slot**
- an integration test of the event creation wizard (step validation and submit)
- event date-clash detection and calendar link / `.ics` generation
