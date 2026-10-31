-- Core schema (SPEC.md, "סכמת מסד הנתונים").
-- Templates are plans; sessions are what actually happened. A session is a detached
-- copy of a template, and all history is keyed by the performed exercise_id.

-- enums
create type muscle_group as enum ('chest','back','shoulders','biceps','triceps','legs','glutes','core','full_body','cardio');
create type equipment as enum ('machine','barbell','dumbbell','cable','bodyweight','kettlebell','band','other');
create type session_status as enum ('in_progress','completed');
create type goal_type as enum ('fixed_days','cycle');
create type challenge_status as enum ('active','succeeded','failed');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,  -- null = built-in
  name_he text not null,
  name_en text,
  muscle_group muscle_group not null,
  equipment equipment not null,
  instructions_he text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references workout_templates on delete cascade,
  exercise_id uuid not null references exercises,
  position int not null,
  planned_sets int not null default 3 check (planned_sets between 1 and 10),
  rep_range_min int,
  rep_range_max int,
  note text
);

create table template_exercise_alternatives (
  id uuid primary key default gen_random_uuid(),
  template_exercise_id uuid not null references template_exercises on delete cascade,
  exercise_id uuid not null references exercises,
  position int not null,
  unique (template_exercise_id, exercise_id)
);

create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid references workout_templates on delete set null, -- null = free workout
  template_name text,                  -- snapshot of the name at start
  session_date date not null,          -- user's local date at start
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status session_status not null default 'in_progress',
  note text
);
-- at most one in-progress session per user
create unique index one_active_session on workout_sessions (user_id) where status = 'in_progress';

create table session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions on delete cascade,
  exercise_id uuid not null references exercises,            -- performed
  replaced_exercise_id uuid references exercises,            -- original, if swapped
  template_exercise_id uuid references template_exercises on delete set null,
  position int not null,
  note text
);

create table session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references session_exercises on delete cascade,
  set_number int not null,
  weight_kg numeric(6,2) check (weight_kg >= 0),
  reps int check (reps between 0 and 999),
  is_done boolean not null default false,
  unique (session_exercise_id, set_number)
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type goal_type not null,
  training_weekdays int[],             -- fixed_days: 0=Sunday .. 6=Saturday
  cycle_on int,                        -- cycle: training days
  cycle_off int,                       -- cycle: rest days
  start_date date not null,
  end_date date,                       -- null = active; set when replaced
  check ((type = 'fixed_days' and training_weekdays is not null)
      or (type = 'cycle' and cycle_on >= 1 and cycle_off >= 0))
);
create unique index one_active_goal on goals (user_id) where end_date is null;

create table goal_day_templates (      -- fixed_days only: template per weekday
  goal_id uuid not null references goals on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  template_id uuid not null references workout_templates on delete cascade,
  primary key (goal_id, weekday)
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  weeks int not null check (weeks between 1 and 52),
  start_date date not null,
  status challenge_status not null default 'active',
  ended_at date
);
create unique index one_active_challenge on challenges (user_id) where status = 'active';

-- Indexes from SPEC.md: fast "previous performance of an exercise" lookups.
create index workout_sessions_user_date_idx on workout_sessions (user_id, session_date);
create index session_exercises_exercise_idx on session_exercises (exercise_id);
create index session_exercises_session_idx on session_exercises (session_id);

-- Foreign-key indexes used by RLS parent-ownership checks and per-user lookups.
create index exercises_user_idx on exercises (user_id);
create index workout_templates_user_idx on workout_templates (user_id);
create index template_exercises_template_idx on template_exercises (template_id);
create index goal_day_templates_template_idx on goal_day_templates (template_id);
