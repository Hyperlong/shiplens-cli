# 🚀 Shiplens CLI (Official Public Preview)

> **Official Shiplens CLI — Zero-dependency Automated Web Analytics & Telemetry Engine for Developers and AI Agents.**

[![Release](https://img.shields.io/github/v/release/Hyperlong/shiplens-cli.svg)](https://github.com/Hyperlong/shiplens-cli/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-success.svg)](https://shiplens.dev)
[![Infrastructure](https://img.shields.io/badge/Infrastructure-EU%20Cloud-blue.svg)](https://shiplens.dev)

---

Shiplens CLI is the official zero-dependency command-line tool for [shiplens.dev](https://shiplens.dev). Built as a self-contained native program with zero Node.js/Python runtime prerequisites, it provides automated telemetry instrumentation for modern web frontend applications and pairs with AI coding agents (Cursor, Windsurf, Codex, Claude, Antigravity, etc.) for conversational data analysis and real-time dashboards.

---

## ⚡ Quick Start (Zero Prerequisites)

Install and initialize in the root directory of any local project with a single command:

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/Hyperlong/shiplens-cli/main/init.ps1 | iex
```

**macOS / Linux**:
```bash
curl -fsSL https://raw.githubusercontent.com/Hyperlong/shiplens-cli/main/init.sh | bash
```

> **Note**: If you are using the Node.js / NPM workflow, you can also run `npx @shiplens/cli init`.

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

