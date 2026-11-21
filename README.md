# EventFlow: Smart Event Planning & Management

```
task hd/
├─ frontend/                React (JSX + a few TypeScript files) + Vite + Tailwind
│  └─ .env                  Firebase web config (+ VITE_API_URL when deployed)
└─ backend/                 Node + Express
   ├─ server.js             API routes
   ├─ firebaseAdmin.js      verifies Firebase logins
   ├─ serviceAccountKey.json  ← you add this (Firebase service account key)
   ├─ config.js             reads .env
   ├─ lib/                  ai.js (Gemini) · mailer.js (Mailgun) · auth.js (JWT) · emailTemplates.js · ics.js
   └─ .env                  PORT, JWT_SECRET, GEMINI_API_KEY, GEMINI_MODEL, MAILGUN_API_KEY, MAILGUN_DOMAIN
```

| Part | Uses |
|---|---|
| **Frontend** | Firebase **Authentication** (login) and **Cloud Firestore** (all event data, real-time) |
| **Backend** | **Gemini** (AI planner and event briefing), **Mailgun** (emails), **Firebase Admin** (verifies logins), and a **JWT** signed with `JWT_SECRET` (API sessions) |

## Run it (VS Code → Terminal → New Terminal, in `task hd`)

```bash
npm run install:all     # first time only
npm run dev             # starts backend (5050) + frontend (5173)
```

You'll see:
```
[backend]  EventFlow API running at http://localhost:5050
[frontend] ➜  Local:   http://localhost:5173/
```
Open **http://localhost:5173**. Backend health check: **http://localhost:5050/api/health**

| Command | Does |
|---|---|
| `npm run dev` | Backend and frontend together |
| `npm test` | Backend (10) and frontend (30) tests |
| `npm run build` | Production build of the frontend |

## Keys

### `frontend/.env`
Copy these from **Firebase Console → Project settings → Your apps → Web app → Config**, without quotes:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=            # leave empty locally
# VITE_FIREBASE_DATABASE_ID=   # only if your Firestore database is NOT called "(default)"
```

### `backend/.env`
```
PORT=5050                # not 5000: macOS uses 5000 for AirPlay
JWT_SECRET=any-long-random-string
GEMINI_API_KEY=          # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-3.8-flash
MAILGUN_API_KEY=         # Mailgun → API keys
MAILGUN_DOMAIN=          # just the domain, e.g. sandboxXXXX.mailgun.org (a pasted dashboard URL also works)
```
Any key you leave empty switches that feature to a safe fallback:
- **No Gemini key:** the AI buttons show "Gemini is not set up" until you add `GEMINI_API_KEY`.
- **No Mailgun keys:** emails are saved as previews you can open in the browser.

**Mailgun sandbox note:** a sandbox domain can only send to addresses added under **Authorized Recipients** in Mailgun. Add your test emails there.

### `backend/serviceAccountKey.json`
Go to **Firebase Console → Project settings → Service accounts → Generate new private key**. Save the downloaded file as `backend/serviceAccountKey.json`.
- With this file, the backend **verifies real Firebase logins** before issuing its JWT.
- Without it, the backend runs in development mode.

> `.env` files and `serviceAccountKey.json` are in `.gitignore`. Never commit or share them.

## Firebase setup (once)
1. **Authentication → Sign-in method → Email/Password → Enable.**
2. **Firestore Database → Create database.** Keep the Database ID as **(default)**, pick a location (e.g. `asia-south1`), start in **production mode**.
   - If you skip this, saving shows *"The database (default) does not exist"* and buttons keep spinning.
3. **Firestore → Rules:** paste the contents of `frontend/firestore.rules`, then click **Publish**. Do this again whenever the rules file changes.

## How login and API calls work
1. The user logs in with **Firebase Authentication** in the frontend.
2. The frontend sends its Firebase ID token to `POST /api/auth/session`.
3. The backend verifies the token with **Firebase Admin** (`serviceAccountKey.json`) and returns a **JWT signed with `JWT_SECRET`**, valid for 2 hours.
4. Every AI or email request sends that JWT. All event data goes straight from the frontend to **Firestore**, protected by `firestore.rules`.

## Features
- Dashboard, events, calendar, analytics, settings, dark/light mode, lazy-loaded pages.
- Event workspace with tabs for overview, schedule, speakers and rooms, attendees (CSV), team, resources, tasks, chat, and alerts and email.
- **Drag-and-drop scheduler** with room, speaker and hours conflict detection.
- **Date-clash detection** between your events.
- **AI planner** (Gemini): describe an event and get a full draft.
- **AI briefing** (Gemini): a summary, risks and next steps for an event.
- **Emails via Mailgun**: alert digests, invitations with an `.ics` attachment, reminders, task assignments and date-clash alerts.
  - They're sent as **"Your Name via EventFlow"**, with **Reply-To** set to the person who sent them.
- **Role-based access** (enforced on the server by `firestore.rules`):
  | Role | Who | Can do |
  |---|---|---|
  | **Admin** | Whoever created the event | Everything: edit, invite/remove organizers, set the event password, remove viewers, delete |
  | **Organizer** | People the admin invites by email (Team tab) | Edit the plan: schedule, rooms, attendees, resources, tasks, chat, emails |
  | **Viewer** | Any logged-in user who enters the event password | **View only**: overview, schedule, speakers & rooms, resources, tasks. No attendees, team, chat or emails |
  | **Everyone else** | Any logged-in user | Sees the event's name, date and venue in **All events**, but can't open it without the password |
  - The admin sets the password when creating the event or later in **Team → Event password & viewers**.
- **Attendees for planning, not check-in:** import hundreds of students and parents from a CSV (`name, email, department, type`). There is no attendance status — EventFlow is for everything *before* the event.
- **Google Calendar**: "Add to Google Calendar" links and an `.ics` download with all sessions.

## Deploy
- **Frontend on Netlify.** Base directory `frontend`, build command `npm run build`, publish directory `frontend/dist`. Set the `VITE_FIREBASE_*` variables and `VITE_API_URL`.
- **Backend on Render.** Root directory `backend`, build command `npm install`, start command `npm start`. Set these environment variables:
  - everything from `backend/.env`
  - `NODE_ENV=production`
  - `ALLOW_INSECURE_DEV=false`
  - `APP_URL` = the Netlify URL
  - `API_URL` = the Render URL
  - `CORS_ORIGINS` = the Netlify URL
  - `FIREBASE_SERVICE_ACCOUNT` = the service account JSON on one line
