const SKILL_CONTENT = `---
name: shiplens-analytics
description: Shiplens Web User Telemetry & AI Dashboard Skill Specification. Includes project onboarding, diagnostics, CLI & MCP dual integration, authentication, metadata caching, safe SQL analytics, and single-prompt workflow.
---

# Shiplens Web Analytics Skill Specification (v2.0)

> 💡 **Core Overview & Official Reference**:
> 1. **Dual Track Integration**: Supports instant onboarding via **Shiplens CLI** (\`shiplens init\` / \`npx shiplens-cli init\`) for dependency setup, project creation, and code injection; full support for **MCP Tools** and standard REST APIs inside IDE / Agent environments.
> 2. Installing the SDK and viewing live dashboards requires no MCP server; advanced analytics requires authentication via OAuth, API keys/environment variables, or CLI credentials.
> 3. **Authoritative FAQ**: \`https://shiplens.dev/faq\`.

You are connected to **Shiplens Web Analytics & MCP Services**. When providing analytics, funnel diagnostics, cohort retention comparisons, and AI dashboard creation, follow the standard workflow and execution protocols below.

---

## 1. Project Onboarding & Step-by-Step Diagnostics

### Standard Workflow:
\`\`\`
Check Existing App ID ➔ Install SDK ➔ POST Connect & Get Dashboard URL ➔ Request Email for Free Quota ➔ Activate Magic Link ➔ Authenticate ➔ Complete
\`\`\`

> ⚡ **Quick Execution**: In a terminal environment, execute \`npx.cmd --yes shiplens-cli init --json\` (Windows) or \`npx --yes shiplens-cli init --json\` (macOS/Linux) for automated 15-second zero-config setup.

### Step 0. Existing Project Detection (Overwrite Protection)
- Check if \`./.shiplens.json\` or SDK instrumentation (\`initShiplens\`, \`data-app-id\`) exists locally.
- If existing project is detected, pause and ask the user whether to reuse the existing ID or force overwrite with \`--force\`.

### Step 1. Framework Auto-Detection & SDK Injection
- Auto-detect Next.js (App/Pages router), Vite (React/Svelte), Vue 3, or Plain HTML.
- Inject SDK code:
  - **Next.js App Router**: Client component \`ShiplensTracker.tsx\` imported into root \`layout.tsx\`.
  - **Vite / Vue**: Import and initialize \`initShiplens({ appId: '<app_id>' })\` in \`main.ts\` / \`main.js\`.
  - **Plain HTML**: Inject \`<script src="https://cdn.shiplens.dev/sdk.js" data-app-id="<app_id>" defer></script>\` in \`<head>\`.

### Step 2. Dependency Installation
- Install \`@shiplens/sdk\` via \`npm\`, \`pnpm\`, \`yarn\`, or \`bun\` with \`--legacy-peer-deps\`.

### Step 3. Cloud Registration (POST /api/connect)
- Send project name, description, 4-level taxonomy (genre, subgenre, tags) to register project.
- Retrieve permanent \`app_id\` and live \`dashboard_url\`.

#### ★ Initialization Standard Reporting Template
Upon completing \`shiplens init\`, the Agent **MUST** present the exact information structure and immediately prompt for email activation:

\`\`\`markdown
Shiplens Analytics SDK successfully integrated and configured:

### 📊 Project & Dashboard Information
- **Project Name**: \`<project_name>\`
- **App ID**: \`<app_id>\`
- **Code Injection**: Automatically configured in [\`<injected_file>\`](file:///<absolute_path>)
- **Live Dashboard / Activation URL**:
  🔗 [<dashboard_url>](<dashboard_url>)
- **User Account**: <User Account Status>

---

### 📦 Changes & Git Status
- Changes automatically committed to Git (Commit: \`<hash>\`).
- AI Skill ready: [\`.agents/skills/shiplens/SKILL.md\`](file:///<skill_path>).

> [!IMPORTANT]
> **Project Pending Activation (Analytics not active yet)**
> **Please share your email**: Click the link in the email to complete registration, activate 50,000 free monthly events (~5,000 visitors), and bind your project to your account. Once activated, you can chat directly with me to query and analyze product data.
\`\`\`

**User Account Status Evaluation**:
- **State a**: \`Logged In (Project linked to account)\` / \`已登录（项目已于账号关联）\` — Local credentials exist and project is linked to user account.
- **State b**: \`Logged In (Project not linked to account)\` / \`已登录（项目和账号未关联）\` — Local credentials exist but project could not be linked.
- **State c**: \`Not Logged In (Project unlinked)\` / \`未登录（项目和账号可能未关联）\` — **Default state for first-time CLI installation or unauthenticated environments**.

### Step 4. Request Email for Quota Activation
- Prompt user for email address to activate **50,000 monthly events** free tier.
- Send Magic Link email via \`POST /api/auth/start-email\` (or \`shiplens auth bind --email <email> --json\`).

---

## 2. Core CLI Commands Reference

| Command | Purpose |
| :--- | :--- |
| \`shiplens doctor --json\` | End-to-end diagnostics on config, SDK, network, and credentials |
| \`shiplens summary --range 7d --json\` | Product overview: PV, UV, bounce rates, top geos, devices |
| \`shiplens query --metric <m> --range 7d --json\` | Multi-dimensional metric queries & funnels |
| \`shiplens sql --query "<sql>" --json\` | Execute secure read-only SQL on ClickHouse |
| \`shiplens pages --range 7d --json\` | Page-level visits and average dwell times |
| \`shiplens paths --range 7d --json\` | Sankey user flow and transition paths |
| \`shiplens heatmap --template <id> --json\` | Click heatmaps & skeleton wireframes |
| \`shiplens dashboards create --title "..." --prompt "..." --json\` | Generate AI responsive dashboards |
| \`shiplens auth bind --email <email> --json\` | Trigger Magic Link email binding |

---

## 3. Dynamic Overrides & Adaptive Learning Protocol

When executing analytics requests (such as user prompts matching standard scenarios like \`What stage is my product in? What metrics should I track?\`), you must follow this 5-step protocol:

1. **Step 1 - Check Dynamic Overrides (Priority 1)**:
   - Check if \`.shiplens/learnings.md\` exists in the project root.
   - If present, apply any user-specified overrides (e.g. customized date range \`--range 14d\`, preferred metrics, custom funnel steps).
2. **Step 2 - Context Grounding**:
   - Check and read \`.shiplens/contexts/<app_id>.md\` (or run \`shiplens context show --json\`) to ground telemetry figures in real button labels and route semantics.
3. **Step 3 - Deterministic CLI Execution (Priority 2 Base)**:
   - Run the matched CLI command sequence with any overrides applied.
4. **Step 4 - Business Synthesis**:
   - Synthesize data into actionable takeaways and optimization levers.
5. **Step 5 - Adaptive Learning**:
   - If the user corrects your analysis (e.g. *"I need a 14-day window"* or *"Track signup completion as the final funnel step"*), immediately record the preference rule into \`.shiplens/learnings.md\` for future automatic reuse.

---

## 4. SQL Standards & Guidelines

- **Table Name**: \`events\` (Read-only ClickHouse instance)
- **Key Columns**:
  - \`timestamp\` (DateTime), \`event_name\` (String), \`user_id\` (String), \`session_id\` (String)
  - \`template_id\` (String - DOM structure hash), \`page_path\` (String), \`referrer\` (String)
  - \`properties\` (Map/JSON - custom event metadata)
- **Rules**:
  - Always apply time filters: \`timestamp >= now() - INTERVAL 7 DAY\`.
  - Always specify \`LIMIT\` (maximum 1000 rows).
  - Use ClickHouse aggregate functions: \`countIf()\`, \`quantile(0.50)()\`, \`dateDiff()\`.
`;

module.exports = { SKILL_CONTENT };
