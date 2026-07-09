# MINCE — Claude Code Run Guide

How to drive the build one day at a time until it's done.

## Setup (once)

1. Put these files in your repo root:
   `MINCE_MVP_Roadmap_v4.md`, `CLAUDE.md`, and a `plan/` folder with
   `00-prerequisites.md`.
2. From the repo folder, launch the agent:  `claude`
3. First run: `/init` is optional (CLAUDE.md already exists), then `/terminal-setup`
   so Shift+Enter gives newlines.
4. Pick the model with `/model` — Sonnet for most of the build, Opus for the trickier
   architecture/deploy steps.

## The day-by-day loop

Do ONE day per session. Between days, run `/clear` so context stays clean.

### Start each day in Plan Mode
Press **Shift+Tab** to cycle into Plan Mode (Claude proposes, you approve before it
writes code). Then paste the day prompt.

### The reusable day prompt (change the number each day)

```
Read CLAUDE.md and the "Day 1" section of MINCE_MVP_Roadmap_v4.md.

Implement ONLY Day 1's tasks, in order. Rules:
- Commit after each working feature with a short message.
- Do not start any Day 2 task.
- If you hit anything in plan/00-prerequisites.md (accounts, domain, secrets,
  deploy clicks), STOP and tell me exactly what to do — don't attempt it.
- When you reach Day 1's Done-condition, actually run the app and verify it,
  then show me how to check it myself and wait.

Start by giving me your plan for Day 1.
```

Approve the plan, let it work, then verify the Done-condition yourself before moving on.

### Done-conditions (your checkpoint each day)

- **Day 1:** login → submit a report → see it in the table → dashboard numbers update;
  wrong password rejected.
- **Day 2:** login lands on the map; every distrik popup shows manual jarak +
  waktu tempuh + indicator counts across all 3 kabupaten.
- **Day 3:** `/berita` fills itself from the internet when you trigger `POST /admin/ingest`;
  weather shows on `/risiko` + Dashboard; app still renders with the network blocked.
- **Day 4:** full loop works on your real domain; scheduled ingest confirmed on the server.
- **Day 5:** polished UI, print/export works, fallback demo video recorded.

Only run the next day's prompt after the current Done-condition passes.

## Guardrails worth keeping on

- Stay in **Plan Mode** for anything touching deploy, DNS, or `.env`. Approve steps
  one at a time there.
- Do NOT use "accept all / bypass permissions" mode while deploying with real
  credentials. Let it ask.
- Keep commits frequent so you can always roll back a bad change (`git reset --hard`).
- If a session loops or drifts, `/clear` and restart that day's prompt — cheaper than
  fighting it.

## If you'd rather not use the terminal

The Claude Desktop app has a **Code tab** that runs the same agent with the same
CLAUDE.md and the same per-day prompts, but with a GUI, visual diffs, and parallel
sessions. Everything above works there unchanged — only the "launch" step differs
(open the Code tab on a folder instead of running `claude`).

## Rough budget expectation

A 5-day build like this is many agentic sessions. On a subscription, usage draws from
your rolling session limits (shared with Claude.ai chat), so spread the days out rather
than doing all five back-to-back in one window. Commit often so a mid-session limit
never costs you work.
