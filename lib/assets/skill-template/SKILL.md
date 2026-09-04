---
name: shiplens
description: >-
  Web 前端无感用户行为分析引擎与开发工具。用于网站与 Web 应用的 PV/UV 流量统计、留存分析、漏斗转化、用户流转动线（路径分析与行为画布）、Top 访问页面与停留时长、点击热力图与骨架图呈现、AI 数据看板生成、ClickHouse SQL 查询、埋点初始化接入、环境诊断与数据体检。用户提到 PV、UV、留存率、流失率、转化漏斗、用户动线、跳出率、停留时间、点击热力图、骨架图、埋点、前端监控、无感采集、数据看板、A/B测试指标、数据体检、shiplens cli、@shiplens/cli 或 shiplens 数据分析时使用。日常分析优先通过 CLI 获取结构化数据；需要统计学推断时按需读取理论参考库。
---

# Shiplens Web 分析引擎与 CLI

当前 Skill 版本：1.0.0
支持 CLI 最低版本：1.7.0

通过 Shiplens 官方 CLI (`shiplens`) 实时获取产品真实遥测数据并进行智能分析。日常分析任务**优先调用 CLI 获取结构化数据**；禁止在未检查 CLI 状态的情况下直接猜测数据或翻阅未同步的本地静态文件。

## 首次检查与运行时探活（Runtime Health Check）

每个 Session 第一次激活此 Skill 时，先运行一次无副作用的状态探活。同一 Session 后续调用直接复用探活得到的 `<binary_path>` 与 `app_id`，不得重复检查。

### 1. 运行探活命令

优先运行当前 Skill 内置的自检脚本或全局命令：

```bash
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File <skill-dir>/scripts/run.ps1 status

# macOS / Linux
bash <skill-dir>/scripts/run.sh status

# 备用（若脚本不可用直接探活系统命令）
shiplens.cmd doctor --json   # Windows
shiplens doctor --json       # macOS / Linux
```

### 2. 状态机响应分支

根据返回的 JSON 处理：

1. `installed=false`：系统未安装 Shiplens CLI。向用户简要说明后请求授权安装，用户同意后运行：
   - Windows: `powershell -ExecutionPolicy Bypass -File <skill-dir>/scripts/setup.ps1`（或 `npm.cmd install -g @shiplens/cli`）
   - macOS/Linux: `bash <skill-dir>/scripts/setup.sh`（或 `npm install -g @shiplens/cli`）
2. `local_config.status="fail"` 或缺失 `app_id`：当前工作区尚未关联 Shiplens 项目。
   - 若用户正在接入埋点，引导执行 `shiplens init --json` 完成 15 秒自动化接入与项目注册；
   - 若用户要分析特定已有项目，提示用户传入 `--app-id <id>`。
3. `auth_credential.status="warn"` 或未鉴权：基础查询功能可用；若需使用 AI 生成看板或导出高阶数据，引导进行安全鉴权（参见[账号与鉴权安全规范](#账号与鉴权安全规范)）。
4. `email_binding.status="warn"`：配额未激活，引导执行 `shiplens auth bind --email <email>`。

探活成功后，提取输出中的绝对二进制路径 `<binary_path>`（Windows 下如 `C:\...\npm\shiplens.cmd`）用于后续所有命令。下文 `<CLI>` 均指代该可执行路径。

---

## 确定性场景命令路由表（Command Playbook）

所有分析查询命令**必须带 `--json` 参数**，以便 Agent 解析结构化数据。

| 用户目标 / 意图 | 核心命令（基于 `<CLI>`） | 关键参数与说明 | 边界与交付原则 |
|---|---|---|---|
| **项目初始化与埋点接入** | `<CLI> init --json` | `--name <名> --genre <品类> --email <邮箱>` | 自动探测前端框架、注入 SDK 代码并生成 `.shiplens.json` |
| **产品核心流量与大盘概览** | `<CLI> summary --json` | `--range 24h\|7d\|30d --env production` | 返回总 PV、UV、平均会话时长、跳出率、Top 国家与设备 |
| **多维指标趋势与转化漏斗** | `<CLI> query --metric <name> --json` | `--metrics pageviews,visitors --range 7d --grain day\|hour --group-by <dim>` | 聚合查询时序趋势或按维度下钻；多指标逗号分隔 |
| **页面访问排行与停留时长** | `<CLI> pages --json` | `--range 7d --limit 10` | 诊断高频访问页面与跳出严重的低停留页面 |
| **用户流转路径与桑基图** | `<CLI> paths --json` | `--range 7d` | 获取 Top 入口页、Top 退出页与高频流转动线对 |
| **全局行为拓扑画布** | `<CLI> canvas --json` | `--range 7d` | 提取全站页面跳转关系网络与连线权重（节点/边） |
| **页面点击热力图与骨架图** | `<CLI> heatmap --template <id> --json` | `--dom-hash <hash> --env production` | 返回点击高发元素、坐标百分比及 `skeleton_svg_url` 骨架图预览 |
| **一键生成 AI 业务看板** | `<CLI> dashboards create --ai --json` | `--prompt "<自然语言需求>" --title "<看板名>"` | 云端智能编排指标看板，直接返回可视化 Web URL |
| **ClickHouse 底层 SQL 透视** | `<CLI> sql --query "<SQL>" --json` | 安全只读查询分析数据库底层事件表 | 用于极细粒度的复杂下钻推断 |
| **数据分析场景专家预设** | `<CLI> action <action_id> --json` | 如 `funnel-analysis`, `retention-churn`, `ab-sample` | 获取权威分析动作步骤、必查命令序列与理论基础 |
| **系统与环境健康体检** | `<CLI> doctor --json` | 全面检查本地配置、SDK 埋点生效、网络延迟与鉴权 | 排查“为何没有收到数据”的首选命令 |

---

## 账号与鉴权安全规范

Shiplens 遵循极简与安全的鉴权闭环：

### 1. 邮箱激活配额（公开推荐）
若用户未激活项目额度，引导用户提供邮箱，执行：
```bash
<CLI> auth bind --email user@example.com --json
```
CLI 将自动下发 Magic Link 激活邮件并写入设备环境文件，用户点击邮件后立即获得云端配额与 MCP 端点。

### 2. Access Secret 安全注入（绝不明文泄露）
当用户需配置离线 API Token / Secret 时：
- **严禁**要求用户在对话中明文贴出 Secret；
- **严禁**在回答中复述或回显用户提供的任何完整密钥；
- 必须使用标准输入模式注入：
  ```bash
  # 通过进程 stdin 安全传入
  <CLI> auth set --secret-stdin
  ```
- 配置完成后执行 `<CLI> auth status --json` 进行单次校验验收。

---

## 数据不足时的确定性降级规范

当查询结果样本不足或未达统计预期时，**严禁直接放弃分析或仅回复“数据不足”**，必须按三级降级模式输出有边界的价值结论：

1. **标准模式（Full Statistical Confidence）**：数据样本满足要求时，输出完整指标、显著性检验及因果推断。
2. **降级模式（Directional Observation）**：样本量较少或时间窗口短（如接入不足 7 天）时，使用所有已有数据，明确标注为“阶段性/方向性信号”，输出样本数、基线、漏斗转化断点或趋势方向，但不得断言统计显著。
3. **最低可行模式（Baseline & Diagnostics）**：仅有零星访问记录时，输出当前客观描述性统计、数据管道健康状况，并给出提升数据采集覆盖度的具体工程建议。
4. **429 限流与网络异常**：若 API 返回 429 或连接超时，遵循指数退避重试（间隔 1s, 2s, 4s），不向服务端无序高频刷屏重试。

---

## 结果呈现规范

呈现数据分析报告时，遵循以下结构：
1. **核心发现与结论（TL;DR）**：一句话指出最关键的指标变化或异常瓶颈点。
2. **核心指标摘要**：使用简洁表格呈现 PV/UV、转化率、停留时长等事实数据。
3. **深入洞察与流转证据**：引用 `pages`、`paths` 或 `heatmap` 的具体数据支撑分析。
4. **下一步行动建议（Actionable Next Steps）**：针对发现的问题给出针对性优化方案或实验建议。

---

## 按需读取参考资料

- **统计学推断、A/B 实验设计与 36 个分析场景 Prompt**：读取 [数据分析理论与 Prompt 库](references/analytics-theory.md)。
- **CLI 完整参数与命令手册**：读取 [CLI 详细手册](references/cli.md)。
