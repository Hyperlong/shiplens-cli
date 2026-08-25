# 🚀 Shiplens CLI (In Development)

> **Fast User Telemetry, Instant SDK Instrumentation & AI Analytics Engine for Modern Web Apps.**

[![npm version](https://img.shields.io/npm/v/shiplens-cli.svg)](https://www.npmjs.com/package/shiplens-cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](package.json)
[![Status](https://img.shields.io/badge/status-active%20development-orange.svg)]()

---

> [!NOTE]
> **Active Development Preview**: This package is currently in active development. Features and API endpoints are being iterated rapidly. 50,000 monthly telemetry events are included for free upon registration.

---

## ⚡ Instant Setup (Under 15 Seconds)

Run in the root of any Next.js, Vite, Vue, or HTML project:

```bash
# Zero-install execution via npx
npx --yes shiplens-cli init --json
```

### What `init` Does Automatically:
1. **Detects Framework**: Automatically recognizes Next.js (App / Pages router), Vite (React / Svelte), Vue 3, or plain HTML.
2. **Injects Tracking SDK**: Inserts `@shiplens/sdk` tracking snippets into your entry files without breaking your code layout.
3. **Connects Cloud Project**: Registers the project, generates a live responsive dashboard URL, and writes local configuration (`.shiplens.json`).
4. **Installs Dependency**: Adds `@shiplens/sdk` via your project package manager (`npm`, `pnpm`, `yarn`, or `bun`).
5. **Deploys AI Skills**: Injects `.agents/skills/shiplens/SKILL.md` and Cursor rules (`.cursor/rules/shiplens.mdc`) for seamless LLM Agent integration.
6. **Performs Git Commit**: Automatically commits all instrumentation changes atomically.

---

## 🧠 Dynamic Overrides & Adaptive Learning

Shiplens introduces an adaptive learning loop for AI Agents:

```text
[User Prompt] ➔ [Match Preset] ➔ [Apply .shiplens/learnings.md (Priority 1)] ➔ [Execute CLI] ➔ [Update Learnings]
```

- **Priority 1 (Dynamic Overrides)**: Local `.shiplens/learnings.md` rules always override default CLI parameters (e.g. customized date ranges, funnel goals, or granular filters).
- **Priority 2 (Deterministic Base)**: Standard 42 scenario-based CLI execution presets in `prompts/cli/prompt_cli_en.md`.

---

## 📊 Core Commands

| Command | Description |
| :--- | :--- |
| `npx shiplens-cli init --json` | 15-second zero-config analytics onboarding |
| `npx shiplens-cli doctor --json` | End-to-end diagnostics on SDK, network, and credentials |
| `npx shiplens-cli summary --range 7d --json` | Traffic overview: PV, UV, bounce rates, geos, devices |
| `npx shiplens-cli query --metric pageviews --json` | Multi-dimensional metrics & funnel queries |
| `npx shiplens-cli sql --query "<sql>" --json` | Sandboxed read-only ClickHouse SQL execution |
| `npx shiplens-cli pages --range 7d --json` | Page-level visits and average dwell times |
| `npx shiplens-cli paths --range 7d --json` | User journeys and Sankey transition paths |
| `npx shiplens-cli heatmap --template <id> --json` | Click heatmaps & skeleton wireframe snapshots |
| `npx shiplens-cli dashboards create --prompt "..." --json` | AI-driven dashboard generation |
| `npx shiplens-cli auth bind --email <email> --json` | Request Magic Link for quota activation & authorization |
| `npx shiplens-cli auth configure --client cursor --json` | Auto-configure MCP servers in IDEs |

---

## 🔒 Security & Sandboxing

- **Tenant Isolation**: Strict per-project `app_id` isolation across all telemetry queries.
- **Read-Only ClickHouse Sandbox**: AST query validator enforces `SELECT`-only operations, mandatory time bounds, and maximum 1000-row limits.
- **Safe Secrets Handling**: Credential tokens and secrets are automatically masked in all console outputs (`sk_live_...9f2a`).

---

## 📁 Documentation & Prompts

- [CLI Architecture & Roadmap](./docs/01_CLI_ARCHITECTURE_AND_ROADMAP.md)
- [Complete Command Reference](./docs/02_CLI_COMMAND_REFERENCE.md)
- [AI Skill & Dynamic Overrides Spec](./docs/03_SKILL_SPEC_AND_PROMPTS.md)
- [CLI Execution Prompts (42 Scenarios)](./prompts/cli/prompt_cli_en.md)
- [Web Showcase Prompts (42 Scenarios)](./prompts/web/prompt_web_en.md)
- [Backend API Specification](./docs/BACKEND_API_SPEC.md)
- [Project Context Specification](./docs/SHIPLENS_CONTEXT_API_SPEC.md)

---

## 📜 License

Apache-2.0 © Shiplens Team
