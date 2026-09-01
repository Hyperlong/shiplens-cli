# Shiplens Frontend Telemetry SDK Contract Evolution & Backend/SDK Team Collaboration Proposal

> **Positioning**: Collaboration specification for Shiplens SDK team and Backend engineers.  
> **Core Principle**: Strict **Zero Source Code Intrusion** on existing SDK. This document outlines enhancement recommendations for subsequent SDK/Backend releases.

---

## 📋 1. Background & Alignment Objectives

With Shiplens CLI upgrading to v2.0 deterministic static semantic extraction, the CLI outputs 100% idempotent, collision-free Control IDs (e.g. `btn_b64file_download`) as well as paired `.shiplens/contexts/<app_id>.json` (machine index) and `<app_id>.md` (business intent) dictionaries.

To enable client-side click events aggregated in ClickHouse to align with CLI dictionaries at millisecond latency and maximum fidelity, the following enhancements are recommended for future SDK releases.

---

## 🛠️ 2. Recommended Enhancements

### 1. Parent Context Capture for Disambiguation (`parent_context`)
- **Current State**: `createClickEvent` captures target `tagName`, `innerText` (truncated to 50 chars), and selectors. In multi-card workflows (e.g. separate Input and Output cards each having a "Copy" or "Clear" button), text alone may be ambiguous.
- **Recommendation**: In `createClickEvent`, inspect `element.closest('section, article, [data-card], .card, [role="region"], fieldset, form')` to extract parent container title/name and attach `parent_context` under event `properties`.

### 2. Dynamic View Context for SPAs & Canvas (`window.shiplens.setPageContext`)
- **Current State**: Single Page Applications (Drawflow / Excalidraw / multi-tab tools) often have a static URL `/`.
- **Recommendation**: Export `window.shiplens?.setPageContext(viewName: string)` to allow host apps to declare active sub-views (e.g. `node_library`, `export_modal`), attaching `view_context` to subsequent events.

### 3. Maintain Top Priority for Explicit Attribute (`data-shiplens-label`)
- **Current State**: SDK already inspects `dataset.shiplensLabel`.
- **Requirement**: Guarantee `data-shiplens-label` remains top priority across all SDK versions.

---

## 📊 3. Telemetry Ingestion Contract Overview

| Field | Type | Source | Purpose |
| :--- | :--- | :--- | :--- |
| `path` | `String` | `window.location.pathname` | Route alignment |
| `target_text` | `String` | `innerText` (50 chars) | Text dictionary match |
| `target_tag` | `String` | `tagName.toLowerCase()` | Component type match |
| `label` | `String (Optional)` | `data-shiplens-label` | Explicit override ID |
| `parent_context` | `String (Optional)` | Closest container heading | Section disambiguation |
| `view_context` | `String (Optional)` | `setPageContext(view)` | SPA sub-canvas routing |
