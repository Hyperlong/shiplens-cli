# 🚀 Shiplens CLI (in develop)

> **Official Shiplens CLI (in develop) — Automated Web User Analytics & AI Agent Analysis Engine.**

[![npm version](https://img.shields.io/npm/v/@shiplens/cli.svg)](https://www.npmjs.com/package/@shiplens/cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](package.json)

---

Shiplens CLI (in develop) is the official command-line tool for [shiplens.dev](https://shiplens.dev). It provides automated analytics instrumentation for modern web frontend applications and seamlessly pairs with AI coding agents (Cursor, Windsurf, Codex, Claude, Antigravity, etc.) for conversational data analysis and real-time dashboards.

---

## 🌟 Key Features

- **Automated Setup & Instrumentation**: Automatically detects frontend frameworks (Next.js, Vite, Vue, HTML, etc.) and injects `@shiplens/sdk` tracking code.
- **Web User Analytics**: Real-time traffic summaries, user journeys, retention cohorts, and click heatmaps.
- **AI Agent Intelligence**: Query and analyze product behavior data directly from AI coding assistants via CLI and local stdio MCP proxy (`shiplens mcp serve`).
- **AI-Powered Live Dashboards**: Assemble 12-column responsive analytics dashboards from natural language prompts.
- **Business Context & Adaptive Learning**: Automatically maps DOM hashes to real page names and remembers per-product analysis preferences.

---

## ⚡ Quick Start

Run the initialization command in the root directory of any local frontend project:

```bash
# General terminal
npx --yes @shiplens/cli init

# Windows PowerShell
npx.cmd --yes @shiplens/cli init

# Backup mirror fallback
npx --yes --registry=https://registry.npmmirror.com @shiplens/cli init
```

---

## 📊 Core Commands Reference

| Command | Description |
| :--- | :--- |
| `shiplens init` | Integrate local project with analytics (register product, install tracking SDK, and inject AI skill) |
| `shiplens summary` | Macro traffic overview (PV, UV, dwell time, geos, devices) |
| `shiplens query` | Multi-dimensional metrics aggregation and conversion funnels |
| `shiplens sql` | Safe read-only custom SQL queries |
| `shiplens pages` | Page-level visits and average dwell times |
| `shiplens heatmap` | Visual click heatmaps and skeleton wireframe snapshots |
| `shiplens dashboards create` | Generate live AI dashboards from natural language |
| `shiplens doctor` | End-to-end diagnostics on SDK, network, and configuration |
| `shiplens context show` | Inspect business context and page semantic mappings |
| `shiplens auth bind` | Request Magic Link to activate authorization and event quota |
| `shiplens mcp serve` | Start local stdio MCP proxy for AI IDEs and Agents |

---

## 🔗 Resources

- Website: [https://shiplens.dev](https://shiplens.dev)
- Support & FAQ: [https://shiplens.dev/faq](https://shiplens.dev/faq)
- Command Reference: [`docs/02_CLI_COMMAND_REFERENCE.md`](./docs/02_CLI_COMMAND_REFERENCE.md)

---

## 📜 License

Apache-2.0 © Shiplens Team

