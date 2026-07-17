# How Goal Tracker Actually Works

This is the plain-language version. If you want the research citations, the
exact math, and every tunable constant, see `docs/lock-formula.md` — this
file explains the same system without the formulas, so you always know what's
happening to your goals and why.

---

## The basic idea

Every goal you track has a **cost, in keys**. Keys are what you spend to
*schedule* a goal for tomorrow — you have 100 keys a week to spend across
everything you're committing to. A cheap goal (say, 10 keys) is easy to fit
alongside other things. An expensive one (say, 40 keys) eats a big chunk of
your week on its own.

The cost isn't something you set. It moves on its own, based on what you
actually do:

- **Pass a goal → it gets cheaper.** Keep passing it and it heads toward 1
  key — at that point the goal is **Habit Formed**.
- **Miss a scheduled goal → it gets more expensive.** Miss it a lot and the
  cost climbs, eventually crowding out your other goals — the app is telling
  you "this one needs your attention, or it needs to go."
- **Ignore a goal for a while (don't schedule it at all) → it drifts back
  toward the middle**, not up, not down — see "Going stale," below.

There's no separate "hard mode" — you don't tell the app how hard a goal is.
Every goal starts at the same cost, and your actual results are the only
thing that ever makes one goal cheaper or pricier than another. Earlier
versions of the app asked you to guess a difficulty at creation, but that
guess doesn't actually know how hard the goal is *for you* — your track
record does.

## The graph

Every goal has a graph you can find on its card (a small preview) or its own
page (the full version). The vertical axis has no numbers on it — just two
labels:

- **Habit Formed** at the top.
- **Not Sticking Yet** at the bottom.

Each real day you checked in shows up as a dot on a smooth line — green if
you passed, red if you missed. From your most recent point, two dashed lines
branch forward 14 days: a green one showing where you'd land if you kept
passing every day, and a red one showing where you'd land if you kept
missing. The red line jumps further after an actual miss than after a clean
run — a second bad day in a row genuinely does more damage than an isolated
one (see "Missing more than once in a row," below).

## Scheduling and pricing

When you plan tomorrow (or tonight, for today), you pick which goals to
schedule from your 100-key budget. How many days a week you've committed to a
goal also changes its price:

- Committing to something **every day (7×/week)** costs full price.
- Committing to it **once a week** costs about half that.

This means ambition costs keys. You genuinely can schedule something every
single day, but doing that for several goals at once will blow your budget —
the app wants you focusing on a few things at a time, not spreading yourself
across everything.

**Editing your weekly target re-prices the goal immediately** — lower it and
the cost drops right away; raise it and the cost goes up. But this never
erases a miss you already had. Scheduling a goal for a day is the real
commitment: skipping a day you scheduled always counts against you,
regardless of what your weekly target says.

## Calibration: the first ~10 days matter more

When a goal is brand new, both passes and misses move its cost more than they
will later. This fades out over your first 10 scheduled days for that goal.
It's intentional — the app is trying to find your real level fast, the same
way a new chess player's rating swings hard for their first ~10-30 games
before settling down. A goal you've been doing for months barely reacts to
one lapse; a goal you started this week reacts a lot.

## Missing more than once in a row

A single miss costs you something, but a *second* miss right after it costs
noticeably more than the first did — misses compound while you're on a
losing streak. Any pass resets that compounding back to zero. This matches
the common finding that one lapse is mostly harmless, but consecutive lapses
are what actually kill a habit.

## Going stale (goals you stop scheduling)

Here's the gap this closes: normally, a day you didn't schedule anything for
is completely neutral — no penalty. That's deliberate; the app never wants to
punish you for a day you never committed to. But it means you could, in
theory, get a goal cheap and then just never schedule it again, and its cost
would sit frozen forever, never reflecting that you've actually stopped doing
it.

So: if a goal goes **10 or more days in a row without being scheduled at
all**, it starts drifting back toward the middle — not toward "Habit Formed,"
not toward "Not Sticking Yet," toward *neutral*. This is different from a
miss on purpose:

- A **miss** is judged — you committed to a day and didn't follow through.
- **Going stale** isn't judged at all — nothing was scheduled, so nothing was
  broken. It's just what happens to any skill you stop practicing: it gets a
  little rusty.

Concretely:

- A goal you'd gotten close to "Habit Formed" will drift back down a bit if
  you leave it alone for a couple of weeks — not punished, just no longer
  fresh.
- A goal you were struggling with — cost climbing, deep in "Not Sticking
  Yet" — gets **partial forgiveness** the longer it sits unscheduled. Time
  away from a goal you were failing isn't remembered against you forever.

A short break (under 10 days) does nothing at all. This only kicks in for a
real, sustained gap.

One honest caveat: the number shown in the app (the "N keys" on a goal's
card) only updates the next time you check in for *any* goal — there's no
background job quietly recalculating everyone's costs every night. The graph
itself is always accurate the moment you open it, even before that number
catches up.

## The weekly budget

Your **active** goals' combined cost has to fit inside 100 keys, whether or
not you actually schedule all of them on a given day. This is different from
the daily 100-key scheduling limit — it's a portfolio-level check that stops
you from taking on more than you can realistically hold. If your goals'
combined cost grows past 100 (because some of them got more expensive from
missing), the Goals page will flag it — your options are to pause or delete
something, or lower a weekly target to bring its price down. Pausing a goal
frees its keys from this budget entirely.

## What never happens

- **No streaks, ever.** The app deliberately never shows or tracks a
  "consecutive days" counter anywhere visible. Streaks make people lie to
  avoid breaking them; this app doesn't want that pressure.
- **No shame copy.** A miss is called a miss, not a failure. Reassurance
  copy ("a missed day never erases your progress") shows up at the moments
  it matters most — right before you check in.
- **Nothing is retroactively punished for going unplanned.** Only real misses
  (a scheduled day you skipped) and sustained disuse (§ above) ever move a
  goal's cost in the expensive direction.

## If you want the exact math

Every number above comes from a real formula with tunable constants — see
`docs/lock-formula.md` for the derivation, the research each piece is based
on, and worked numeric examples you can hand-check. If you unlock developer
mode on `/profile`, you can see and tweak those constants directly; changing
one retroactively redraws every goal's history, since costs are always
recomputed from your actual check-in log, never stored as a running total.
