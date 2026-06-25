# Setup

This is a **single-user** app. There are no accounts — the whole app sits behind
one shared password, and your goals live in a Supabase database. You need exactly
one free service: **Supabase**.

> Just want to see the charts with mock data? Run `make demo` and open
> http://localhost:3000/demo — no Supabase, no password needed.

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
APP_PASSWORD=pick-any-password
```

`APP_PASSWORD` is the single password you'll type to unlock the app.

## 5. Run it

```bash
make setup       # first time only — installs dependencies
make env-check   # confirms the 3 vars above are set
make dev         # http://localhost:3000
```

Open http://localhost:3000 → you'll be sent to **/unlock** → enter `APP_PASSWORD`
→ you're in. Create a goal, log progress, and the Progress tab fills with charts.

---

## Use it on your phone + the web (deploy to Vercel)

`localhost` isn't reachable from your phone, so deploy it:

1. Push this repo to GitHub.
2. Go to https://vercel.com → **Add New… → Project** → import the repo.
   Framework preset auto-detects **Next.js**; no build settings to change.
3. Under **Environment Variables**, add the same three from your `.env`:
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSWORD`.
4. **Deploy**. You'll get a `https://your-app.vercel.app` URL that works on your
   phone and any browser, all reading/writing the same Supabase data.

The shared-password gate protects the deployed URL. To change the password later,
update `APP_PASSWORD` in Vercel and redeploy (everyone gets logged out).

---

## Notes

- **Reset/inspect data:** use the Supabase **Table Editor** or **SQL Editor**.
- **No login screen / Google:** removed on purpose — this is a personal app.
- **Security:** the database is reachable only via the server-side service-role
  key; the public `anon` key has no access (RLS is on with no policies).
