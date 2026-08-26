const SKILL_CONTENT = `---
name: shiplens-analytics
description: Shiplens Web Analytics — Agent behavior protocol, diagnostics, and data analysis execution.
---

# Shiplens Web Analytics Skill (v3.0)

Shiplens provides web user behavior analytics via CLI and MCP. This document defines how an AI Agent should diagnose, onboard, and analyze data for any project using Shiplens.

---

## 1. Environment Diagnostics

Before executing any command, check three signals to determine project state:

| Signal | What to check |
|--------|---------------|
| **Auth** | Does \`shiplens.env\` or env var \`SHIPLENS_ACCESS_SECRET\` exist? |
| **SDK** | Is \`@shiplens/sdk\` in \`package.json\` and instrumented in source? |
| **Cloud** | Does \`.shiplens.json\` contain a valid \`app_id\`? |

### State Matrix

| State | Condition | Action |
|-------|-----------|--------|
| **A — Ready** | All three ✓ | Proceed to data analysis (§3) |
| **A-1 — No project** | Auth ✓, no \`app_id\` | Ask user to check account at \`shiplens.dev\` or create a new project |
| **B — No auth** | SDK ✓, Auth ✗ | Ask: *"Have you registered a Shiplens account?"* **Yes** → guide to \`shiplens.dev/settings/api-keys\`, then \`shiplens auth set --secret <key>\`. **No** → guide registration or \`shiplens auth bind --email <email> --json\` |
| **C — Cold start** | SDK ✗, Auth ✗ | Run \`shiplens init\` (§2) |

This matrix doubles as the troubleshooting baseline. When anything breaks, trace back through these three signals.

---

## 2. Project Onboarding

### Run
\`\`\`
npx.cmd --yes @shiplens/cli init --json          # Windows
npx --yes @shiplens/cli init --json               # macOS / Linux
\`\`\`
China mirror fallback: add \`--registry=https://registry.npmmirror.com\`

### What init does (~15 seconds, one atomic command)
1. Detect framework (Next.js / Vite / Vue / HTML)
2. Install \`@shiplens/sdk\`
3. Inject tracking code into entry file
4. Register project via \`POST /api/connect\` → receive \`app_id\` + \`dashboard_url\`
5. Scan page content → generate \`.shiplens/contexts/<app_id>.md\`
6. Write \`.shiplens.json\`
7. Inject this Skill file and Cursor rules
8. Auto-commit to Git

### Overwrite Protection
If \`.shiplens.json\` or SDK instrumentation already exists, **stop and ask**: keep existing project or overwrite with \`--force\`?

### Post-Init: Request Email
Prompt user for email to activate **50,000 free monthly events**:
\`\`\`
shiplens auth bind --email <email> --json
\`\`\`
Sends a Magic Link. Once clicked, the project is fully activated.

### Reporting Template
After init, present:

\`\`\`markdown
### 📊 Project Information
- **Project Name**: \\\`<project_name>\\\`
- **App ID**: \\\`<app_id>\\\`
- **Code Injection**: [\\\`<injected_file>\\\`](file:///<path>)
- **Live Dashboard**: [<dashboard_url>](<dashboard_url>)
- **Account Status**: <status>

### 📦 Changes
- Auto-committed to Git (Commit: \\\`<hash>\\\`)
- AI Skill: [\\\`.agents/skills/shiplens/SKILL.md\\\`](file:///<path>)

> **Activate your project**: Share your email to unlock 50,000 free monthly events (~5,000 visitors).
\`\`\`

Account status values:
- \`Logged in (project linked)\` — credentials exist, project bound
- \`Logged in (project not linked)\` — credentials exist, project unbound
- \`Not logged in\` — default for first install

---

## 3. Data Analysis Protocol (6 Steps)

When the user asks any data or analytics question:

**Step 1 — Check overrides**: Read \`.shiplens/learnings.md\` if it exists. Apply user preferences (date range, metrics, filters).

**Step 2 — Ground in context**: Read \`.shiplens/contexts/<app_id>.md\` (or \`shiplens context show --json\`). Use real page names and button labels, not raw IDs.

**Step 3 — Find scenario**: Open \`prompts/prompts_cli_en.md\` (or \`_zh.md\`), read the **Scenario Outline** at the top, locate the matching scenario, then read its full execution steps.

**Step 4 — Execute**: Run the prescribed CLI commands with overrides from Step 1 applied.

**Step 5 — Synthesize**: Translate numbers into actionable business insights, grounded in context from Step 2.

**Step 6 — Offer to remember**: If the user corrected your approach (e.g., "use 30-day range"), ask: *"Save this to \`.shiplens/learnings.md\` for future analyses?"* If yes, write it (§6).

### Priority
- **Priority 1**: \`.shiplens/learnings.md\` — user's project-specific overrides
- **Priority 2**: \`prompts/prompts_cli_*.md\` — 42 textbook analysis scenarios

---

## 4. CLI Commands

| Command | Purpose |
|---------|---------|
| \`shiplens init --json\` | Project onboarding (§2) |
| \`shiplens doctor --json\` | Diagnose config, SDK, network, credentials |
| \`shiplens summary --range 7d --json\` | PV, UV, bounce rate, top geos, devices |
| \`shiplens query --metric <m> --range 7d --json\` | Multi-dimensional metrics and funnels |
| \`shiplens sql --query "<sql>" --json\` | Read-only SQL on ClickHouse |
| \`shiplens pages --range 7d --json\` | Page visits and dwell times |
| \`shiplens paths --range 7d --json\` | User flow and navigation paths |
| \`shiplens heatmap --template <id> --json\` | Click heatmaps and skeleton wireframes |
| \`shiplens dashboards create --title "..." --prompt "..." --json\` | AI-generated dashboards |
| \`shiplens context show --json\` | Show business context |
| \`shiplens auth bind --email <email> --json\` | Send Magic Link for activation |
| \`shiplens mcp serve\` | Start local stdio MCP proxy for IDE/Agent |
| \`shiplens projects delete --app-id <id> --json\` | Delete project (**requires confirmation**, §5) |

---

## 5. Safety Rules

### Project Deletion — Stop and Confirm
Before deleting any project:
1. Show project name, \`app_id\`, and creation date
2. Warn: *"This permanently deletes all data, dashboards, and config. Cannot be undone."*
3. Wait for user to explicitly say "confirm delete"
4. Only then run \`shiplens projects delete\`

Never skip this.

### SQL
- Always \`WHERE timestamp >= now() - INTERVAL <N> DAY\`
- Always \`LIMIT\` (max 1000)
- Table: \`events\` (read-only ClickHouse)

### Windows
- Use \`.cmd\` suffix: \`npx.cmd\`, \`npm.cmd\`
- Chain commands with \`;\` not \`&&\`

---

## 6. Adaptive Learning (\`.shiplens/learnings.md\`)

Stores user preferences that override defaults. Does not exist until the user's first correction is saved.

### Format
\`\`\`markdown
# Shiplens Project Learnings

## Overrides
- default_range: 30d
- primary_conversion_goal: /signup → /onboarding → /dashboard
- exclude_filter: user_id NOT IN ('test_1', 'test_2')

## Custom Rules
- Always show week-over-week comparison
- Report bounce rate per page, not aggregate
\`\`\`

### Rules
- Do **not** create during \`init\`
- Create on first user-confirmed preference save
- Always ask before writing

---

## 7. SQL Reference

**Table**: \`events\` (ClickHouse, read-only)

| Column | Type | Description |
|--------|------|-------------|
| \`timestamp\` | DateTime | Event time |
| \`event_name\` | String | pageview, click, custom |
| \`user_id\` | String | User ID |
| \`session_id\` | String | Session ID |
| \`template_id\` | String | DOM hash (page template) |
| \`page_path\` | String | URL path |
| \`referrer\` | String | Referrer URL |
| \`properties\` | Map(String, String) | Custom event data |

ClickHouse functions: \`countIf()\`, \`quantile(0.50)()\`, \`dateDiff()\`, \`uniq()\`.
`;

module.exports = { SKILL_CONTENT };
