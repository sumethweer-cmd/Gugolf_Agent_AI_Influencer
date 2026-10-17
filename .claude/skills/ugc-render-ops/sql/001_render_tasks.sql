-- 001_render_tasks.sql — ตารางสำหรับ ledger งานเรนเดอร์ (RunPod / RunningHub) บน Supabase ของคุณเอง (ไม่บังคับ)
-- ถ้าไม่ใช้ Supabase ข้ามไฟล์นี้ได้เลย — สคริปต์เรนเดอร์เก็บ ledger เป็นไฟล์ rh_tasks.json ในเครื่องอยู่แล้ว
-- ความปลอดภัย: เปิด RLS และไม่ตั้ง policy + revoke anon/authenticated => เข้าถึงได้เฉพาะ service_role (ใช้ในสคริปต์ในเครื่องเท่านั้น)
-- ห้ามใส่ SUPABASE_SERVICE_ROLE_KEY ใน frontend หรือ commit ลงรีโป
-- ไฟล์นี้สร้างตารางใหม่ล้วน ไม่แก้/ไม่ลบตารางอื่น — อ่านก่อนรัน และรันใน SQL editor ของโปรเจกต์ที่คุณเลือกเอง

-- (ก) prompt ที่ต้องทำ — ใช้กับ supabase_prompts.mjs (--todo / --pull / --push) แถวหลัก = segment 1, segment 2..N ชี้ parent_content_item_id
create table if not exists public.pipeline_content_items (
  id                     uuid primary key default gen_random_uuid(),
  character              text,
  model                  text,                      -- เช่น 'minimax-h3'
  status                 text not null default 'pending',  -- pending / approved / qc_fail / posted ฯลฯ
  title                  text,
  compiled_prompt        text,                      -- เนื้อ prompt ของ segment นี้
  note                   text,
  platform               text,
  scheduled_date         date,
  parent_content_item_id uuid references public.pipeline_content_items(id) on delete cascade,
  segment_number         smallint,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.pipeline_content_items enable row level security;
revoke all on public.pipeline_content_items from anon, authenticated;

-- (ข) ledger งานเรนเดอร์
create table if not exists public.render_tasks (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null check (provider in ('runninghub','runpod')),
  job_id           text not null,                 -- RH: taskId · RunPod/ComfyUI: prompt_id
  content_item_id  uuid references public.pipeline_content_items(id) on delete set null,
  story_key        text,
  project_name     text not null,
  workflow_id      text,
  pod_id           text,
  gpu              text,
  status           text not null default 'QUEUED'
                   check (status in ('QUEUED','RUNNING','SUCCESS','FAILED','CANCELLED')),
  submitted_at     timestamptz not null default now(),
  running_at       timestamptz,
  finished_at      timestamptz,
  run_seconds      integer,
  coins            integer,
  cost_usd         numeric(10,4),
  seed             bigint,
  segments         smallint,
  total_frames     integer,
  prompt_version   text,
  seg_from         smallint default 1,
  seg_count        smallint,
  file_url         text,
  drive_file_id    text,
  drive_url        text,
  local_path       text,
  downloaded       boolean not null default false,
  error            text,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (provider, job_id)
);
create index if not exists render_tasks_status_idx on public.render_tasks (status);
create index if not exists render_tasks_content_item_idx on public.render_tasks (content_item_id);
create index if not exists render_tasks_submitted_idx on public.render_tasks (submitted_at desc);
alter table public.render_tasks enable row level security;
revoke all on public.render_tasks from anon, authenticated;

-- (ค) มุมมอง "เรื่องที่ยังไม่มีคลิป SUCCESS" (แถวหลักที่ยังไม่ posted และยังไม่เคยเรนเดอร์สำเร็จ)
create or replace view public.render_todo with (security_invoker = true) as
select
  p.id as content_item_id, p.title, p.character, p.model, p.status as plan_status, p.scheduled_date,
  1 + (select count(*) from public.pipeline_content_items c where c.parent_content_item_id = p.id) as segments,
  lt.provider as last_provider, lt.status as last_render_status, lt.submitted_at as last_submitted_at, lt.coins as last_coins
from public.pipeline_content_items p
left join lateral (
  select t.provider, t.status, t.submitted_at, t.coins
  from public.render_tasks t where t.content_item_id = p.id order by t.submitted_at desc limit 1
) lt on true
where p.parent_content_item_id is null and p.status <> 'posted'
  and not exists (select 1 from public.render_tasks t2 where t2.content_item_id = p.id and t2.status = 'SUCCESS');
revoke all on public.render_todo from anon, authenticated;
