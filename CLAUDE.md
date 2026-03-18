# Sales Automation MVP

## What This Project Is

A pipeline dashboard for Yellowfin BI's sales leadership team. Ingests weekly Salesforce CSV exports, displays deal health metrics, and provides on-demand AI coaching analysis per deal using Gemini.

This is the MVP version. The full plan is at `../Sales_Automation_Plan.md` and the MVP plan is at `../Sales_Automation_MVP_Plan.md`.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL) — schema in `supabase-schema.sql`
- **AI:** Google Gemini 2.5 Flash via `@google/generative-ai` SDK
- **Charts:** Recharts
- **CSV Parsing:** Papa Parse
- **Hosting:** Vercel (not yet deployed)

## Commands

```bash
npm run dev     # Start dev server on localhost:3000
npm run build   # Production build
npm run lint    # Run ESLint
npx tsc --noEmit  # Type-check without emitting
```

## Architecture

- All pages are client components (`"use client"`) that query Supabase directly
- The only server-side code is `src/app/api/analyze-deal/route.ts` — this calls Gemini so the API key stays server-side
- CSV processing happens client-side (Papa Parse) with data inserted into Supabase via the JS client
- No auth yet (Phase 4)

## Key Design Decisions

- **Additive uploads:** Each CSV upload adds new data — it never replaces. Activities are deduped on `(deal_id, activity_date, subject)`. Deal metadata (stage, amount, close date) is upserted to latest values. Changes are tracked in `deal_history`.
- **On-demand AI only:** Gemini is never called automatically. The user clicks "Analyze Deal" with a confirmation step. Results are cached in the `analyses` table.
- **Computed metrics over AI:** Deal health signals (staleness, activity trend, stakeholder count, overdue status) are calculated from data — no AI needed. AI is reserved for qualitative coaching insights.

## Data Flow

1. User uploads Salesforce CSV on `/settings`
2. Papa Parse parses client-side → `csv-processor.ts` upserts deals and deduplicates activities into Supabase
3. Dashboard pages query Supabase and compute metrics in `metrics.ts`
4. User clicks "Analyze Deal" on `/deal/[id]` → API route sends context to Gemini → result stored in Supabase

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key
GEMINI_API_KEY               — Google AI Studio API key (server-side only)
```

## CSV Format

The Salesforce report export has one row per activity (email/call) with deal metadata repeated on each row. Columns: Created Date, Sales Region, Account Name, Opportunity Name, Opportunity Stage, Amount (converted), Probability (%), Close Date, Opportunity Owner, Subject, Full Comments, Type. Call activities include Chorus meeting summaries in Full Comments.

## Database Tables

- `deals` — one row per opportunity, upserted on upload
- `activities` — one row per email/call, deduped on `(deal_id, activity_date, subject)`
- `analyses` — AI analysis results, one per deal per analysis run
- `uploads` — audit trail of CSV uploads with counts
- `deal_history` — tracks field changes between uploads

## What's Not Built Yet

- Auth (Phase 4) — currently open access
- Vercel deployment
- Mobile layout polish
- Deals at risk callout section on Pipeline Overview
