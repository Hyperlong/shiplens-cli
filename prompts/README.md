# Shiplens Prompt Libraries

This directory hosts the deterministic CLI scenario-based prompt libraries for Shiplens.

---

## 📁 Directory Structure

```text
prompts/
├── README.md                 # Multilingual architecture overview
├── prompts_cli_en.md         # [English - Official] Deterministic CLI execution presets (42 Scenarios)
└── ...                       # Future language extensions (ja, ko, de, fr, es, etc.)
```

---

## ⚡ Execution & Dynamic Overrides

1. **Deterministic Execution**: Every scenario in `prompts_cli_en.md` provides explicit, reproducible CLI commands and SQL queries paired with textbook analytical foundations.
2. **Dynamic Overrides**: Local rules defined in `.shiplens/learnings.md` override default parameters (such as `--range`, `--grain`, or target funnel routes) during AI Agent execution.