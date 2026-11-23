-- Execute no SQL Editor do seu projeto Supabase.
-- Login por email/senha é gerenciado pelo Supabase Auth.
create table if not exists public.study_folders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.study_notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.study_folders(id) on delete set null,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_folders_user_idx on public.study_folders(user_id);
create index if not exists study_notes_user_updated_idx on public.study_notes(user_id,updated_at desc);
alter table public.study_folders enable row level security;
alter table public.study_notes enable row level security;
create policy "own folder read" on public.study_folders for select to authenticated using ((select auth.uid()) = user_id);
create policy "own folder insert" on public.study_folders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own folder update" on public.study_folders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own folder delete" on public.study_folders for delete to authenticated using ((select auth.uid()) = user_id);
create policy "own notes read" on public.study_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy "own notes insert" on public.study_notes for insert to authenticated with check ((select auth.uid()) = user_id and (folder_id is null or exists (select 1 from public.study_folders f where f.id = folder_id and f.user_id = (select auth.uid()))));
create policy "own notes update" on public.study_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and (folder_id is null or exists (select 1 from public.study_folders f where f.id = folder_id and f.user_id = (select auth.uid()))));
create policy "own notes delete" on public.study_notes for delete to authenticated using ((select auth.uid()) = user_id);
-- A pasta de arquivos é PRIVADA. Apenas o dono acessa seus arquivos.
insert into storage.buckets (id, name, public, file_size_limit)
values ('study-media', 'study-media', false, 26214400)
on conflict (id) do nothing;
create policy "study media upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'study-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "study media read own" on storage.objects for select to authenticated
  using (bucket_id = 'study-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "study media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'study-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
