# Your part (about 20 minutes, one time)

The agent in Antigravity can't create accounts or paste secrets for you. Everything else is in build.md.

## 1. Check the old Supabase project (2 min, optional)
supabase.com/dashboard -> look for project `grjtdvifjyresvrhlmci`.
- Not listed, or the only option is "Download backup": it's gone for good. Skip to step 2.
- Shows "Restore project": click it, then copy out anything you care about. (Unlikely after a year.)
Your old data is probably just test accounts, so don't spend long here.

## 2. Create a NEW Supabase project (5 min)
- supabase.com/dashboard -> New project, under your own account.
- Save the database password somewhere.
- Do NOT enable Lovable Cloud for this. You want a project you can open yourself.

## 3. Create the tables (2 min)
Dashboard -> SQL Editor -> New query -> paste all of `supabase/migrations/0001_vertexpath_core.sql` -> Run.
It's safe to run twice.

## 4. Auth settings (2 min)
- Authentication -> Providers -> Email: enabled. While developing, switch "Confirm email" OFF.
- Authentication -> URL Configuration: add `http://localhost:8080` to Site URL and Redirect URLs.

## 5. Keys (2 min)
- Project Settings -> API: copy the Project URL and the anon/publishable key.
- In the repo root create `.env.local`:
  VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-ANON-KEY

## 6. AI key (5 min, only needed for Phase 4)
- Get a Gemini API key from Google AI Studio (or a Claude API key from console.anthropic.com).
- Dashboard -> Edge Functions -> Secrets: add `AI_PROVIDER` (gemini or anthropic) and `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`).
- Deploy the function: install the Supabase CLI, then
  supabase login
  supabase link --project-ref YOUR-REF
  supabase functions deploy ai-assist
- Never put this key in the frontend or commit it.

## 7. Hand over to Antigravity
Copy `build.md`, `supabase/` and this folder's contents into the repo root, open the repo in Antigravity, and prompt:

  Read build.md fully. Do Phase 1 only. Inspect the code first, make surgical changes only, then stop and report.

After each report, review it and say "approved, do Phase N".
