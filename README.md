# 3G's Pickle Grove — Court Schedule

Single-court schedule site for 3G's Pickle Grove. Players view open slots; bookings happen on Facebook Messenger.

## Features
- Branded landing page
- Public “See available schedules” (slots posted by staff)
- Message on Facebook to book
- Admin schedule board: open / booked / clear slots

## Database (Postgres)

This app uses **PostgreSQL** (required for deploy; SQLite is no longer used).

### Option A — Local with Docker
```bash
docker compose up -d
```
Then in `.env`:
```
DATABASE_URL="postgresql://pickle:pickle@localhost:5432/pickle_grove?schema=public"
```

### Option B — Free hosted (Neon) — best for deploy
1. Create a project at [https://neon.tech](https://neon.tech)
2. Copy the connection string
3. Put it in `.env` as `DATABASE_URL` (add `?sslmode=require` if missing)

### Apply schema + seed
```bash
npx prisma db push
npm run db:seed
npm run dev
```

### Local backup (Docker Postgres)
```bash
docker compose exec -T db pg_dump -U pickle pickle_grove > backup-$(date +%Y%m%d).sql
```

## Setup
```bash
cp .env.example .env
# set DATABASE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

### Admin tips
- Tap a slot: **Off → Available → Booked → Off**
- **Open all day** posts remaining standard hours (through 10 PM)
- **Add hours** unlocks 11 PM → 7 AM one at a time; **Hide hours** collapses them again
- Optional note / prompt for player name from Messenger

## Deploy (production)

1. **Host** the Next app (Vercel, Railway, Render, etc.).
2. **Postgres** — use Neon/Supabase (same `DATABASE_URL` style as above).
3. Set env on the host:
   - `DATABASE_URL` — Postgres connection string
   - `ADMIN_PASSWORD` — strong password
   - `ADMIN_SESSION_SECRET` — long random string
4. Build runs `prisma generate` then `next build`. Run `npx prisma db push` (or migrate) against Postgres once (Vercel: add a build command that includes it, or push from your machine).
5. Set env `TZ=Asia/Manila` on the host (also in `.env`). Slot times are locked to Philippines time in code.
