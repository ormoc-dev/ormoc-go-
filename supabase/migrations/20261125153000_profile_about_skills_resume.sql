-- Profile extras for Edit Profile (about, skills, resume)
-- Auth stays in auth.users; app profile + resume metadata live here.
-- Resume binary files are stored in the private "resumes" storage bucket.

alter table public.profiles
  add column if not exists about text,
  add column if not exists skills jsonb not null default '[]'::jsonb,
  add column if not exists resume_path text,
  add column if not exists resume_name text,
  add column if not exists resume_mime text,
  add column if not exists resume_size bigint,
  add column if not exists resume_updated_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_about_length;

alter table public.profiles
  add constraint profiles_about_length
  check (about is null or char_length(about) <= 1200);

alter table public.profiles
  drop constraint if exists profiles_skills_is_array;

alter table public.profiles
  add constraint profiles_skills_is_array
  check (jsonb_typeof(skills) = 'array');

alter table public.profiles
  drop constraint if exists profiles_resume_size_nonneg;

alter table public.profiles
  add constraint profiles_resume_size_nonneg
  check (resume_size is null or resume_size >= 0);

comment on column public.profiles.about is 'Short bio shown on the user profile';
comment on column public.profiles.skills is 'JSON array of skill strings (max ~24 client-side)';
comment on column public.profiles.resume_path is 'Storage object path in the resumes bucket';
comment on column public.profiles.resume_name is 'Original resume file name';
comment on column public.profiles.resume_mime is 'Resume MIME type';
comment on column public.profiles.resume_size is 'Resume file size in bytes';
comment on column public.profiles.resume_updated_at is 'When the resume was last uploaded';

-- Private resume files: {user_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  8388608,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'text/rtf'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Resume files are readable by owner" on storage.objects;
create policy "Resume files are readable by owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Resume files are insertable by owner" on storage.objects;
create policy "Resume files are insertable by owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Resume files are updatable by owner" on storage.objects;
create policy "Resume files are updatable by owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Resume files are deletable by owner" on storage.objects;
create policy "Resume files are deletable by owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
