# PROJECT CONTEXT - Charly Feed App

## Purpose

Public family web app (no login) to track:
- dog feeding slots
- toilet events (shit/piss)
- family diary notes

Primary usage is mobile-first (especially iPhone) and installable as PWA.

## Live/Hosting

- Hosted via GitHub Pages from repo `bvoland/TaskApp`
- Automatic deployment via GitHub Actions workflow:
  - `.github/workflows/deploy-pages.yml`
- Pages URL:
  - `https://bvoland.github.io/TaskApp/`

## Data Storage

- Preferred shared storage: Supabase (no login; anon/publishable key)
- Fallback: localStorage if Supabase config is empty
- Config file:
  - `config.js`

Current Supabase project URL is configured in `config.js`.

## Database (Supabase)

SQL setup is in:
- `supabase.sql`

Tables used:
- `dog_feedings`
- `dog_toilet_events`
- `family_diary_entries`

RLS policies allow anon read/insert/delete for this family use case.

When schema changes are added, run `supabase.sql` again in Supabase SQL Editor.

## Current Features

### 1) Feeding Ampel + Log

- Slot times:
  - 08:00
  - 12:00
  - 16:00
  - 20:00
- Normal entry uses current timestamp only.
- Auto-slot assignment only within +/- 1 hour around a slot.
- Manual override:
  - past slots can be manually set to green (`Manuell auf grün`)
  - creates a feeding entry with slot timestamp
- Daily log view with delete option.

### 2) Shit & Piss Log

- Separate section, no person selection.
- Choice:
  - `Shit`
  - `Piss`
- Timestamp is always current time.
- Daily log view with delete option.

### 3) Diary Timeline

- Independent diary section.
- Inputs:
  - date
  - optional author
  - text
- Timeline grouped by date, newest first.
- Delete option per diary entry.

### 4) Export

- Export section is at end of app.
- Single export button with:
  - checkboxes for data sections:
    - feeding
    - toilet
    - diary
  - optional date range:
    - from
    - to
  - quick range buttons:
    - All
    - Last 7 days
    - This month
- Export format: one combined CSV with `section` column.

### 5) Daily Compliment for Kathi

- Header text: `Für Kathi`
- Daily rotating compliment system.
- Personalized themes include:
  - care for Lukas and Amelie
  - relationship/family strength
  - appearance compliments
  - occasional direct messages from Benny (not always)
- Compliment pool size is >100 (currently 140) before repeat cycle.

### 6) PWA / Mobile

- Installable on Android/iOS (home screen).
- Manifest + service worker enabled.
- Icons include dog+bowl theme.
- App name:
  - `Charly Feed App`

## UX Decisions

- iPhone optimization prioritized.
- Larger tap targets and simple button-based selections.
- Minimal friction for quick logging.
- No login flow by design for family simplicity.

## Important Constraints/Assumptions

- Data is intentionally open to anyone with app URL + key (family trust model).
- For strict security/privacy, auth model must be redesigned later.
- Export is CSV only for now.

## Suggested Next Steps (Open)

- Optional analytics dashboard (weekly/monthly trends)
- Optional duplicate-entry protection per slot
- Optional role-based or PIN-protected delete actions
- Optional backup export/import workflow
