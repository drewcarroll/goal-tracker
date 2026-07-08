# Setup

Sign-in is by **username only** — no passwords, no accounts to create. You type a
username on the way in and your goals (stored in a Supabase database) are scoped
to it; the same username always sees the same data. You need exactly one free
service: **Supabase**.

---

## 1. Create a Supabase project (free)

1. Go to https://supabase.com → sign in → **New project**.
2. Give it a name and a database password (you won't need that DB password for
   this app). Pick a region near you. Wait ~2 min for it to provision.

## 2. Create the tables

1. In the project: **SQL Editor** → **New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   You should see "Success".

## 3. Get your keys

In the project: **Project Settings → API**. Copy two things:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **`service_role` key** (under "Project API keys" — _not_ the `anon` key) →
  `SUPABASE_SERVICE_ROLE_KEY`. This is a server-only secret; never commit it.

## 4. Fill in `.env`

Copy the example and edit the values:

```bash
cp .env.example .env
```

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

## 5. Run it

```bash
make setup       # first time only — installs dependencies
make env-check   # confirms the 2 vars above are set
make dev         # http://localhost:3000
```

Open http://localhost:3000 → you'll be sent to **/login** → type any username and
click **Next** → you're in. Set up a few goals (either the onboarding wizard or
`/goals`), plan tomorrow on `/plan`, and check in each day on `/checkin` — the
Progress tab fills in from there. Use **Switch user** (top-right) to sign in
under a different username and see that username's data.

---

## Use it on your phone + the web (deploy to Vercel)

`localhost` isn't reachable from your phone, so deploy it:

1. Push this repo to GitHub.
2. Go to https://vercel.com → **Add New… → Project** → import the repo.
   Framework preset auto-detects **Next.js**; no build settings to change.
3. Under **Environment Variables**, add the same two from your `.env`:
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Paste the raw values
   with **no surrounding quotes**.
4. **Deploy**. You'll get a `https://your-app.vercel.app` URL that works on your
   phone and any browser, all reading/writing the same Supabase data.

The deployed URL is gated by the username screen. Anyone who knows a username can
see that username's data, so this is light personal-use protection, not real
auth — pick a username that isn't easy to guess if that matters to you.

---

## Notes

- **Reset/inspect data:** use the Supabase **Table Editor** or **SQL Editor**.
  Each row's `user_id` is derived from the username, so rows for different
  usernames don't mix.
- **No passwords / Google:** sign-in is username-only, on purpose — this is a
  personal app.
- **Security:** the database is reachable only via the server-side service-role
  key; the public `anon` key has no access (RLS is on with no policies).
