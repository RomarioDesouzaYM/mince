# Prerequisites — Do These Yourself Before Running Claude Code

Claude Code cannot (and must not) create accounts, register domains, enter passwords, or
run irreversible deploy steps. Do the items below by hand. The agent does everything else.

## A. Before Day 1 — accounts & tools (~45 min)

1. **Anthropic plan for Claude Code.** Claude Code needs a paid plan (Pro, Max, Team,
   Enterprise, or a Console/API account). The free Claude.ai plan does not work.
   Pick Pro if you're solo. Sign in happens in the browser on first `claude` launch.

2. **Install Claude Code** (native installer, no Node needed):
   - macOS / Linux / WSL:  `curl -fsSL https://claude.ai/install.sh | bash`
   - Windows PowerShell:   `irm https://claude.ai/install.ps1 | iex`
   Open a NEW terminal, then run `claude --version`, then `claude doctor`.
   (npm path if you prefer: `npm install -g @anthropic-ai/claude-code`, needs Node 18+.)

3. **GitHub account + Student Pack + Pro.** Verify your GitHub Student Developer Pack is
   active (github.com/education). Enable GitHub Pro. Create an empty PRIVATE repo `mince`.

4. **Git installed and logged in** on your machine (`git config user.name`, `user.email`,
   and a working `gh auth login` or SSH key so pushes work).

## B. Before Day 4 (deploy) — infra you must claim/register (~30 min)

5. **DigitalOcean $200 credit.** Claim via the Student Pack NOW (the credit window is
   already open through 31 Jul 2026). Create the account, add the credit. Don't build
   the Droplet/App yet — the agent will guide that, but YOU click the final "create"
   and enter any login.

6. **Namecheap free domain + SSL.** Through the Student Pack, register your `.me` domain
   (e.g. `mince-bps.me`). This needs your account + is basically a purchase, so it's
   yours to do. Note the domain name; the agent will tell you which DNS records to add.

7. **Vercel account** (frontend host). Sign in with GitHub. First deploy needs your
   browser login — you do that step.

## C. Secrets you set by hand (never let the agent write real values)

The agent will create `.env.example` with blank keys. You copy it to `.env` and fill in:

```
MINCE_USER=<the login username you choose>
MINCE_PASSWORD=<a strong password you choose>
JWT_SECRET=<random 32+ char string you generate>
```

Generate a JWT secret yourself, e.g.:  `python -c "import secrets; print(secrets.token_urlsafe(48))"`

No other API keys are needed — Open-Meteo and the RSS feeds require none. That's why the
automatic data was chosen to be key-free.

## D. During Day 4 deploy — the human-only clicks

- Entering your DigitalOcean / Vercel / Namecheap passwords or OAuth approvals.
- Setting the `.env` values on the production server.
- Adding the DNS A/CNAME records at Namecheap (agent gives you the target, you paste it).
- Clicking the final "Deploy" / "Confirm" button.

Everything up to those clicks — writing the deploy config, Dockerfile, systemd unit,
build commands — the agent prepares for you.
