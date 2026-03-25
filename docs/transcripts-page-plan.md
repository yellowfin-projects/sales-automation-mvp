# Plan: Dedicated Transcripts Page for Reps

## Context

Currently, transcripts can only be uploaded from within a deal's detail page (`/deal/[id]`), which requires reps to know which deal page to navigate to first. The user wants a standalone Transcripts page where reps can:

1. **Paste a transcript** directly into a text box, pick a deal, and submit
2. **Upload multiple transcript files** at once, assign them to a deal, and have them all loaded
3. **Run coaching analysis** on any transcript from this page

This gives reps a single, streamlined entry point for all transcript work without navigating through the deal pages.

---

## What We're Building

A new `/transcripts` page with:

- **All transcripts** listed across all deals (not scoped to one deal like the current `TranscriptList`)
- **Two input modes** — paste text or upload files — behind toggle buttons at the top
- **Deal selector** dropdown (searchable) to assign transcripts to deals
- **Per-transcript coaching** — same expand/analyze flow as the deal page, reusing `TranscriptList` sub-components

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/transcripts/page.tsx` | New page — transcript list + paste/upload panels |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Add "Transcripts" link to nav bar |
| `src/app/api/upload-transcript/route.ts` | Add JSON body support for pasted text (alongside existing FormData for files) |
| `src/components/TranscriptList.tsx` | Add optional `showDealName` prop so transcripts show which deal they belong to |

## Existing Code to Reuse

| What | Where |
|------|-------|
| Transcript types | `src/lib/transcript-types.ts` |
| Speaker detection + word count | `src/lib/transcript-parser.ts` (`detectSpeakers`, `countWords`) |
| File upload API | `src/app/api/upload-transcript/route.ts` (existing FormData path) |
| Analysis API | `src/app/api/analyze-transcript/route.ts` (unchanged) |
| Coaching results display | `TranscriptList.tsx` — `CoachingSession`, `CollapsibleSection`, `CoachingItem` components |
| Drag-and-drop pattern | `TranscriptUploader.tsx` (reference for drop zone styling) |

---

## Step 1: Modify Upload API to Accept Pasted Text

**File:** `src/app/api/upload-transcript/route.ts`

The current POST only handles `FormData` with a file. Add a second code path: if the request `Content-Type` is `application/json`, accept:

```typescript
{
  dealId: string;
  transcriptText: string;       // the pasted text
  filename?: string;            // optional, default "Pasted transcript"
  callDate?: string;
  callType?: string;
}
```

Server-side, run `detectSpeakers()` and `countWords()` on the pasted text (same functions the file parser uses), then insert into the `transcripts` table. No file parsing needed — the text is already plain text.

This keeps the existing FormData path untouched for file uploads.

## Step 2: Add `showDealName` to TranscriptList

**File:** `src/components/TranscriptList.tsx`

Add an optional `showDealName` prop and an optional `dealNames` map (`Record<string, string>` mapping deal_id → account name). When `showDealName` is true, display the deal/account name on each transcript row. This lets us reuse the full TranscriptList (with coaching, expand/collapse, delete, analyze) on the new page.

## Step 3: Build the Transcripts Page

**File:** `src/app/transcripts/page.tsx`

### Layout

```
┌──────────────────────────────────────────────────┐
│ Transcripts                    [Paste] [Upload]  │
├──────────────────────────────────────────────────┤
│ (Paste or Upload panel — shown when toggled)     │
├──────────────────────────────────────────────────┤
│ Filter: [All Deals ▼]                            │
├──────────────────────────────────────────────────┤
│ TranscriptList (all transcripts, with deal names)│
└──────────────────────────────────────────────────┘
```

### Paste Panel (shown when "Paste" is clicked)

- **Deal selector** — dropdown of all deals, showing `account_name — opportunity_name`. Searchable via a text input that filters the list.
- **Transcript text** — large textarea (min 8 rows)
- **Call date** — date input (optional)
- **Call type** — dropdown: Discovery, Demo, Follow-up, Negotiation, Technical, Other (optional)
- **Filename** — text input, defaults to "Pasted transcript" (optional)
- **Submit** button → POST JSON to `/api/upload-transcript` → on success, refresh list + show success message + clear form

### Upload Panel (shown when "Upload" is clicked)

- **Deal selector** — same deal dropdown as paste panel (required, pick once for the batch)
- **Multi-file drop zone** — drag-and-drop area, plus "Choose Files" button with `multiple` attribute
- **Call date + call type** — shared across all files in the batch (optional)
- On drop/select: loop through files, upload each sequentially to the existing FormData endpoint, showing progress (e.g., "Uploading 2 of 5...")
- On completion: show summary ("5 transcripts uploaded to [deal name]"), refresh list

### Transcript List Section

- Fetch all transcripts + all transcript_analyses from Supabase (no deal filter, or filtered by selected deal)
- Also fetch deals to build a `dealNames` map for display
- Pass `showDealName={true}` to `TranscriptList`
- Deal filter dropdown at top to narrow the list to a specific deal
- Auto-refresh on tab visibility (same pattern as leads page)

## Step 4: Add Nav Link

**File:** `src/app/layout.tsx`

Add "Transcripts" link between "Leads" and "Settings" in the nav bar.

---

## Build Order

1. Modify `/api/upload-transcript/route.ts` — add JSON body path for pasted text
2. Add `showDealName` + `dealNames` prop to `TranscriptList.tsx`
3. Create `src/app/transcripts/page.tsx` with all three sections (paste, upload, list)
4. Add nav link in `layout.tsx`
5. Typecheck + test

## Verification

1. `npm run typecheck` — no errors
2. Navigate to `/transcripts` — page loads, shows all existing transcripts with deal names
3. Paste a transcript: select a deal, paste text, submit → appears in list with correct word count and speakers
4. Upload multiple files: select a deal, drop 2+ files → all appear in list
5. Filter by deal — list narrows correctly
6. Expand a transcript → coaching works (Get Coaching button → Gemini call → results display)
7. Existing deal detail page transcript section still works unchanged
