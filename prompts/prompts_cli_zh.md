# Shiplens CLI 执行版 Prompt 预设库

---

## 场景全景提纲 (42 个场景)

> **使用方式**：扫描提纲定位匹配场景，跳转至正文对应章节获取确定性 CLI 命令与分析步骤。

### 基础数据分析 (3)
1. [我的产品在什么阶段？我应该关注什么数据？](#我的产品在什么阶段我应该关注什么数据)
2. [本周数据表现如何？](#本周数据表现如何)
3. [产品迭代后分析](#产品迭代后分析)

### 产品需求验证 (3)
4. [用户到底需不需要我的产品？](#用户到底需不需要我的产品)
5. [我是否有一群长期使用的铁杆用户？他们的行为特征是什么？](#我是否有一群长期使用的铁杆用户他们的行为特征是什么)
6. [我每天最应该盯着哪一个数字？](#我每天最应该盯着哪一个数字)

### 用户激活与体验 (4)
7. [新用户从第一次进入产品到用上功能感到满意共花了多长时间？](#新用户从第一次进入产品到用上功能感到满意共花了多长时间)
8. [新用户在体验过程中到底卡在哪一步了？](#新用户在体验过程中到底卡在哪一步了)
9. [用户的什么行为代表他会长时间的使用我的产品？](#用户的什么行为代表他会长时间的使用我的产品)
10. [我的新用户来自哪？有什么特点？](#我的新用户来自哪有什么特点)

### 获客质量 (1)
11. [是否有渠道在给我的产品导入假用户？](#是否有渠道在给我的产品导入假用户不同渠道的用户他们在进入产品之后的具体行为数据如何)

### A/B测试 (4)
12. [A/B Test 数据效果对比](#ab-test-数据效果对比)
13. [我的 A/B 测试结果靠谱吗？](#我的-ab-测试结果靠谱吗本次对比符合实验标准吗)
14. [有没有一个综合分数能告诉我产品在变好还是变差？](#做了很多次迭代有没有一个综合分数能告诉我产品整体在变好还是变差)
15. [怎么做一次"假实验"来检验测试系统？（A/A 测试）](#怎么做一次假实验来检验测试系统本身没出问题aa-测试)

### 用户留存与流失 (5)
16. [哪些用户正在悄悄变得不活跃？](#哪些用户正在悄悄变得不活跃能不能在他们彻底走之前抓住他们)
17. [有什么指标能提前预测用户即将流失？](#有什么指标或特征能提前预测用户即将变得不活跃)
18. [付高价的用户是真满意还是随时准备退订？](#付高价买产品的用户是真的满意还是在白白浪费钱随时准备退订)
19. [用户主要在用哪些功能才是健康的表现？](#我的产品功能很多用户主要在用哪些功能才是健康的表现)
20. [快要流失的用户应该优先挽回哪些人？](#快要流失的用户那么多我应该优先花精力去挽回哪些人)

### 商业化与变现 (5)
21. [用户订阅前行为分析](#用户订阅前行为分析)
22. [订阅用户洞察](#订阅用户洞察)
23. [每个用户整个周期能赚多少钱？（LTV）](#每个用户在他使用产品的整个周期里能给我赚多少钱)
24. [获客成本合理吗？多久回本？（CAC）](#我花在获取每个用户上的钱合理吗多久才能回本)
25. [应该选免费增值还是限时免费试用？](#我应该让用户永久免费用基础版还是给有限时间的免费试用)
26. [免费用户活跃到什么程度值得做付费推广？（PQL）](#免费用户活跃到什么程度我才值得花钱对他做付费推广或人工跟进)

### 自传播与团队效率 (4)
27. [产品有没有自传播能力？](#我的产品有没有自传播能力用户会不会主动带来新用户)
28. [我到底是在改进产品还是做无关紧要的事？](#我到底是在真正改进产品还是只在做一些无关紧要的事)
29. [是不是在做一堆没人要的功能？](#我是不是在做一堆没人要的功能怎么避免白费力气)
30. [一大堆改进点子，先做哪一个？（ICE 评分）](#手头有一大堆想改进的点子怎么决定先做哪一个)

### 创建数据看板 (2)
31. [创建30天新用户每日留存矩阵看板](#创建30天新用户每日留存矩阵看板)
32. [创建顺序流程步骤转化漏斗看板](#创建顺序流程步骤转化漏斗看板)

### 进阶配置与追踪 (3)
33. [A/B Test 数据记录配置](#ab-test-数据记录配置)
34. [设置并统计用户的 Aha Moment](#设置并统计用户的-aha-moment)
35. [记录订阅金额并创建每日订阅看板](#记录订阅金额并把用户的使用和订阅行为关联起来创建每日订阅看板)

### Shiplens配置 (4)
36. [Shiplens CLI 一键接入与统计初始化](#shiplens-cli-一键接入与统计初始化)
37. [删除 Shiplens SDK 与数据](#我不再需要统计数据删除-shiplens-的数据统计sdk与数据)
38. [删除 Shiplens CLI](#删除-shiplens-cli)
39. [为项目所有页面和按钮生成文本描述](#让-ai-理解每个数字背后的真实业务为项目的所有页面和按钮生成文本描述)

### 数据统计问题排查 (3)
40. [测试 Shiplens 数据链路与环境](#测试-shiplens-数据链路与环境是否正常)
41. [开启本地开发调试模式并自检事件上报](#开启本地开发调试模式并自检事件上报)
42. [测试软件打包与发布环境下的数据上报](#测试软件打包与发布环境下的数据上报)

---

## 1. 场景化 Prompt 快捷指令库

### 基础数据分析

#### [我的产品在什么阶段？我应该关注什么数据？] (拼接：数据获取后缀)
```text
我的产品在什么阶段？我应该关注什么数据？
1. 执行 `shiplens summary --range 7d --json` 提取总独立访客数（unique_visitors）、页面浏览量（pageviews）及日均活跃用户数（DAU）。
2. 执行 `shiplens query --metric daily_retention --range 30d --grain week --json` 获取近 4 周各同期群的 Day 1、Day 7、Day 14 与 Day 30 留存率矩阵。
3. 执行 `shiplens summary --range 30d --json` 计算近 30 天用户粘性比率（DAU / MAU）。
4. 综合判定生命周期阶段：
   - 若 Day 1 留存 < 20% 或 DAU/MAU < 0.10，判定为【PMF探索与激活期】，核心杠杆在于首次见效时长（TTV）与核心激活率；
   - 若 Day 30 留存稳定在 15%~25% 且曲线趋向水平渐近线，判定为【留存稳定期】，核心关注核心功能渗透率与次周留存；
   - 若留存稳固且活跃健康，判定为【规模化与商业化期】，核心关注 LTV/CAC 单位经济学与裂变 K 值。
5. 输出阶段评估结论、关键指标基准表与针对性的优化策略。
---
分析理论基础：
- 生命周期杠杆对齐：产品在不同生命周期阶段的核心增长杠杆截然不同：
  - PMF探索与激活期：核心在于短期留存（Day 1 / Day 7）与激活率，过早规模化获客会加速流失。
  - 留存稳定期：核心在于留存曲线趋平与 Day 30 渐近线，确认核心价值交付后再做规模扩张。
  - 规模化与商业化期：核心转向单位经济学（LTV/CAC）与推荐裂变（K值）。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第3章"确定增长杠杆"
```

#### [本周数据表现如何？] (拼接：数据获取后缀)
```text
本周数据表现如何？
1. 执行 `shiplens summary --range 7d --json` 提取最近 7 天的 UV、PV、会话数与平均停留时长。
2. 执行 `shiplens query --metric pageviews --grain day --range 14d --json`，将最近 7 天数据与前 7 天数据按日切片做周环比（WoW）增减量计算。
3. 读取本地 `.shiplens/contexts/<app_id>.md` 锁定核心功能页面，执行 `shiplens pages --range 14d --json` 比对核心功能页面的访问量与停留时长变动。
4. 执行 `shiplens query --metric bounce_rate --grain day --range 14d --json` 检查本周大盘跳出率是否异常上升。
5. 输出周报总结：大盘涨跌幅表、核心功能热度变化、异常点预警与增长机会点建议。
---
分析理论基础：
- 比例与趋势监测：宏观业务健康度需要结合比例指标与周环比趋势进行周期性审计：
  - 比例指标：衡量参与深度（如活跃天数占比、核心功能使用占比），比单纯的 DAU/MAU 更有力反映活跃质量。
  - 趋势指标：对比滚动时间窗口（如最近 7 天 vs 前 7 天）以消除日间波动噪声，及早发现异常退化。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第二部分, 第7章"使用高级指标分析客户分层"
```

#### [产品迭代后分析] (拼接：数据获取后缀)
```text
产品迭代后效果如何？
1. 执行 `shiplens query --metric pageviews --range 14d --grain day --json` 提取发版前 7 天与发版后 7 天的时序流量数据。
2. 执行 `shiplens pages --range 14d --json` 对比改版前后各功能模块的访问渗透率与平均停留时长。
3. 执行 `shiplens query --metric daily_retention --range 30d --grain week --json` 对比发版前 1 周同期群与发版后 1 周同期群的 Day 1、Day 7 留存率增量 Delta。
4. 执行 `shiplens query --metric bounce_rate --range 14d --grain day --json` 检查新功能上线后主要承接页面的跳出率是否恶化（> 10% 恶化判定为操作摩擦过大）。
5. 输出迭代成果评估卡：关键指标前后对比、迭代有效性判定（正向拉动/无显著影响/负向退化）及下一步调优方案。
---
分析理论基础：
- 成果验证优于产出：发布功能仅是产出（Output），唯有引发用户行为的正向改变才是业务成果（Outcome）。
- 前后同期群对比：通过对比上线前后同期群的留存曲线（Day 1/7/30）与阻碍指标（跳出率、首次操作耗时），评估迭代净收益；若留存下降，说明改动增加了认知负荷或操作摩擦力。
---
出处：
- 《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第四部分, 第16章"设定方向"
```

### 产品需求验证

#### [用户到底需不需要我的产品？] (拼接：数据获取后缀)
```text
用户到底需不需要我的产品？
1. 执行 `shiplens query --metric daily_retention --range 30d --json` 获取近 30 天每日留存率序列。
2. 检测留存曲线在 Day 14~Day 30 区间是否趋向水平渐近线：
   - 若 Day 30 留存率 >= 15% 且曲线斜率接近 0，判定具备健康的 PMF 行为信号；
   - 若留存曲线持续下滑跌向 0 且 Day 30 留存 < 5%，判定当前价值主张偏弱。
3. 执行 `shiplens summary --range 30d --json` 计算 DAU/MAU 活跃粘性比率，判断是否达到 0.20~0.25 的健康基准。
4. 综合输出 PMF 检验报告与产品定位调优建议。
---
分析理论基础：
- 行为留存渐近线：当同期群留存曲线在第 14~30 天趋于水平稳定（而非持续跌向零）时，标志着产品达到了真正的产品市场匹配（PMF）。
- 使用粘性指标：DAU/MAU 粘性比率超过行业基准（SaaS与工具类通常 > 0.20~0.25），表明产品已成为用户的刚需工作流。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第2章"判断产品是否不可或缺"
```

#### [我是否有一群长期使用的铁杆用户？他们的行为特征是什么？] (拼接：数据获取后缀)
```text
我是否有一群长期使用的铁杆用户？他们的行为特征是什么？
1. 执行 `shiplens query --metric daily_retention --range 30d --json` 确认 30 天留存尾部是否稳定在水平线上（确认存在铁杆留存基底）。
2. 执行 `shiplens sql --query "SELECT user_id, COUNT(*) AS event_count, COUNT(DISTINCT toDate(timestamp)) AS active_days FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY user_id ORDER BY event_count DESC LIMIT 50" --json` 提取使用频率前 5% 的高频铁杆用户。
3. 执行 `shiplens sql --query "SELECT properties.feature AS feature_name, COUNT(*) AS usage_count FROM events WHERE user_id IN (SELECT user_id FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY user_id ORDER BY count(*) DESC LIMIT 50) GROUP BY feature_name ORDER BY usage_count DESC LIMIT 10" --json` 统计铁杆用户最常搭配使用的功能组合。
4. 提取铁杆用户在注册首周（Day 0~7）的高频行为习惯，输出新手引导优化方案。
---
分析理论基础：
- 核心用户行为聚类：锁定活跃度前 5% 的核心用户，能提炼出最高价值的功能组合与操作路径。
- 留存曲线尾部平稳性：第 30 天留存尾部稳定在基准线以上（如 >= 15%），证实核心用户群存在；提炼其前 7 天的行为习惯，可反哺新用户引导流程。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第2章"判断产品是否不可或缺"
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第一部分, 第3章"同期群分析"
```

#### [我每天最应该盯着哪一个数字？] (拼接：数据获取后缀)
```text
我每天最应该盯着哪一个数字？
1. 读取 `.shiplens/contexts/<app_id>.md` 解析产品核心价值交付路径，推算最适合的北极星指标（North Star Metric，如核心产出量/关键互动完成数）。
2. 执行 `shiplens summary --range 7d --json` 提取当前核心业务数据总量与活跃基线。
3. 将北极星指标拆解为 2~3 个一级驱动指标（如 活跃用户数 × 人均核心操作频次）。
4. 输出北极星指标看板公式、日常监控阈值与迭代指引。
---
分析理论基础：
- 指标层级与价值对齐：建立从战略价值到日常执行的清晰指标金字塔：
  - 北极星指标：最能代表向用户交付核心价值的单一成果指标（如发送消息数、同步文件数）。
  - 一级驱动指标：直接乘积构成北极星指标的输入变量（如活跃团队数 x 人均操作量）。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第3章"确定增长杠杆"
- 《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第四部分, 第16章"设定方向"
```

### 用户激活与体验

#### [新用户从第一次进入产品到用上功能感到满意共花了多长时间？] (拼接：数据获取后缀)
```text
新用户从第一次进入产品到用上功能感到满意共花了多长时间？
1. 读取 `.shiplens/contexts/<app_id>.md` 锁定核心价值事件名称。
2. 执行 `shiplens paths --range 7d --json` 追踪新用户从初次访问（landing/pageview）到首次触发核心价值事件的操作路径。
3. 执行 `shiplens sql --query "SELECT quantile(0.50)(ttv_seconds) AS p50_ttv, quantile(0.90)(ttv_seconds) AS p90_ttv, avg(ttv_seconds) AS avg_ttv FROM (SELECT user_id, dateDiff('second', min(timestamp), minIf(timestamp, event_name = 'core_action')) AS ttv_seconds FROM events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY user_id HAVING minIf(timestamp, event_name = 'core_action') > min(timestamp))" --json` 计算 P50 / P90 TTV（首次见效耗时）。
4. 对比品类基准，审查路径中的中间阻碍页面，输出 TTV 精简与新手提速方案。
---
分析理论基础：
- 体验价值时长（TTV）分布：TTV 衡量用户从首次进入到感知核心价值的耗时，TTV 越短，初始激活率越高、流失越低。
- 摩擦力削减：分析 TTV 的累计分布（P50/P90），定位拖慢体验的冗余步骤（长表单、复杂配置），予以简化、延迟或消除。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第二部分, 第12章"精简用户引导体验"
```

#### [新用户在体验过程中到底卡在哪一步了？] (拼接：数据获取后缀)
```text
新用户在体验过程中到底卡在哪一步了？
1. 执行 `shiplens query --metric conversion_funnel --range 7d --json` 绘制从落地页访问 ➔ 注册成功 ➔ 首次配置 ➔ 核心功能的顺序转化漏斗。
2. 计算各阶段的单步流失率（Drop-off Rate = 1 - 下一步人数 / 上一步人数），精准定位流失率最高的“卡点瓶颈步骤”。
3. 针对卡点页面执行 `shiplens heatmap --template <bottleneck_page_id> --json` 获取该页面的点击分布与交互热区。
4. 输出卡点诊断报告与降低操作阻碍的改版建议。
---
分析理论基础：
- 保龄球道框架与漏斗摩擦力：引导用户到达目标价值需要清晰的路径与防护：
  - 直线路径：到达价值的最短精简路径。
  - 产品内护栏：通过上下文提示、空状态指引与进度条，消除高摩擦卡点的流失。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第三部分, 第13章"保龄球道框架"
```

#### [用户的什么行为代表他会长时间的使用我的产品？] (拼接：数据获取后缀)
```text
用户的什么行为代表他会长时间的使用我的产品？
1. 执行 `shiplens sql --query "SELECT user_id, countIf(event_name = 'core_feature') AS d7_core_count, (max(timestamp) - min(timestamp) >= 2592000) AS is_retained_d30 FROM events WHERE timestamp >= now() - INTERVAL 60 DAY GROUP BY user_id" --json` 提取用户注册首周各项操作频次与 D30 留存状态。
2. 利用相关性与提升度（Lift）算法，计算不同早期行为频次（如 7 天内完成 1次 vs 2次 vs 3次某操作）下的 Day 30 留存率跃迁幅度。
3. 锁定具有最高留存提升杠杆的临界行为组合（Aha Moment，如前 3 天内操作满 2 次）。
4. 建议将该黄金行为嵌入新手引导的最直观触点。
---
分析理论基础：
- 黄金行为时刻（Aha Moment）：与 Day 30 长期留存呈现最高统计相关性的早期关键动作（或前 7 天的使用频次阈值）。
- 同期群交叉对比：对比留存组与流失组在注册首周的操作频次分布，找出最具杠杆效应的临界动作并置于新手引导核心。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第3章"确定增长杠杆"
```

#### [我的新用户来自哪？有什么特点？] (拼接：数据获取后缀)
```text
我的新用户来自哪？有什么特点？
1. 执行 `shiplens query --metric unique_visitors --group-by referrer --range 7d --json` 获取各流量渠道与外链来源的访客人数。
2. 执行 `shiplens sql --query "SELECT referrer, COUNT(DISTINCT user_id) AS total_users, countIf(day_diff = 1) / COUNT(DISTINCT user_id) AS d1_retention, countIf(day_diff = 7) / COUNT(DISTINCT user_id) AS d7_retention FROM (SELECT referrer, user_id, dateDiff('day', min_time, timestamp) AS day_diff FROM (SELECT user_id, referrer, min(timestamp) OVER (PARTITION BY user_id) AS min_time, timestamp FROM events WHERE timestamp >= now() - INTERVAL 30 DAY)) GROUP BY referrer HAVING total_users >= 10" --json` 计算各渠道的 D1/D7 留存率。
3. 比对各渠道核心功能使用深度与活跃度。
4. 输出渠道质量评级表与高价值获客渠道推荐。
---
分析理论基础：
- 渠道意图与质量匹配：获客量不等于用户质量，渠道价值必须通过用户意图、Day 1/7 留存率与功能渗透深度来综合评估，而非单纯看注册数。
- 价值差距识别：若某渠道引流人数极高但 Day 1 断崖式流失，表明营销宣传承诺与产品实际体验存在严重脱节。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第一部分, 第2–6章"MOAT 框架"
```

#### [是否有渠道在给我的产品导入假用户，不同渠道的用户，他们在进入产品之后的具体行为数据如何？] (拼接：数据获取后缀)
```text
是否有渠道在给我的产品导入假用户？不同渠道的用户进入后的具体行为如何？
1. 执行 `shiplens query --metric bounce_rate --group-by referrer --range 7d --json` 获取各渠道的跳出率数据。
2. 执行 `shiplens sql --query "SELECT referrer, COUNT(DISTINCT user_id) AS users, avg(duration) AS avg_duration, countIf(click_count = 0) / COUNT(*) AS zero_click_ratio FROM (SELECT referrer, session_id, user_id, dateDiff('second', min(timestamp), max(timestamp)) AS duration, countIf(event_name = 'click') AS click_count FROM events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY referrer, session_id, user_id) GROUP BY referrer ORDER BY users DESC" --json` 提取各渠道的零点击率与平均停留时长。
3. 识别异常渠道：若某渠道跳出率 > 85%、零点击率 > 90% 且平均停留时长 < 3 秒，标记为低质或刷量嫌疑渠道。
4. 输出虚假流量排查结论与推广渠道避坑建议。
---
分析理论基础：
- 行为深度向量与异常检测：真实用户具有连贯的交互深度（滚动、点击、多步跳转）；机器刷量或低质诱导流量则呈现无点击、停留极短且离散度极低的特征。
- 渠道质量过滤：将来源渠道与跳出率、停留时长及行为深度绑定分析，能精准揪出异常渠道，保护获客预算。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第一部分, 第2–6章"MOAT 框架"
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第二部分, 第7章"使用高级指标分析客户分层"
```

### A/B测试

#### [A/B Test 数据效果对比] (拼接：数据获取后缀)
```text
A/B Test 数据效果对比如何？
1. 执行 `shiplens sql --query "SELECT properties.variant AS variant, COUNT(DISTINCT user_id) AS total_users, countIf(event_name = 'core_conversion') AS conversions, countIf(event_name = 'core_conversion') / COUNT(DISTINCT user_id) AS cvr, avg(session_duration) AS avg_duration FROM events WHERE properties.experiment_id IS NOT NULL AND timestamp >= now() - INTERVAL 14 DAY GROUP BY variant" --json` 提取对照组与实验组的核心转化率、留存率与停留时长。
2. 计算两组的核心指标相对提升幅度（Lift = (Treatment - Control) / Control）。
3. 计算双样本双尾 Z 检验统计量与 p 值，判断是否达到 95% 置信度（p < 0.05）。
4. 结合页面报错率、次级转化率等次要指标进行权衡分析，输出明确的实验胜出评估与全量推全建议。
---
分析理论基础：
- 假设检验与统计显著性：对照实验中的指标差异必须达到统计显著性（通常 p < 0.05 / 95% 置信度），以剔除随机波动的假象。
- 权衡分析：主目标指标的提升必须与次要指标结合评估，确保局部增长（如点击率）未以牺牲其他体验为代价。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第一部分, 第2章"运行与分析实验"
```

#### [我的 A/B 测试结果靠谱吗？本次对比符合实验标准吗？] (拼接：数据获取后缀)
```text
我的 A/B 测试结果靠谱吗？本次对比符合实验标准吗？
1. 执行 `shiplens sql --query "SELECT properties.variant AS variant, COUNT(DISTINCT user_id) AS observed_users FROM events WHERE properties.experiment_id IS NOT NULL AND timestamp >= now() - INTERVAL 14 DAY GROUP BY variant" --json` 提取各组实际分流用户数。
2. 执行卡方检验计算 SRM（Sample Ratio Mismatch）：$\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$。若 p < 0.001，判定存在严重分流失配（SRM），发出数据失效红色警告，立即中止后续分析。
3. 检查实验运行时长是否 >= 7 天（排除星期周期干扰）；根据基线方差与最小可检测效应（MDE），计算统计功效是否达到 80%（Power >= 0.80）。
4. 计算核心指标差异在 95% 置信区间下的显著性 p 值。
5. 输出实验可信度体检卡（SRM 状态、样本功效达标度、显著性结论）。
---
分析理论基础：
- 样本比例失配（SRM）：实际分配人数比例偏离设计预期（卡方检验 p < 0.001）会使实验结论失效，通常由分流重定向、延迟或机器人过滤引起。
- 统计功效与周期完整性：实验样本量需满足最小可检测效应（MDE）与 >= 80% 统计功效，且运行时间须覆盖完整业务周期（至少 7 天）以消除星期效应。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第五部分, 第21章"样本比例失配与可信度护栏"
```

#### [做了很多次迭代，有没有一个综合分数能告诉我产品整体在变好还是变差？] (拼接：数据获取后缀)
```text
做了很多次迭代，有没有一个综合分数能告诉我产品整体在变好还是变差？
1. 执行 `shiplens summary --range 30d --json` 与 `shiplens query --range 30d --json` 获取过去 4 周的活跃度、留存率及关键转化率指标。
2. 构建 0~100 分的产品总体评价健康度模型（OEC）：按业务权重综合归一化得分（如 OEC = 0.4 * 留存得分 + 0.3 * 转化得分 + 0.3 * 活跃得分）。
3. 执行 `shiplens query --metric error_rate --range 30d --grain week --json` 检查页面报错率与崩溃率等护栏指标走势。
4. 输出近 4 周产品综合健康度评分曲线、关键得分变化与护栏指标安全状态。
---
分析理论基础：
- 总体评价指标（OEC）：通过加权综合得分将短期可测指标与长期战略目标对齐，防止团队过度优化单一虚荣指标。
- 护栏指标：监控产品全局底线健康度（如页面报错率、加载延迟、退订率），确保局部改动不损害大盘体验。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第二部分, 第6章"组织级指标" & 第7章"总体评价指标"
```

#### [怎么做一次“假实验”来检验测试系统本身没出问题？（A/A 测试）] (拼接：数据获取后缀)
```text
怎么做一次“假实验”来检验测试系统本身没出问题？
1. 执行 `shiplens sql --query "SELECT properties.variant AS variant, COUNT(DISTINCT user_id) AS total_users, countIf(event_name = 'click') / COUNT(DISTINCT user_id) AS ctr, avg(session_duration) AS avg_duration FROM events WHERE properties.experiment_id = 'aa_test' AND timestamp >= now() - INTERVAL 7 DAY GROUP BY variant" --json` 提取两组相同页面的点击率、留存率与停留时长。
2. 进行双样本统计显著性检验。若两组指标差异的 p 值 < 0.05（拒绝无差异假设），判定实验系统存在分流偏误或数据上报不对称故障。
3. 若通过无差异检验（p >= 0.05 且无 SRM），确认实验平台健康，可以安全开启 A/B 测试。
---
分析理论基础：
- A/A 测试与系统校验：向两组用户展示完全相同的版本以验证分流引擎的无偏性。若 A/A 测试出现显著差异（p < 0.05），说明分流逻辑、埋点采集或指标计算存在底层缺陷，必须在开展 A/B 测试前修复。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第一部分, 第3章"Twyman 定律与实验可信度" & 第五部分, 第19章"A/A 测试"
```

### 用户留存与流失

#### [哪些用户正在悄悄变得不活跃？能不能在他们彻底走之前抓住他们？] (拼接：数据获取后缀)
```text
哪些用户正在悄悄变得不活跃？能不能在他们彻底走之前抓住他们？
1. 执行 `shiplens sql --query "SELECT user_id, recent_7d_events, prior_28d_weekly_avg, recent_7d_events / nullIf(prior_28d_weekly_avg, 0) AS activity_decay_ratio FROM (SELECT user_id, countIf(timestamp >= now() - INTERVAL 7 DAY) AS recent_7d_events, countIf(timestamp >= now() - INTERVAL 35 DAY AND timestamp < now() - INTERVAL 7 DAY) / 4.0 AS prior_28d_weekly_avg FROM events WHERE timestamp >= now() - INTERVAL 35 DAY GROUP BY user_id) WHERE prior_28d_weekly_avg >= 5 AND activity_decay_ratio < 0.5 ORDER BY activity_decay_ratio ASC LIMIT 50" --json` 筛选出使用频率下降超过 50% 的高危用户。
2. 执行 `shiplens sql --query "SELECT properties.feature AS feature_name, count(*) AS dropped_count FROM events WHERE user_id IN (...) GROUP BY feature_name ORDER BY dropped_count DESC LIMIT 3" --json` 追溯这批高危用户最先放弃的前 3 项关键功能。
3. 生成高危流失名单、功能弃用归因分析及个性化挽回建议。
---
分析理论基础：
- 活跃衰减比率：用户流失是一个渐进过程而非突变。通过衰减比率（最近7天使用频次 / 过去28天周均频次）可提前识别活跃度严重衰退（< 0.5）的高危用户。
- 弃用顺序追溯：核心功能停用通常比彻底停止访问提前 7~14 天发生，识别最先停用的功能可快速锁定流失诱因并实施挽回。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第二部分, 第7章"使用高级指标分析客户分层"
```

#### [有什么指标或特征能提前预测用户即将变得不活跃？] (拼接：数据获取后缀)
```text
有什么指标或特征能提前预测用户即将变得不活跃？
1. 执行 `shiplens sql --query "SELECT user_id, dateDiff('day', max(timestamp), now()) AS days_since_last_active, countIf(timestamp >= now() - INTERVAL 14 DAY) AS recent_activity, count(DISTINCT toDate(timestamp)) AS active_days FROM events WHERE timestamp >= now() - INTERVAL 60 DAY GROUP BY user_id" --json` 提取活跃间隔拉长、核心操作骤降等特征变量。
2. 建立流失风险评分卡，识别对流失最具预测力的先行先导指标。
3. 输出流失预警指标规则与分层关怀干预触发器。
---
分析理论基础：
- 先行行为预测信号：滞后的流失结果前存在明确的先导特征：使用频次骤降、访问间隔拉长与关键操作中断。
- 风险分层干预：按流失风险评分排序，将主动干预资源集中在风险最高的前 10%~20% 用户群，实现最高挽回 ROI。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第三部分, 第8章"预测流失" & 第9章"预测精度与机器学习"
```

#### [付高价买产品的用户是真的满意，还是在白白浪费钱随时准备退订？] (拼接：数据获取后缀)
```text
付高价买产品的用户是真的满意，还是在白白浪费钱随时准备退订？
1. 执行 `shiplens sql --query "SELECT r.user_id, r.amount AS mrr, COUNT(e.id) AS usage_count, r.amount / nullIf(COUNT(e.id), 0) AS unit_cost FROM revenue_events r LEFT JOIN events e ON r.user_id = e.user_id AND e.timestamp >= now() - INTERVAL 30 DAY WHERE r.timestamp >= now() - INTERVAL 30 DAY GROUP BY r.user_id, r.amount ORDER BY unit_cost DESC" --json` 提取每位付费客户的月费与 30 天实际操作频次。
2. 计算单次使用成本比率（Unit Cost = MRR / Usage Count），将客户按使用成本从高到低分层。
3. 筛选出 Top 20% 高单位成本（高付费但月操作 < 5 次）的高危退订候选群。
4. 输出高危客户清单与主动调研/深度关怀实施方案。
---
分析理论基础：
- 经常性单次使用成本风险：仅看付费总额容易误判健康度。单位使用成本比率（月费金额 / 实际使用次数）能真实揭示风险，高额付费但低频使用的客户迟早会因“不划算”而退订。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第二部分, 第7章"使用高级指标分析客户分层"
```

#### [我的产品功能很多，用户主要在用哪些功能才是健康的表现？] (拼接：数据获取后缀)
```text
我的产品功能很多，用户主要在用哪些功能才是健康的表现？
1. 执行 `shiplens pages --range 7d --json` 计算各个功能页面的访问量（PV）与停留时长占比（Percentage of Total）。
2. 执行 `shiplens sql --query "SELECT is_retained_d30, properties.feature AS feature_name, count(*) / sum(count(*)) OVER (PARTITION BY is_retained_d30) AS feature_time_share FROM events GROUP BY is_retained_d30, feature_name" --json` 对比长期留存用户与流失用户在各功能上的时间分配结构。
3. 提炼出与高留存高度共振的“黄金功能组合”（Golden Feature Mix）。
4. 输出功能健康度矩阵与新用户功能引导策略。
---
分析理论基础：
- 类别占比指标：当重度用户拉高各项绝对数值时，绝对使用量存在高度共线性；使用占比指标可控制总量影响，揭示与长期留存最强相关的“黄金功能组合”。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第二部分, 第7章"使用高级指标分析客户分层"
```

#### [快要流失的用户那么多，我应该优先花精力去挽回哪些人？] (拼接：数据获取后缀)
```text
快要流失的用户那么多，我应该优先花精力去挽回哪些人？
1. 执行 `shiplens query --metric daily_retention --range 60d --json` 确定用户活跃度衰减到何种阈值时流失率出现拐点（风险临界点）。
2. 执行 `shiplens sql --query "SELECT user_id, dateDiff('day', max(timestamp), now()) AS inactive_days, countIf(timestamp >= now() - INTERVAL 30 DAY) AS past_activity FROM events GROUP BY user_id HAVING inactive_days BETWEEN 7 AND 21 AND past_activity >= 10" --json` 过滤掉沉睡 > 60 天的无救用户，聚焦刚冷淡 7~21 天的中度高价值群体。
3. 输出高 ROI 分诊挽留名单与定向唤醒动作。
---
分析理论基础：
- 分诊挽留策略：挽留资源应集中在处于流失风险临界点的中度冷淡用户。挽回完全沉默的沉睡用户成本极高且效果甚微，而聚焦在刚开始冷淡的边缘用户收益最高。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第二部分, 第5章"用指标理解流失与用户行为"
```

### 商业化与变现

#### [用户订阅前行为分析] (拼接：数据获取后缀)
```text
用户订阅前有什么特征行为？
1. 执行 `shiplens heatmap --template <pricing_page_id> --json` 获取定价页面的点击热力图与各价格卡片点击率。
2. 执行 `shiplens pages --range 14d --json` 统计定价页的人均停留时长与滚动深度。
3. 执行 `shiplens query --metric conversion_funnel --range 14d --json` 检查从价格页点击 ➔ 填写账单 ➔ 确认支付各环节的流失率。
4. 定位结账摩擦阻碍，输出定价页面文案与支付流程优化建议。
---
分析理论基础：
- 价值差距与结算摩擦：订阅触点的流失源于价值认知差距（套餐价值不清晰）或支付体验摩擦（表单繁琐、计费规则复杂）。
- 意图遥测：定价页停留时间过长但未发生转化，通常暗示定价逻辑混乱或价值未被充分理解。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第一部分, 第5章"价值差距"
```

#### [订阅用户洞察] (拼接：数据获取后缀)
```text
订阅用户有什么特征？
1. 执行 `shiplens sql --query "SELECT properties.feature AS trigger_feature, COUNT(*) AS hit_count FROM events WHERE user_id IN (SELECT user_id FROM revenue_events WHERE timestamp >= now() - INTERVAL 30 DAY) AND timestamp >= now() - INTERVAL 37 DAY GROUP BY trigger_feature ORDER BY hit_count DESC LIMIT 5" --json` 提取付费用户在升级前 7 天内的关键触发行为。
2. 执行 `shiplens query --metric daily_retention --group-by plan_type --range 60d --json` 对比月度与年度付费用户的留存走向。
3. 提炼促成付费的核心价值点，指导增值功能设计。
---
分析理论基础：
- 付费前触发行为：免费用户通常在触发特定临界行为（触碰用量上限、尝试高级功能）时升级为付费客户。
- 方案同期群留存：对比月付与年付、不同套餐方案用户的长期留存走势，提炼高 LTV 付费用户画像以指导增值包装。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第三部分, 第8章"预测流失"
```

#### [每个用户在他使用产品的整个周期里能给我赚多少钱？] (拼接：数据获取后缀、建立数据看板后缀)
```text
每个用户在他的整个使用周期里能带来多少收入？
1. 执行 `shiplens query --metric daily_retention --range 60d --grain month --json` 获取长周期留存衰减率。
2. 执行 `shiplens sql --query "SELECT avg(amount) AS arpu, count(DISTINCT user_id) AS total_paying_users FROM revenue_events WHERE timestamp >= now() - INTERVAL 30 DAY" --json` 获取平均用户月收入（ARPU）。
3. 结合毛利率套用 LTV 公式进行积分计算：$$\text{LTV} = \frac{\text{ARPU} \times \text{毛利率} \times \text{留存率}}{\text{月流失率}} - \text{CAC}$$。
4. 执行 `shiplens dashboards create --title "LTV与用户生命周期价值看板" --prompt "展示各同期群LTV曲线、月ARPU及累积毛利贡献" --json`。
5. 输出 LTV 测算结果与获客成本上限建议。
---
分析理论基础：
- LTV 标准公式与留存衰减：客户全生命周期价值代表用户在整个关系周期内贡献的累积毛利现值：
  $$\text{LTV} = \frac{\text{ARPU} \times \text{毛利率} \times \text{留存率}}{\text{流失率}} - \text{CAC}$$
- 同期群积分拟合：对实际同期群留存曲线进行尾部拟合与积分，能精准建模长期经常性现金流。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第三部分, 第8章, 第8.6节"CLV 公式"
```

#### [我花在获取每个用户上的钱合理吗？多久才能回本？] (拼接：数据获取后缀)
```text
我花在获取每个用户上的钱合理吗？多久才能回本？
1. 获取外部输入的获客营销总支出，除以新增用户数计算平均获客成本（CAC）。
2. 计算 LTV/CAC 比率，评估是否 >= 3.0（健康标准）。
3. 计算 CAC 回本周期：Payback Period = CAC / (月均用户毛利)，验证是否在 12 个月以内。
4. 输出单位经济学体检报告与预算调整建议。
---
分析理论基础：
- 单位经济学基准：
  - LTV/CAC 比率：>= 3.0 代表健康的单位经济模型；< 1.0 代表亏损扩张，必须立即暂停付费获客。
  - 回本周期：CAC / (月均用户收入 x 毛利率)。回本周期控制在 12 个月内可保障现金流安全与再投资效率。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第一部分, 第1章"为什么产品驱动增长日益重要?"
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第三部分, 第8章"预测流失"
```

#### [我应该让用户永久免费用基础版，还是给有限时间的免费试用？] (拼接：数据获取后缀)
```text
我应该让用户永久免费用基础版，还是给有限时间的免费试用？
1. 执行 `shiplens paths --range 14d --json` 分析新用户的首次见效耗时（TTV）。
2. 执行 `shiplens sql --query "SELECT countIf(dateDiff('day', signup_time, pay_time) <= 14) / COUNT(*) AS trial_cvr, avg(dateDiff('day', signup_time, pay_time)) AS avg_days_to_pay FROM (SELECT user_id, min(timestamp) AS signup_time, minIf(timestamp, event_name = 'pay') AS pay_time FROM events GROUP BY user_id HAVING pay_time IS NOT NULL)" --json` 统计免费转化周期分布。
3. 应用 MOAT 决策模型：若 TTV < 5 分钟且价值立竿见影推荐 Free Trial；若需要网络效应或长期沉淀推荐 Freemium。
4. 输出获客模式选型报告。
---
分析理论基础：
- MOAT 战略决策框架：免费增值（Freemium）与免费试用（Free Trial）的选择取决于体验价值时长（TTV）、市场竞争态势与用户自下而上的传播路径：
  - 免费试用：适合 TTV 极短（< 5分钟）、产品价值一目了然且具有竞争紧迫性的产品。
  - 免费增值：适合依赖网络效应、评估周期长或需要通过自下而上驱动规模化自然扩张的产品。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第一部分, 第2–6章"MOAT 框架"
```

#### [免费用户活跃到什么程度，我才值得花钱对他做付费推广或人工跟进？] (拼接：数据获取后缀)
```text
免费用户活跃到什么程度，我才值得花钱对他做付费推广或人工跟进？
1. 基于 LTV 设定单客触达成本红线（确保跟进成本 <= LTV / 3）。
2. 执行 `shiplens sql --query "SELECT user_id, count(*) AS total_actions, countIf(event_name = 'export' OR event_name = 'invite') AS advanced_actions FROM events WHERE user_id NOT IN (SELECT user_id FROM revenue_events) AND timestamp >= now() - INTERVAL 14 DAY GROUP BY user_id HAVING advanced_actions >= 3 ORDER BY total_actions DESC LIMIT 30" --json` 挖掘高意向 PQL（产品合格线索）。
3. 输出高价值线索清单与自动化/人工触达策略。
---
分析理论基础：
- 触达经济学红线：人工跟进或定向营销推广的投入必须严格受限于 $\text{CAC} \le \frac{\text{LTV}}{3}$。
- 产品合格线索（PQL）：通过产品真实行为数据（用量逼近上限、深度使用高级特性）识别高意向线索，确保资源只投向已充分体验产品价值的用户。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第三部分"产品驱动型 GTM 策略"
```

### 自传播与团队效率

#### [我的产品有没有自传播能力？用户会不会主动带来新用户？] (拼接：数据获取后缀)
```text
我的产品有没有自传播能力？用户会不会主动带来新用户？
1. 执行 `shiplens sql --query "SELECT countIf(event_name = 'invite_sent') / COUNT(DISTINCT user_id) AS invites_per_user, countIf(event_name = 'invite_accepted') / nullIf(countIf(event_name = 'invite_sent'), 0) AS invite_cvr FROM events WHERE timestamp >= now() - INTERVAL 30 DAY" --json` 统计人均邀请数与邀请转化率。
2. 计算病毒系数：$K = i \times c$；并计算病毒传播周期（从接受邀请到下一次发出的平均天数）。
3. 执行 `shiplens pages --range 14d --json` 找出用户完成创作或导出成果的页面路径。
4. 输出病毒传播评估报告与分享触点植入建议。
---
分析理论基础：
- 病毒飞轮量化体系：病毒式自传播取决于病毒系数与传播周期：
  - 病毒系数（K值）：$K = i \times c$（人均发出邀请数 x 邀请转化率）。$K > 1$ 引发指数级自爆发增长；$K > 0.2$ 能显著降低综合获客成本。
  - 病毒传播周期：缩短用户从接受邀请到发出下一次邀请的时间间隔，能加速复利传播。
  - 触点植入：分享提示应植入在用户感受价值的顶点（如完成创作、达成成果时）。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第二部分, 第8章"推荐：搭建病毒式传播飞轮"
```

#### [我到底是在真正改进产品，还是只在做一些无关紧要的事？] (拼接：数据获取后缀)
```text
我到底是在真正改进产品，还是只在做一些无关紧要的事？
1. 执行 `shiplens query --metric daily_retention --range 60d --grain week --json` 与 `shiplens summary --range 60d --json` 提取过去多次版本发布前后核心成果指标（留存率、关键转化率、日活跃度）的变化量。
2. 统计每次发版是否带来了成果指标的统计正向移动，计算迭代有效胜率（Win Rate = 正向拉动发布数 / 总发布数）。
3. 若 Win Rate < 50%，触发 Product Kata 战略偏差预警。
4. 输出版本改进记分卡与开发优先级纠偏建议。
---
分析理论基础：
- Product Kata 与成果问责：开发速率（完成的任务点、上线的功能数）仅代表产出而非成果。健康的产品管理应追踪“迭代胜率”——即成功推动核心成果指标（留存、转化、关键任务完成）正向变动的发布比例。
---
出处：
- 《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第四部分, 第15章"Product Kata" & 第16章"设定方向"
```

#### [我是不是在做一堆没人要的功能？怎么避免白费力气？] (拼接：数据获取后缀)
```text
我是不是在做一堆没人要的功能？怎么避免白费力气？
1. 执行 `shiplens pages --range 30d --json` 统计所有已上线功能的访问量、UV 及活跃渗透率。
2. 执行 `shiplens sql --query "SELECT properties.feature AS feature_name, COUNT(DISTINCT user_id) AS active_users, COUNT(DISTINCT user_id) / (SELECT COUNT(DISTINCT user_id) FROM events WHERE timestamp >= now() - INTERVAL 30 DAY) AS adoption_rate FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY feature_name ORDER BY adoption_rate ASC" --json` 筛选采纳率 < 5% 的僵尸功能。
3. 评估这些低使用功能是否拖慢了主路径速度或增加了认知负荷。
4. 输出功能裁减与界面精简优化清单。
---
分析理论基础：
- 功能陷阱诊断：功能陷阱是指组织将功能交付等同于商业价值。在未验证用户实际采纳与成果拉动的前提下不断堆叠功能，会导致产品臃肿、认知负荷上升及用户流失。
---
出处：
- 《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第一部分"功能陷阱" & 第四部分, 第15章"Product Kata"
```

#### [手头有一大堆想改进的点子，怎么决定先做哪一个？] (拼接：数据获取后缀)
```text
手头有一大堆想改进的点子，怎么决定先做哪一个？
1. 梳理当前待办功能与实验点子列表。
2. 调用 `shiplens query` 与 `shiplens pages` 提取当前卡点瓶颈数据，定量评估每个点子的潜在价值（Impact, 1~10 分）；根据历史实验胜率评估成功把握（Confidence, 1~10 分）；由工程师输入开发难度（Ease, 1~10 分）。
3. 计算每个点子的 ICE 得分：$$\text{ICE} = \frac{\text{Impact} + \text{Confidence} + \text{Ease}}{3}$$。
4. 按 ICE 分数降序排列，输出高收益低阻力的高优先级迭代清单。
---
分析理论基础：
- ICE 优先级评分模型：在敏捷迭代中，产生点子成本极低，执行测试成本高昂。ICE 模型提供了量化排序框架：
  $$\text{ICE 得分} = \frac{\text{Impact 潜在价值} + \text{Confidence 成功把握} + \text{Ease 开发难度}}{3}$$
  通过数据瓶颈估算 Impact、历史验证估算 Confidence、工程量估算 Ease，高效锁定高杠杆机会。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第4章"高节奏测试"
```

### 创建数据看板

#### [创建30天新用户每日留存矩阵看板] (拼接：数据获取后缀、建立数据看板后缀)
```text
在 Shiplens 上创建一个 30 天新用户每日留存矩阵看板：
1. 执行 CLI 命令：`npx.cmd --yes @shiplens/cli dashboards create --title "30天新用户每日留存矩阵" --prompt "以注册日期为纵轴，展示每日新增用户数及第1至30天同期群留存衰减矩阵" --json`。
2. 解析返回的 JSON 结果，提取 `dashboard_id` 与实时访问网址 `dashboard_url`。
3. 向用户返回生成的看板访问链接与数据解读指南。
---
分析理论基础：
- 同期群矩阵遥测：按注册日期切分同期群并追踪 30 天连续留存衰减，直观展现留存曲线是否系统性趋平，并隔离特定日期的获客质量异常。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第一部分, 第3章"同期群分析" & 第二部分, 第7章"使用高级指标分析客户分层"
```

#### [创建顺序流程步骤转化漏斗看板] (拼接：数据获取后缀、建立数据看板后缀)
```text
阅读代码中的顺序业务流程，在 Shiplens 上创建一个步骤转化漏斗看板：
1. 扫描前端路由与代码，识别产品核心顺序步骤（如 注册 ➔ 引导 ➔ 核心创作 ➔ 发布）。
2. 执行 CLI 命令：`npx.cmd --yes @shiplens/cli dashboards create --title "核心流程步骤转化漏斗" --prompt "分析顺序步骤各环节用户进入数、单步流失率及整体转化率" --json`。
3. 解析返回结果并向用户提供看板网址 `dashboard_url`。
---
分析理论基础：
- 多步骤流程遥测：顺序业务流程（注册、引导、发布）需要逐级流失测量，定位流失率最高的步骤即可精准锁定核心交互阻碍点。
---
出处：
- 《产品驱动增长》(Product-Led Growth), Wes Bush — 第三部分, 第13章"保龄球道框架"
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第一部分, 第2章"运行与分析实验"
```

### 进阶配置与追踪

#### [A/B Test 数据记录配置] (拼接：数据获取后缀)
```text
配置 A/B Test 行为追踪代码：
1. 引导用户定位前端代码中变体渲染逻辑位置。
2. 在组件挂载处注入 Shiplens SDK 属性：`Shiplens.track('experiment_exposure', { experiment_id: '<exp_id>', variant: 'control' | 'treatment' })`。
3. 执行 `shiplens doctor --json` 校验测试事件上报链路是否正常。
---
分析理论基础：
- 变体遥测标记与隔离：在线对照实验要求在事件上报层携带独立的 experiment_id 与 variant_id，防止跨会话交叉污染导致评估偏误。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第一部分, 第2章"运行与分析实验"
```

#### [设置并统计用户的 Aha Moment] (拼接：数据获取后缀、建立数据看板后缀)
```text
设置并统计用户的 Aha Moment 关键时刻：
1. 在核心价值达成触发处注入事件上报：`Shiplens.track('aha_moment_achieved', { milestone_type: '<type>', time_to_reach: <seconds> })`。
2. 执行 CLI 命令：`npx.cmd --yes @shiplens/cli dashboards create --title "Aha Moment 留存对比看板" --prompt "展示达成与未达成 Aha Moment 两组用户的 30 天留存对比曲线" --json`。
3. 返回看板网址并给出引导埋点验证状态。
---
分析理论基础：
- 关键里程碑遥测与双同期群对比：追踪 Aha Moment 需要同时记录达成耗时与操作频次，并通过看板对比达成与未达成用户的 30 天留存曲线走向。
---
出处：
- 《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第一部分, 第3章"确定增长杠杆"
```

#### [记录订阅金额，并把用户的使用和订阅行为关联起来，创建每日订阅看板] (拼接：数据获取后缀、建立数据看板后缀)
```text
记录订阅金额，并把用户的使用和订阅行为关联起来，创建每日订阅看板：
1. 在支付回调或结账成功组件中注入收益上报：`Shiplens.track('revenue_event', { amount: <amount>, currency: '<USD|CNY>', plan: '<plan_id>', user_id: '<user_id>' })`。
2. 执行 CLI 命令：`npx.cmd --yes @shiplens/cli dashboards create --title "每日订阅与收益看板" --prompt "展示每日订阅用户数、新增MRR/ARR及付费用户留存走势" --json`。
3. 向用户返回看板链接 `dashboard_url`。
---
分析理论基础：
- 行为与收益遥测关联：将事件级交易数据（金额、币种、用户 ID）与用户行为轨迹关联，为精准计算客户生命周期价值（LTV）与设定获客成本上限提供依据。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第三部分, 第8章"预测流失"
```

### Shiplens配置

#### [Shiplens CLI 一键接入与统计初始化] (拼接：无)
```text
安装 Shiplens 数据统计，提取项目描述、安装统计 SDK、创建项目并获取实时数据看板网址。
1. 执行 CLI 初始化命令：
   - Windows: npx.cmd --yes @shiplens/cli init
   - macOS/Linux: npx --yes @shiplens/cli init
2. 执行完毕后，以标准图表格式向用户呈现项目与数据看板信息（包含：项目名称、应用 ID、代码注入文件、用户个人账号状态、实时数据看板/激活链接）；
3. 紧随其后主动向用户索要邮箱（告知会为其申请注册，Shiplens 收到后将发送激活邮件以激活每月 50,000 次免费额度并完成项目绑定）；
4. 收到用户回复邮箱后，立即执行单命令发送激活邮件：npx.cmd --yes @shiplens/cli auth bind --email <邮箱> --json。
```

#### [我不再需要统计数据，删除 Shiplens 的数据统计SDK与数据] (拼接：无)
```text
删除 Shiplens 项目的 SDK 接入与统计数据：
1. 读取项目根目录下的 .shiplens.json 配置文件，获取当前项目的名称、app_id 及代码插桩文件路径。
2. 明确向用户展示即将删除的项目名称与 app_id，说明历史事件与过往在 Shiplens 托管的产品数据将被彻底清空，并暂停操作等待用户明确回复“确认删除该项目”。
3. 收到确认后，先清理本地前端代码中的 SDK 引用/插桩代码，并删除本地 ./.shiplens.json 文件以及专属业务上下文文件 .shiplens/contexts/<app_id>.md。
4. 调用 CLI 命令销毁云端项目：npx.cmd --yes @shiplens/cli projects delete --app-id <app_id> --force --json。
```

#### [删除 Shiplens CLI] (拼接：无)
```text
彻底卸载并删除本地全局安装的 Shiplens CLI 命令行工具：
 - Windows: npm.cmd uninstall -g @shiplens/cli
 - macOS/Linux: npm uninstall -g @shiplens/cli
```

#### [让 AI 理解每个数字背后的真实业务，为项目的所有页面和按钮生成文本描述] (拼接：无)
```text
为当前项目梳理页面、功能介绍与按钮布局，并生成本地 .shiplens/contexts/<app_id>.md 文件，让 AI 分析数据时能将每个数字和 ID 准确对应到具体功能：
1. 检查本地 ./.shiplens.json 确认当前项目的 app_id 与项目名称。
2. 浏览前端代码与页面路由，客观提取每个页面的实际功能说明、开发者面向用户的介绍文案，以及页面中所有按钮的文本、位置与点击操作。
3. 按照标准格式将客观信息写入 .shiplens/contexts/<app_id>.md 文件，并在文件头部绑定当前项目的 app_id 与项目名。
4. 可执行 npx.cmd --yes @shiplens/cli context push 将该上下文同步至云端，方便跨设备协同；后续执行数据分析时 AI 将自动优先结合该文件提供精准的业务解读。
```

### 数据统计问题排查

#### [测试 Shiplens 数据链路与环境是否正常] (拼接：无)
```text
测试 Shiplens 数据统计链路与环境是否正常：
1. 在终端执行体检命令：`npx.cmd --yes @shiplens/cli doctor --json`（macOS/Linux：`npx --yes @shiplens/cli doctor --json`）。
2. 检查返回的 5 大检查项：`local_config`、`sdk_installed`、`code_instrumented`、`network_connectivity`、`auth_valid`。
3. 若存在 failure 状态项，根据返回的 error_code 输出精准修复指令。
---
分析理论基础：
- 数据管道健全性校验：Twyman 定律指出“任何看起来异常或过于完美的数据，通常源于数据管道或埋点故障”。即时全链路检查可秒级排查鉴权失效、网络阻断与接口不通，避免静默丢数据。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第一部分, 第3章"Twyman 定律与实验可信度"
```

#### [开启本地开发调试模式并自检事件上报] (拼接：无)
```text
开启本地开发调试模式并自检事件上报：
1. 在本地 SDK 初始化代码中设置 `Shiplens.init({ appId: '<app_id>', debug: true })`。
2. 本地（localhost/127.0.0.1）自动打标为 staging 环境，打开浏览器控制台（F12）查看 `[Shiplens Debug]` 实时日志与 Network 200 响应。
3. 执行 `shiplens summary --env staging --range 24h --json` 确认测试事件成功进入测试环境大盘。
---
分析理论基础：
- 环境隔离与指标纯净度：严格隔离本地测试环境与线上生产环境数据，防止开发测试事件污染真实转化漏斗与活跃留存基准。
---
出处：
- 《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第一部分, 第2章"衡量流失"
```

#### [测试软件打包与发布环境下的数据上报] (拼接：无)
```text
测试软件打包与发布环境下的数据上报：
1. 执行项目打包构建命令（如 `npm.cmd run build`），检查构建产物未过滤 SDK 引用。
2. 检查 HTML 中的 Content-Security-Policy (CSP) `connect-src` 指令是否放行 Shiplens 采集域名。
3. 运行预览服务器触发测试访问，执行 `shiplens summary --range 24h --json` 验证生产环境接收成功。
---
分析理论基础：
- 生产构建上报护栏：生产打包混淆、内容安全策略（CSP）与客户端广告拦截插件容易静默阻断数据上报，发布前进行构建后冒烟测试是确保数据完整性的关键工程防线。
---
出处：
- 《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi 等 — 第五部分, 第21章"样本比例失配与可信度护栏"
```

---
