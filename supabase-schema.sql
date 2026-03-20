-- Sales Automation MVP — Supabase Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- DEALS TABLE
-- One row per Salesforce opportunity
-- ============================================
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  opportunity_name text unique not null,
  account_name text not null,
  stage text not null,
  amount decimal default 0,
  currency text default 'USD',
  probability integer default 0,
  predictive_amount decimal default 0,
  close_date date,
  owner text not null,
  opportunity_type text default '',
  region text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- UPLOADS TABLE
-- Tracks every CSV upload for audit trail
-- ============================================
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  row_count integer default 0,
  new_activities_added integer default 0,
  duplicate_activities_skipped integer default 0,
  deals_created integer default 0,
  deals_updated integer default 0,
  skipped_records jsonb default null,      -- details of duplicate activities skipped
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now()
);

-- ============================================
-- DEAL HISTORY TABLE
-- Tracks metadata changes detected between uploads
-- ============================================
create table if not exists deal_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  upload_id uuid references uploads(id) on delete set null,
  changed_at timestamptz default now()
);

-- ============================================
-- ACTIVITIES TABLE
-- One row per activity (email, call, etc.)
-- ============================================
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade not null,
  activity_date date not null,
  subject text not null,
  full_comments text default '',
  activity_type text default 'Other',
  upload_id uuid references uploads(id) on delete set null,
  created_at timestamptz default now()
);

-- Deduplication: prevent the same activity from being imported twice
create unique index if not exists activities_dedup_idx
  on activities (deal_id, activity_date, subject);

-- ============================================
-- ANALYSES TABLE (Phase 3)
-- Stores AI analysis results per deal
-- ============================================
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade not null,
  health_assessment text,
  risk_signals jsonb default '[]',
  positive_signals jsonb default '[]',
  coaching_suggestions jsonb default '[]',
  ai_win_probability decimal,
  ai_reasoning text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  analyzed_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- For the MVP, allow all authenticated AND anonymous access.
-- We'll lock this down with proper auth in Phase 4.
-- ============================================
alter table deals enable row level security;
alter table activities enable row level security;
alter table uploads enable row level security;
alter table deal_history enable row level security;
alter table analyses enable row level security;

-- Allow all operations for now (MVP — no auth yet)
create policy "Allow all access to deals" on deals for all using (true) with check (true);
create policy "Allow all access to activities" on activities for all using (true) with check (true);
create policy "Allow all access to uploads" on uploads for all using (true) with check (true);
create policy "Allow all access to deal_history" on deal_history for all using (true) with check (true);
create policy "Allow all access to analyses" on analyses for all using (true) with check (true);

-- ============================================
-- INDEXES for common query patterns
-- ============================================
create index if not exists activities_deal_id_idx on activities (deal_id);
create index if not exists activities_date_idx on activities (activity_date);
create index if not exists deal_history_deal_id_idx on deal_history (deal_id);
create index if not exists analyses_deal_id_idx on analyses (deal_id);

-- ============================================
-- LEAD SYNCS TABLE
-- Audit trail for Gmail lead report syncs
-- ============================================
create table if not exists lead_syncs (
  id uuid primary key default gen_random_uuid(),
  email_subject text,
  email_date timestamptz,
  rows_in_csv integer default 0,
  leads_imported integer default 0,
  leads_skipped integer default 0,
  trigger_source text default 'manual',  -- 'manual' | 'cron'
  synced_at timestamptz default now()
);

-- ============================================
-- LEADS TABLE
-- One row per lead from the Salesforce lead report
-- ============================================
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company text default '',
  full_name text default '',
  email text not null,
  phone text default '',
  country text default '',
  lead_type text default '',
  lead_status text default '',
  sales_qualified integer default 0,
  power_of_one integer default 0,
  region text default '',
  download_date timestamptz,
  medium text default 'Unknown',
  lead_week_start date not null,
  is_converted boolean default false,
  sync_id uuid references lead_syncs(id) on delete set null,
  quarter text not null default '',        -- e.g., "2026-Q1" for quarterly retention
  created_at timestamptz default now(),
  updated_at timestamptz default now()     -- tracks when lead status last changed
);

-- Deduplication: one lead per email per week
create unique index if not exists leads_dedup_idx
  on leads (email, lead_week_start);

-- ============================================
-- RLS for lead tables
-- ============================================
alter table lead_syncs enable row level security;
alter table leads enable row level security;

create policy "Allow all access to lead_syncs" on lead_syncs for all using (true) with check (true);
create policy "Allow all access to leads" on leads for all using (true) with check (true);

-- ============================================
-- INDEXES for lead query patterns
-- ============================================
create index if not exists leads_sync_id_idx on leads (sync_id);
create index if not exists leads_region_idx on leads (region);
create index if not exists leads_week_start_idx on leads (lead_week_start);
create index if not exists leads_quarter_idx on leads (quarter);
