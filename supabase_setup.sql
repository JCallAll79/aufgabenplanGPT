-- Run once in Supabase SQL Editor. Transaction prevents a partial setup.
begin;
create table public.tracker_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  role text not null check (role in ('teacher', 'student')),
  teacher_id uuid references public.tracker_profiles(id),
  check ((role = 'teacher' and teacher_id is null) or (role = 'student' and teacher_id is not null and teacher_id <> id))
);
create table public.tracker_tasks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.tracker_profiles(id),
  title text not null check (length(trim(title)) between 1 and 200),
  created_at timestamptz not null default now()
);
create table public.tracker_progress (
  student_id uuid not null references public.tracker_profiles(id) on delete cascade,
  task_id uuid not null references public.tracker_tasks(id) on delete cascade,
  state smallint not null check (state between 0 and 2),
  primary key (student_id, task_id)
);
create index on public.tracker_profiles(teacher_id);
create index on public.tracker_tasks(teacher_id);
create index on public.tracker_progress(task_id);
alter table public.tracker_profiles enable row level security;
alter table public.tracker_tasks enable row level security;
alter table public.tracker_progress enable row level security;
revoke all on public.tracker_profiles, public.tracker_tasks, public.tracker_progress from anon, authenticated;
grant select on public.tracker_profiles to authenticated;
grant select, insert, update, delete on public.tracker_tasks to authenticated;
grant select, insert, update on public.tracker_progress to authenticated;
-- Profiles are provisioned ONLY by the project administrator, never by clients.
create policy profiles_read on public.tracker_profiles for select to authenticated
using (id = (select auth.uid()) or teacher_id = (select auth.uid()));
create policy tasks_read on public.tracker_tasks for select to authenticated
using (exists (select 1 from public.tracker_profiles p where p.id = (select auth.uid())
  and ((p.role = 'teacher' and p.id = tracker_tasks.teacher_id) or (p.role = 'student' and p.teacher_id = tracker_tasks.teacher_id))));
create policy tasks_insert on public.tracker_tasks for insert to authenticated
with check (teacher_id = (select auth.uid()) and exists (select 1 from public.tracker_profiles p where p.id = (select auth.uid()) and p.role = 'teacher'));
create policy tasks_update on public.tracker_tasks for update to authenticated
using (teacher_id = (select auth.uid()) and exists (select 1 from public.tracker_profiles p where p.id = (select auth.uid()) and p.role = 'teacher'))
with check (teacher_id = (select auth.uid()) and exists (select 1 from public.tracker_profiles p where p.id = (select auth.uid()) and p.role = 'teacher'));
create policy tasks_delete on public.tracker_tasks for delete to authenticated
using (teacher_id = (select auth.uid()) and exists (select 1 from public.tracker_profiles p where p.id = (select auth.uid()) and p.role = 'teacher'));
-- Join validates both the student's class and the task's owner.
create policy progress_read on public.tracker_progress for select to authenticated
using (exists (select 1 from public.tracker_profiles s join public.tracker_tasks t on t.teacher_id = s.teacher_id
 where s.id = student_id and s.role = 'student' and t.id = task_id
 and (s.id = (select auth.uid()) or s.teacher_id = (select auth.uid()))));
create policy progress_insert on public.tracker_progress for insert to authenticated
with check (exists (select 1 from public.tracker_profiles s join public.tracker_tasks t on t.teacher_id = s.teacher_id
 where s.id = student_id and s.role = 'student' and t.id = task_id
 and (s.id = (select auth.uid()) or s.teacher_id = (select auth.uid()))));
create policy progress_update on public.tracker_progress for update to authenticated
using (exists (select 1 from public.tracker_profiles s join public.tracker_tasks t on t.teacher_id = s.teacher_id
 where s.id = student_id and s.role = 'student' and t.id = task_id
 and (s.id = (select auth.uid()) or s.teacher_id = (select auth.uid()))))
with check (exists (select 1 from public.tracker_profiles s join public.tracker_tasks t on t.teacher_id = s.teacher_id
 where s.id = student_id and s.role = 'student' and t.id = task_id
 and (s.id = (select auth.uid()) or s.teacher_id = (select auth.uid()))));
commit;
