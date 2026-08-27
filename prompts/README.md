# Shiplens Prompt Libraries

This directory hosts the deterministic CLI scenario-based prompt libraries for Shiplens.

---

## 📁 Directory Structure

```text
prompts/
├── README.md                 # Prompt architecture overview
└── prompts_cli_en-US.md      # [English] 42 deterministic CLI analysis scenarios
```

---

## ⚡ Execution & Dynamic Overrides

1. **Deterministic Execution**: Every scenario provides explicit, reproducible CLI commands and SQL queries paired with textbook analytical foundations.
2. **Dynamic Overrides**: Local rules defined in `.shiplens/learnings.md` override default parameters (such as `--range`, `--grain`, or target funnel routes) during AI Agent execution.
3. **Scenario Outline**: Each file includes a categorized outline at the top for quick scenario discovery. Agent should read the outline first, then jump to the matching scenario.

## 🌐 Multilingual Architecture

- Scenario IDs, titles, and structure are **1:1 aligned** across languages.
- Add new languages by creating `prompts_cli_<lang>.md` with the same outline structure and scenario ordering.