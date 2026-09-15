# NJV Government School Voting System

School election system for **NJV Government School, Karachi**. A teacher logs in on the lab PC, enters a student's `@njv.edu.pk` email, the student votes once, then the station resets for the next student.

## Google Sheets (no PHP on lab PCs)

Keep the same React UI. Follow **`SETUP-GOOGLE.md`**: paste `google-apps-script/Code.gs` into the Sheet, run `setup`, deploy the web app, set `VITE_SHEETS_URL` in `frontend/.env`.

## Stack

- Backend: Laravel 12 API, Sanctum tokens, SQLite
- Frontend: React (Vite), Tailwind CSS, Framer Motion, Howler.js, Recharts
- Live results: short-interval vote-event polling (works on a single lab PC without Pusher)

## Default accounts

- Admin: `admin@` + `njv.edu.pk` / `admin12345`
- Teacher: `teacher@` + `njv.edu.pk` / `teacher12345`

Student emails must use the school domain `njv.edu.pk`. Example: `ahmed.001@` + that domain.

## Lab PC setup

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link
php artisan serve --host=0.0.0.0 --port=8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port=5173
```

Or from the project root:

```bash
bash start.sh
```

Open `http://<lab-pc-ip>:5173` on the polling PC. Admin live results can run on another browser tab.

## API overview

- `POST /api/teacher/login` and `POST /api/admin/login`
- `POST /api/session/start` (teacher) — validates NJV email and one-vote rule
- `GET /api/candidates?session_token=`
- `POST /api/vote` — transactional insert + unique email constraint
- `GET /api/admin/results` and `GET /api/admin/events?after_id=`
- `POST /api/admin/voting/toggle`

## Anti-fraud

- Domain regex enforced server-side
- Unique index on `votes.student_email`
- Session token is single-use and expires after 5 minutes
- Votes store IP + timestamp for audit

## Tests

```bash
cd backend
php artisan test
```
