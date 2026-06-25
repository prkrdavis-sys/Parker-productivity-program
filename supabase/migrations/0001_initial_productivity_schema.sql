create extension if not exists pgcrypto;

create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.task_status as enum ('pending', 'completed', 'archived');
create type public.habit_cadence as enum ('daily', 'weekly', 'custom');
create type public.xp_source_type as enum ('task', 'habit', 'achievement');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Parker',
  avatar_initials text not null default 'P',
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  color text not null default '#d6a84f',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.task_categories(id) on delete set null,
  title text not null,
  notes text,
  status public.task_status not null default 'pending',
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  scheduled_for date,
  xp_value integer not null default 25 check (xp_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.task_categories(id) on delete set null,
  title text not null,
  cadence public.habit_cadence not null default 'daily',
  xp_value integer not null default 25 check (xp_value >= 0),
  active boolean not null default true,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete cascade,
  completed_at timestamptz not null default now(),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  constraint task_or_habit_completion check (
    (task_id is not null and habit_id is null)
    or (task_id is null and habit_id is not null)
  )
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type public.xp_source_type not null,
  source_id uuid,
  points integer not null check (points >= 0),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  xp_bonus integer not null default 0 check (xp_bonus >= 0),
  unlock_kind text not null,
  unlock_threshold integer not null default 1 check (unlock_threshold >= 1)
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index tasks_user_status_due_idx on public.tasks (user_id, status, due_at);
create index tasks_user_scheduled_idx on public.tasks (user_id, scheduled_for);
create index habits_user_active_idx on public.habits (user_id, active);
create index completions_user_completed_idx on public.task_completions (user_id, completed_at desc);
create index xp_events_user_created_idx on public.xp_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.task_completions enable row level security;
alter table public.xp_events enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy "Profiles are owned by the signed in user"
on public.profiles for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can read default and owned categories"
on public.task_categories for select
to authenticated
using (user_id is null or user_id = auth.uid());

create policy "Users can manage owned categories"
on public.task_categories for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage owned tasks"
on public.tasks for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage owned habits"
on public.habits for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage owned completions"
on public.task_completions for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage owned xp events"
on public.xp_events for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Achievements are readable by signed in users"
on public.achievements for select
to authenticated
using (true);

create policy "Users can manage owned achievement unlocks"
on public.user_achievements for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into public.task_categories (user_id, name, slug, description, color, sort_order)
values
  (null, 'Home Base', 'home-base', 'House work, repairs, resets, and personal environment.', '#d6a84f', 1),
  (null, 'Career Forge', 'career-forge', 'Deep work, job growth, portfolio, and professional moves.', '#9fa86d', 2),
  (null, 'Body', 'body', 'Training, recovery, nutrition, and health maintenance.', '#b9835a', 3),
  (null, 'Command Center', 'command-center', 'Bills, planning, admin, calendar, and logistics.', '#7f8d74', 4),
  (null, 'Skills', 'skills', 'Learning, practice, reading, and deliberate improvement.', '#b6a26d', 5),
  (null, 'Personal', 'personal', 'Relationships, recovery, errands, and life maintenance.', '#a87562', 6);

insert into public.achievements (code, name, description, xp_bonus, unlock_kind, unlock_threshold)
values
  ('first-win', 'First Win', 'Complete your first mission.', 25, 'total_completions', 1),
  ('ten-count', 'Ten Count', 'Complete ten missions.', 75, 'total_completions', 10),
  ('three-day-streak', 'Three-Day Streak', 'Log wins three days in a row.', 100, 'current_streak', 3),
  ('high-stakes', 'High Stakes', 'Complete five critical missions.', 125, 'critical_completed', 5),
  ('level-keeper', 'Level Keeper', 'Earn 1,000 XP.', 150, 'total_xp', 1000);
