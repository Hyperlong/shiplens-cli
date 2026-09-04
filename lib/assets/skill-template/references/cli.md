# Shiplens CLI 使用参考手册

本文档详细说明 Shiplens CLI 的各命令接口、参数说明及返回结构。

## 全局参数 (Global Flags)

| 参数 | 类型 | 说明 |
|---|---|---|
| `--json` | boolean | 强制以标准 JSON 格式输出（Agent 交互必须携带） |
| `--app-id <id>` | string | 显式指定目标应用 ID（覆盖当前目录配置） |
| `--env <env>` | string | 环境选择：`production`（默认）或 `staging` |
| `--secret <token>` | string | 显式传入 Access Secret 凭证 |
| `--api-url <url>` | string | 自定义 Shiplens API 服务地址 |
| `-v, --version` | boolean | 查看 CLI 版本号 |
| `-h, --help` | boolean | 查看帮助信息 |

---

## 核心命令与用法

### 1. `shiplens init`
用于新项目 15 秒零配置接入埋点。
```bash
shiplens init [--name <name>] [--description <desc>] [--genre <genre>] [--subgenre <subgenre>] [--tags <tags>] [--email <email>] [--json]
```
- 自动识别前端框架（Next.js, Vite, React, Vue, Nuxt, HTML 等）；
- 自动安装 `@shiplens/sdk` 并注入初始化代码；
- 在项目根目录生成 `.shiplens.json` 关联凭据与 App ID；
- 自动执行一次 Git 提交（可传入 `--no-commit` 禁用）。

### 2. `shiplens summary`
获取产品大盘与关键遥测摘要。
```bash
shiplens summary [--range 24h|7d|30d] [--env production] [--json]
```
返回字段包含：
- `total_pv`: 统计周期内总页面浏览量
- `total_uv`: 独立访客数
- `avg_session_duration_s`: 平均会话停留时长（秒）
- `bounce_rate`: 单页跳出率 (0.0 - 1.0)
- `top_countries`: 访客来源国家分布
- `top_devices`: 访问设备类型分布（Desktop, Mobile, Tablet 等）

### 3. `shiplens query`
灵活聚合查询多维时序指标与细分。
```bash
shiplens query --metric <name> [--range 7d] [--grain day|hour] [--group-by <dimension>] [--filter <k=v>] [--limit 30] [--json]
```
- 支持查询指标：`pageviews`, `visitors`, `sessions`, `clicks` 等；
- 支持同时传入多个指标：`--metrics pageviews,visitors`；
- 支持 `--file <path>` 从 JSON 配置文件读取复杂嵌套面板查询。

### 4. `shiplens pages`
获取页面访问量与停留时长排行。
```bash
shiplens pages [--range 7d] [--limit 10] [--json]
```
返回各路径/模板的 PV、UV 及平均停留时长（`avg_duration_s`）。

### 5. `shiplens paths` & `shiplens canvas`
分析用户流转路径与全站行为画布拓扑。
```bash
shiplens paths [--range 7d] [--json]
shiplens canvas [--range 7d] [--json]
```
- `paths`: 呈现 Top 入口页、Top 退出页与高频跳转路径；
- `canvas`: 返回全站用户行为图谱的节点（`nodes`）与边（`edges`）。

### 6. `shiplens heatmap`
获取指定页面模板的点击热力图与骨架图。
```bash
shiplens heatmap --template <template_id> [--dom-hash <hash>] [--env production] [--json]
```
返回字段包含：
- `clicks_total`: 该模板总点击次数；
- `skeleton_svg_url`: 页面元素黑白灰色块骨架图预览地址；
- `elements`: 点击高发元素列表（含选择器、点击数、点击率、坐标百分比 `x_pct`, `y_pct`）。

### 7. `shiplens dashboards`
管理与 AI 一键创建可视化业务看板。
```bash
# 查看已有看板
shiplens dashboards list [--json]

# 自然语言一键创建看板
shiplens dashboards create --ai --prompt "关注新注册用户的次日留存与核心转化漏斗" --title "新用户转化看板" [--json]
```

### 8. `shiplens sql`
直接通过 ClickHouse 安全只读查询分析底层事件。
```bash
shiplens sql --query "SELECT event_name, count() FROM events WHERE app_id = 'xxx' GROUP BY event_name" [--json]
# 或通过标准输入
echo "SELECT count() FROM events" | shiplens sql --stdin [--json]
```

### 9. `shiplens doctor`
全面诊断本地环境、SDK 状态、网络连通性与凭据。
```bash
shiplens doctor [--json]
```
检查项包括：
- `local_config`: 是否在包含 `.shiplens.json` 的有效项目目录中；
- `sdk_dependency`: `package.json` 中是否包含 `@shiplens/sdk`；
- `code_injection`: 入口文件中是否已正确注入 `initShiplens`；
- `ingestion_connectivity`: 与 Shiplens 云端 API 的网络连通性及延迟；
- `auth_credential`: Access Secret 凭据状态；
- `email_binding`: 是否已绑定邮箱激活配额；
- `schema_freshness`: 本地缓存架构更新时效。

### 10. `shiplens auth`
认证与权限管理。
```bash
shiplens auth status [--json]
shiplens auth bind --email <email> [--json]
shiplens auth set --secret-stdin
shiplens auth whoami [--json]
shiplens auth logout
```

### 11. `shiplens action`
调取场景化分析专家动作与预设。
```bash
# 列出所有分析场景预设
shiplens action list [--json]

# 获取特定场景步骤与推荐命令
shiplens action funnel-analysis [--json]
```

---

## 错误代码速查表 (Error Codes)

| 错误代码 | 含义 | 建议应对 |
|---|---|---|
| `CLI_NOT_INSTALLED` | CLI 未安装 | 运行 `setup.ps1` 或 `setup.sh` 安装 |
| `APP_NOT_FOUND` | 未检测到项目关联 | 执行 `shiplens init` 或传入 `--app-id` |
| `AUTH_REQUIRED` | 需鉴权高级功能 | 执行 `auth bind` 或 `auth set --secret-stdin` |
| `NETWORK_FAILED` | 网络连接失败或超时 | 检查网络连通性并按指数退避重试 |
| `RATE_LIMITED (429)` | 请求频率受限 | 暂停高频调用，退避 1~4 秒后重试 |
| `INVALID_ARGS` | 命令参数缺失或非法 | 执行 `shiplens <command> --help` 确认用法 |
