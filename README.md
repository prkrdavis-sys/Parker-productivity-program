# Parker's Productivity Program

Parker's Productivity Program is a personal scheduling, reminder, and RPG-style productivity app. It is built for Parker first, but the database and auth model are ready for more users later.

The first version includes:

- Supabase Auth sign-up and sign-in
- A mission dashboard with due-today and overdue views
- Categories for Home Base, Career Forge, Body, Command Center, Skills, and Personal
- Quests for recurring habits
- XP, levels, ranks, streaks, and achievements
- Profile and analytics sections
- Demo mode when Supabase is not configured yet

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS v4
- Supabase Auth and Postgres
- Vercel deployment

## Local Setup

Install dependencies:

```bash
npm install
```

Create your local env file:

```bash
cp .env.example .env.local
```

Fill in these values from your Supabase project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run the migration in `supabase/migrations/0001_initial_productivity_schema.sql`.
4. Copy the project URL and anon key into `.env.local`.
5. Restart `npm run dev`.

The migration creates the app tables, seed categories, seed achievements, indexes, and row level security policies. RLS is enabled so signed-in users can only access their own tasks, habits, XP events, completions, profile, and achievement unlocks.

## Auth Notes

This app uses Supabase Auth with email and password. If your Supabase project requires email confirmation, new accounts may need to confirm by email before sign-in works.

## Deploy on Vercel

1. Push this project to GitHub.
2. Import the GitHub repo into Vercel.
3. Add the same Supabase env vars in Vercel Project Settings.
4. Deploy.

Required Vercel env vars:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
```

## Beginner Map

- `src/app/page.tsx` loads the main app.
- `src/components/productivity-app.tsx` contains the visible dashboard, forms, and interactions.
- `src/lib/types.ts` defines the data shapes.
- `src/lib/progression.ts` contains XP, level, rank, streak, and achievement logic.
- `src/lib/demo-data.ts` powers the preview mode.
- `src/lib/supabase/browser.ts` creates the Supabase browser client.
- `supabase/migrations/0001_initial_productivity_schema.sql` creates the database.
