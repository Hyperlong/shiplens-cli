# Shiplens 数据分析理论与教科书 Prompt 库

> 本文档收录自 5 本经典数据分析教科书的 36 个 Prompt 模板、数学公式与统计学推断理论基础。在需要深度因果推断、A/B 实验统计验证、流失预测建模及增长策略规划时按需查阅。

---

## 数据不足时的强制降级规则

执行任何 Prompt 前，先检查可用时间范围、有效样本量、必要事件与字段、分组完整性和数据质量。不得仅因数据未达到 Prompt 的理想要求而停止分析或只回复“数据不足”；必须使用当前数据能够支持的最高分析层级，产出有边界的结论。

1. **标准模式**：数据满足 Prompt 的时间、样本、字段和质量要求时，完整执行原步骤。
2. **降级模式**：数据部分不足时，使用全部可用日期，减少非必要分群和交叉维度，优先输出样本数、基线、效应量、置信区间、漏斗流失点或趋势方向。将结论标记为“方向性”或“阶段性”，不得宣称实验胜出、统计显著、因果成立或长期趋势已经确认。
3. **最低可行模式**：无法完成推断统计时，仍需输出描述性统计、数据质量问题、可观察到的信号、当前风险以及下一步采集建议。不得虚构缺失数据。
4. **时间不足**：改用全部已有日期，并明确覆盖了哪些工作日或周末。D1、D3 等短期指标可以作为代理指标，但不得冒充 D7、D30 或长期留存。
5. **样本不足**：报告当前样本量、观察效应、置信区间、目标样本完成度和预计补齐时间；不得宣布胜负。缺少 MDE、基线或方差时，给出清楚标注假设的情景区间，而不是停止分析。
6. **字段不足**：可使用业务含义最接近的代理指标，但必须说明替代关系及其偏差风险。小样本分群应合并到更高层级，避免输出不稳定的细分结论。
7. **异常值处理**：只有在规则预先定义且保留未处理结果作敏感性对照时，才可进行截断或剔除；不得为了得到显著结果而临时删除数据。

每次降级都要在报告中简短列出：`数据充分性`、`本次降级`、`当前可支持的结论`、`暂不支持的结论`、`补齐标准所需的数据或时间`。放宽的是分析步骤和输出粒度，不是事实与可信度标准。

---

## 第一部分：A/B 实验统计学

> 来源：《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu

---

### 实验设计

#### [如何设计兼顾短期与长期的实验总体评价标准（OEC）？] (拼接：数据获取后缀)
```text
如何设计兼顾短期与长期的实验总体评价标准（OEC）？
1. 识别业务的长期目标（如用户增长、利润率等），并明确其在短期的实验时间窗口（通常为 1-2 周）内是否可衡量。
2. 为长期目标寻找高灵敏度、在短期内可归因的先导性替代指标（Surrogate Metrics）。
3. 构建总体评价标准（OEC）：如果存在多个目标，通过加权公式将指标组合成一个综合评分，同时确保 OEC 难以被业务操作"游戏化"（Gameability）。
---
分析理论基础：
Ron Kohavi 等在《关键迭代》中给出了 OEC 的核心定义："If you use multiple metrics to measure success for an experiment, ideally you may want to combine them into an Overall Evaluation Criterion (OEC), which is believed to causally impact long-term objectives."

OEC 是解决短期实验和长期业务目标间断层的重要方法，它迫使组织在评估前确立各指标间的折衷模型（Tradeoffs）。一个有效的 OEC 必须满足：**可度量性（Measurable）**、**可归因性（Attributable）**、**敏感性与及时性（Sensitive and Timely）**。

构建方式：$OEC = \alpha \times M_1 + \beta \times M_2 + ...$，其中权重 $\alpha, \beta$ 应反映各指标在长期目标中的业务优先级。

Agent 应当：结合提供的业务目标文档，提取能在 2 周内可度量的行为指标，评估其作为长期目标前置指标的合理性，并生成一个不可被"游戏化"的 OEC 计算公式。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 II 部分, 第 7 章"Metrics for Experimentation and the Overall Evaluation Criterion"
```

#### [如何正确进行样本量计算以满足最小可检测效应（MDE）？] (拼接：数据获取后缀)
```text
如何正确进行样本量计算以满足最小可检测效应（MDE）？
1. 确定业务对该实验的最小可检测效应（$\delta$），即业务认为有实际意义的最小提升幅度。
2. 评估所用指标的历史方差 $\sigma^2$。如果数据高度偏态（如长尾收入），先进行对数转换或截断（Capping）以降低偏度系数。
3. 应用公式估算实验需要的总样本量 $N$，确保统计功效（Power）达到至少 80%，假阳性率（Type I Error）控制在 5%。
4. 设定实验运行周期的最小天数（建议完整覆盖一个自然周，如 7 天或 14 天），即使样本量提前达标也不应提前终止实验。
---
分析理论基础：
Kohavi 等给出了样本量公式："The total number of samples you need to achieve 80% power can be derived from the power formula above, and is approximately: $N = \frac{16 \sigma^2}{\delta^2}$."

实验的统计敏感度取决于样本量和指标方差：$\delta$ 越小（寻找更细微的改进），所需样本量越大；$\sigma^2$ 越大（指标噪声越高），同样需要更多样本。若流量不足会导致二类错误（漏报真实效果）。

Agent 应当：向用户询问历史基线方差 $\sigma^2$ 和 MDE $\delta$，套用样本量公式输出所需最小样本总数。若指标偏度极高（如人均收入），还应建议对数据进行截取处理以减小方差。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 V 部分, 第 17 章"The Statistics behind Online Controlled Experiments"
```

---

### 实验可信度验证

#### [如何通过样本比例失配（SRM）检验识别实验分流缺陷？] (拼接：数据获取后缀)
```text
如何通过样本比例失配（SRM）检验识别实验分流缺陷？
1. 获取实验设计阶段预期的控制组与实验组流量分配比例（例如 50:50）。
2. 获取实验实际进入分析的总用户数，并按组别统计。
3. 利用卡方检验计算观测到的流量分配比例与预期设计的偏离程度：$\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$。
4. 如果 $p\text{-value} < 0.001$，标记存在 SRM 异常，并排查由重定向、延迟生效或机器人过滤造成的漏斗不一致问题，所有业务指标分析须立即暂停。
---
分析理论基础：
Kohavi 等将 SRM 定义为最重要的可信度护栏检验："The Sample Ratio Mismatch (SRM) metric looks at the ratio of users between two variants... When the p-value for the Sample Ratio metric is low, there is a sample ratio mismatch (SRM), and all other metrics are probably invalid."

书中还警告："An SRM check is critical. Even a small imbalance can cause a reversal in the Treatment effect. SRMs are commonly due to missing users that are either extremely good, such as heavy users, or extremely bad, those users with no click count."

SRM 是一种基础但极其有效的数据可信度护栏，用来检测实验流量分配是否被系统性破坏。

Agent 应当：使用给定分流数据执行卡方检验；若发现显著统计学意义的 SRM，必须发出红色警告，中止对常规业务指标的后续分析，并要求用户排查数据管道故障。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 V 部分, 第 21 章"Sample Ratio Mismatch and Other Trust-Related Guardrail Metrics"
```

#### [如何设置能够保护核心体验和系统性能的护栏指标？] (拼接：数据获取后缀)
```text
如何设置能够保护核心体验和系统性能的护栏指标？
1. 识别系统中绝对不应被当前实验破坏的核心性能指标（如页面加载延迟、JavaScript 错误率、客户端崩溃率、报错次数）。
2. 将这些指标转换为高灵敏度版本，例如将"每个用户的崩溃次数"转化为二元指标"实验期间该用户是否遭遇崩溃"，以加速统计显著性的获得。
3. 在实验数据分析阶段，优先检查护栏指标是否出现显著退化（Degrading）。
4. 若护栏指标受到负面影响，强制触发权衡讨论，评估实验收益是否值得承担护栏指标恶化的代价。
---
分析理论基础：
Kohavi 等指出护栏指标的独特作用："Many organizational guardrail metrics are similar to latency, sensitive metrics that measure phenomena known to impact the goal or driver metrics, but that most teams should not be affecting."

护栏指标独立于实验特定的 OEC，分为两类：(1) **业务保护型**——保护企业核心利益不受损（如收入下限、退订率上限）；(2) **实验可信度型**——确保实验结果本身可信（如 SRM、崩溃率）。

Agent 应当：接收到实验结果数据后，隔离出护栏指标子集，优先检查其 $p$ 值和均值差异 $\Delta$。若发生显著退化（如崩溃率上升 $p < 0.05$），生成阻断式警告报告并暂停实验结论发布。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 II 部分, 第 6 章"Organizational Metrics (Guardrail Metrics)"
```

#### [如何在多实验阶段数据合并时避免辛普森悖论？] (拼接：数据获取后缀)
```text
如何在多实验阶段数据合并时避免辛普森悖论？
1. 检查实验在运行期间是否发生了分流比例的改变（如从 1% 的 Ramp-up 逐步提升到 50%）。
2. 如果存在分流比例的改变，严禁将不同比例阶段的数据进行简单加权汇总计算总体转化率。
3. 对数据进行阶段拆解，分别计算每一个恒定比例阶段内实验组相对于控制组的效应增量 $\Delta$。
4. 若需要总体结论，使用按阶段样本量加权的方法组合各阶段增量，而非直接对原始数据进行汇总。
---
分析理论基础：
Kohavi 等给出了辛普森悖论的警告："If an experiment goes through ramp-up... combining the results can result in directionally incorrect estimates of the Treatment effects... This phenomenon is called Simpson's paradox because it is unintuitive."

以广告实验为例：低比例阶段（流量 1%）中实验组 CTR 2% vs 控制组 1.5%，高比例阶段（流量 50%）中实验组 1.8% vs 控制组 1.4%——两个阶段实验组都更好；但如果直接汇总，由于不同阶段的流量权重不同，可能出现汇总数据中控制组反而更高的悖论结论。

Agent 应当：自动探测时序数据上的流量比例跳变点。在发现流量比例变更时，切分成若干平稳时间段独立计算增益特征，并向用户提示不可直接汇总的原因及正确的分阶段加权方法。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 I 部分, 第 3 章"Twyman's Law and Experimentation Trustworthiness"
```

#### [当需要监控海量指标时，如何应对多重比较陷阱？] (拼接：数据获取后缀)
```text
当需要监控海量指标时，如何应对多重比较陷阱（Multiple Testing Problem）？
1. 在实验开始前，将待评估的指标集划分为三个层级：第一阶（预期会被实验直接影响的核心目标指标）、第二阶（可能被间接影响的次级指标）、第三阶（几乎不可能被影响的背景监控指标）。
2. 根据层级设置不同的显著性阈值：第一阶用 $\alpha = 0.05$，第二阶用 $\alpha = 0.01$，第三阶用 $\alpha = 0.001$。
3. 当且仅当指标对应的 $p\text{-value}$ 低于所在层级阈值时，才宣告该指标变化具统计显著性。
4. 对于第三阶指标中出现的"仅达 0.05 水平"的波动，视为假阳性噪声，无需解读业务含义。
---
分析理论基础：
Kohavi 等指出多重比较的陷阱："When testing multiple things in parallel, the number of false discoveries increases. This is called the 'multiple testing' problem... Apply tiered significance levels to each group (e.g., 0.05, 0.01 and 0.001 respectively)."

贝叶斯视角解释：如果我们事先认为一项指标极不可能被实验影响（先验概率低），就必须要求更强的证据（更小的 $p$ 值）来推翻先验假设。当同时观测 100 个指标时，即使完全没有真实效果，也会有约 5 个指标在 $\alpha = 0.05$ 水平下"显著"。

Agent 应当：要求用户在使用大量指标进行数据探索时，事先给指标分层分类。根据分层阈值规则，过滤并高亮真正具备显著性的数据变动，屏蔽普通假阳性指标，防止错误决策。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 V 部分, 第 17 章"The Statistics behind Online Controlled Experiments"
```

#### [如何检测并隔离因网络效应导致的变体间干扰？] (拼接：数据获取后缀)
```text
如何检测并隔离因网络效应导致的变体间干扰（SUTVA Violation）？
1. 分析实验场景是否存在连接实验组和控制组的"干扰介质"（如社交网络中的好友关系、双边市场的共享库存或广告预算）。
2. 若存在资源竞争（如广告预算），采用在变体之间精确切分预算的方式，或通过基于时间片的随机化（Time-based Randomization）实现干预隔离。
3. 若存在社交网络外溢效应，实施基于网络集群的随机化（Network-Cluster Randomization）——将强链接的用户群整体归入同一变体，防止信息流动污染控制组。
4. 在分析时，比较"实验组-实验组"连线与"控制组-控制组"连线的互动指标差异，以测量无偏的增量效应。
---
分析理论基础：
Kohavi 等解释了网络干扰的来源："Interference happens through a medium connecting the Treatment and Control groups. You can remove potential interference by identifying the medium and isolating each variant... To create isolation, you must consider other experimental designs to ensure that your Treatment and Control units are well separated."

SUTVA（Stable Unit Treatment Value Assumption）假设要求每个实验单元的结果不受其他单元处理状态的影响。在社交网络或供需市场中，该假设常被打破：实验组用户的改变会间接影响控制组用户的行为，导致效果估计被稀释或夸大。

Agent 应当：询问实验产品是否涉及用户社交互动或共享存量资源。如果是，要求重新设计随机单元（如地域隔离法、集群分割），并在最终报告中校正因泄漏带来的偏误。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 V 部分, 第 22 章"Leakage and Interference between Variants"
```

#### [遇到非预期的极端实验结果时如何运用 Twyman 定律进行异常排查？] (拼接：数据获取后缀)
```text
遇到非预期的极端实验结果时如何运用 Twyman 定律进行异常排查？
1. 建立健康怀疑论原则：无论观察到超乎预期的巨大正向结果还是极端负面结果，不应立即寻找业务故事去解释，而是优先启动数据管道与埋点的排查机制。
2. 验证各平台或特定维度的差异（如区分 iOS、Android 和 Web），检查是否某个细分维度的极端数据拉动了全局均值。
3. 执行反向测试或交叉对比，确保埋点定义的同质性——例如验证两条上报链路是否因重定向或延迟导致数据丢失率存在差异。
4. 排除所有系统 Bug（如重复计费、爬虫流量未过滤、无效点击、事件触发错误）后，方可接受数据并解读结论。
---
分析理论基础：
Kohavi 等以 Twyman 定律为指导："We believe in the skepticism implied by Twyman's Law: Any figure that looks interesting or different is usually wrong... Experience tells us that many extreme results are more likely to be the result of an error in instrumentation (e.g., logging), loss of data (or duplication of data), or a computational error."

例如实验显示某按钮点击率提升了 300%，最可能的原因是：事件被重复触发上报、实验组多计算了某类重定向点击、或爬虫流量仅落入了实验组。

Agent 应当：在处理 A/B 实验结果时，自动扫描是否存在超过历史经验阈值（如转化率单日提升超过 50%）的异常。若发现，不直接赞美这一发现，而是启动数据埋点复核和多维分解任务，强制用户运用 Twyman 定律寻找隐藏缺陷。
---
出处：
《关键迭代：可信赖的线上对照实验》(Trustworthy Online Controlled Experiments), Ron Kohavi, Diane Tang, Ya Xu — 第 I 部分, 第 3 章"Twyman's Law and Experimentation Trustworthiness"
```

---

## 第二部分：产品管理与需求验证

> 来源：《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri

---

### 组织诊断

#### [如何诊断团队是否陷入了"功能陷阱"？] (拼接：数据获取后缀)
```text
如何诊断团队是否陷入了"功能陷阱"？
1. 评估成功衡量标准：分析团队目前的 KPI 或 OKR，检查其是否主要关注"发布了多少功能"、"完成了多少故事点"或"上线速度"，而不是用户的实际收益。
2. 检查用户价值链接：要求团队阐述最近发布的三个功能，追溯这些功能解决了用户的什么具体问题，以及是否有数据支撑。
3. 审查沟通与激励机制：了解公司内部是如何定义"成功"的，是对按时交付项目进行奖励，还是对实现预期业务成果进行奖励。
4. 输出诊断报告：指出团队在"产出（Outputs）"与"成果（Outcomes）"之间的失衡程度，并给出调整建议。
---
分析理论基础：
Melissa Perri 在《逃离功能陷阱》中描述了陷入功能陷阱的症状："I was so focused on shipping features and developing as many cool ideas... that I didn't even think about the outcome of those features. I wasn't connecting the goals of my company or the needs of my users back to my work."

功能陷阱的本质是组织错误地将软件开发的动作等同于价值创造。跳出陷阱的关键在于将系统重新对齐到**价值交换（Value Exchange System）**上：产品存在的唯一合理性是为用户和业务创造可测量的价值。

Agent 应当：作为组织诊断顾问，通过逐步提问获取团队的路线图、绩效指标和近期交付案例，分析并指出其陷入"功能陷阱"的症状，提供向成果导向型产品管理转型的建议。
---
出处：
《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第 I 部分, 第 1 章"The Value Exchange System"
```

#### [如何使用 Product Kata 进行产品精益探索？] (拼接：数据获取后缀)
```text
如何使用 Product Kata 进行产品精益探索？
1. 明确目标（Goal）：确立要达成的业务或产品战略目标，并确认其为真实的成果指标而非产出指标。
2. 评估现状（Current State）：通过数据或研究描述距离该目标目前的现状是什么。
3. 识别障碍（Obstacles）：找出阻碍达成目标的最大的用户问题或业务障碍。
4. 设计解决方案（Solution）：针对最大的障碍，头脑风暴解决方案，不允许跳过"障碍识别"直接进入"解决方案"。
5. 建立假设（Hypothesis）并执行实验：明确预期会发生的结果，执行实验。
6. 验证与学习（Learn）：对比实际结果与假设，记录学习内容，决定下一步动作（迭代或推进）。
---
分析理论基础：
Perri 提出 Product Kata 作为一种系统化的产品思维模式："The Product Kata is the process by which we uncover the right solutions to build. It's a systematic way that teaches product managers to approach building products from a problem-solving standpoint."

核心原则：在高度不确定性中，通过实验循环降低风险。每一次 Kata 循环的核心问题是"**为了达到目标，我们下一步需要学习什么？**"

Agent 应当：作为敏捷教练，一步步引导用户回答 Kata 的核心问题。强制用户在没有清晰识别"障碍"之前，不得跳跃到"解决方案"环节，并协助设计学习闭环与实验方案。
---
出处：
《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第 IV 部分, 第 15 章"The Product Kata"
```

---

### 需求验证实验

#### [如何设计一个"礼宾实验"来验证需求？] (拼接：数据获取后缀)
```text
如何设计一个"礼宾实验（Concierge Experiment）"来验证需求？
1. 确定高价值假设：明确你要验证的客户核心痛点或服务价值主张。
2. 设计人工服务流程：剥离所有软件开发工作，设计一套完全由人工手动提供的服务流程，直接向客户交付最终结果。
3. 筛选早期用户：挑选少量愿意配合的种子用户，明确告知这是早期人工服务阶段。
4. 收集反馈并迭代：在手动提供服务的过程中，密切观察用户对哪些环节最在意，根据高频接触获取的反馈调整服务模型。
5. 规划自动化路径：当手动服务的逻辑被证明有效且价值被认可后，整理出标准化的系统需求以备后续开发。
---
分析理论基础：
Perri 描述了礼宾实验的本质："Concierge experiments deliver the end result to your client manually, but they do not look like the final solution at all... By taking on the work yourself, you can learn how to build the software correctly the first time."

礼宾实验的关键优势：以极低的试错成本获取最真实的客户反馈。尽管这种方法不可扩展（Does Not Scale），但它能防止团队在未验证价值假设前就投入大量工程资源，避免陷入功能陷阱。

Agent 应当：充当实验设计师，帮助用户将复杂的软件构想"降维"拆解为纯人工的手动服务流程，并设计在提供服务时的观察指标和反馈收集机制，明确界定实验成功的判定标准。
---
出处：
《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第 IV 部分, 第 18 章"Solution Exploration"
```

#### [如何利用"绿野仙踪"实验进行更大规模的需求测试？] (拼接：数据获取后缀)
```text
如何利用"绿野仙踪实验（Wizard of Oz Experiment）"进行更大规模的需求测试？
1. 建立前端体验：设计一个看起来完全真实、已开发完成的产品前端或落地页，给用户提供标准化的交互体验。
2. 搭建"幕后"人工机制：在后端不编写任何自动化代码，由人工处理所有前端传来的用户请求。
3. 监控转化与留存指标：在较大范围内推广该前端，通过真实的用户转化率验证规模化的市场需求。
4. 设立终止条件：明确实验的终止时间或数据阈值，防止长期维持高成本的后端人工操作。
---
分析理论基础：
Perri 区分了绿野仙踪实验与礼宾实验的核心差别："The idea behind the Wizard of Oz is that, unlike the concierge experiment, it looks and feels like a real, finished product. Customers don't know that, on the backend, it's all manual. Someone is pulling the strings—just like the Wizard of Oz."

绿野仙踪实验在前端呈现出完美的系统假象，而在幕后则是纯人工操作。这种方法能在不投入巨额后端开发成本的情况下，在更大规模上测试用户是否愿意为该产品形态买单，适用于想要在大流量下验证需求但又不想过早投入工程资源的场景。

Agent 应当：帮助用户梳理哪些前端必须做得"逼真"，哪些后端逻辑可以被"人工替代"，并设定严格的数据追踪指标和实验停止边界。
---
出处：
《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第 IV 部分, 第 18 章"Solution Exploration"
```

---

### 产品沟通与战略

#### [如何将产品汇报从"产出导向"转为"成果导向"？] (拼接：数据获取后缀)
```text
如何将产品汇报从"产出导向"转为"成果导向（Outcomes-Focused）"？
1. 诊断现有汇报话术：审查近期的产品汇报，找出其中单纯描述"发布了什么功能"的表述。
2. 关联战略意图（Strategic Intents）：要求阐述该功能发布所支持的公司级或产品级业务目标（如提升留存、降低获客成本）。
3. 重构汇报框架：采用"我们做了什么动作 → 观察到了什么数据变化 → 对业务目标的实际贡献 → 下一步的学习/行动"的格式重写沟通内容。
4. 建立分层汇报节奏：根据受众调整汇报颗粒度——高管听到的是财务与业务成果，团队讨论的是产品迭代成果。
---
分析理论基础：
Perri 指出组织转型中失败的常见原因："Many companies fall back into bad habits because they have not figured out how to consistently communicate progress across the company in the form of outcomes. When leaders do not see progress toward goals, they quickly resort to their old ways."

必须在 Quarterly Business Reviews、Product Initiative Reviews 和 Release Reviews 等节奏中，在不同层级对齐战略成果。高管层的汇报应聚焦于战略意图的推进程度，团队层的汇报应聚焦于实验结果与学习收获。

Agent 应当：扮演企业内部的沟通导师，接收用户提供的工作汇报草稿，识别出"产出型"词汇，引导用户用数据和"业务成果"重新包装这些汇报，使其符合产品导向型组织的沟通标准。
---
出处：
《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第 V 部分, 第 20 章"Outcome-Focused Communication"
```

#### [如何制定产品愿景并向下拆解对齐？] (拼接：数据获取后缀)
```text
如何制定产品愿景并向下拆解对齐？
1. 明确公司愿景（Company Vision）：确立公司长期的价值方向和存在的意义。
2. 设定战略意图（Strategic Intents）：提取 1-3 个为了实现公司愿景目前必须克服的最高级别商业挑战（如进军新市场、整体留存率提升至 X%）。
3. 规划产品倡议（Product Initiatives）：将战略意图转化为产品层面的探索方向，回答"产品可以通过解决哪些用户问题来达成这一商业挑战？"。
4. 确定团队目标与选项（Options & Team Goals）：头脑风暴具体的解决方案（选项），并为每个团队设定短期、可衡量的团队目标，以验证选项的有效性。
---
分析理论基础：
Perri 给出了四级战略级联框架："We need a cadence of communicating strategy that matches our strategic framework. Remember our four levels of strategy: vision, strategic intent, product initiatives, and options. Each of these is on a different time horizon..."

通过四个层级的级联对齐，确保前线团队在做具体功能实验时，始终与公司的最高愿景和商业挑战保持一致，从而赋予团队真正的自治权（Autonomy）——知道方向，但自由选择路径。

Agent 应当：作为战略规划助手，引导用户从公司愿景出发自上而下逐层拆解，利用逻辑关联性检查每个下层目标（Product Initiatives）是否能有效支撑上层目标（Strategic Intents），最终生成结构化的战略部署树。
---
出处：
《逃离功能陷阱》(Escaping the Build Trap), Melissa Perri — 第 III 部分, 第 12-14 章 及 第 V 部分, 第 20 章
```

---

## 第三部分：用户留存与流失分析

> 来源：《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold

---

### 流失率诊断

#### [如何通过单指标同期群分析流失率？] (拼接：数据获取后缀)
```text
如何通过单指标同期群分析流失率？
1. 从数据集中提取用户的某种行为指标（如发帖数、登录天数）和流失标签（是/否）。
2. 使用分位数离散化方法（Quantile-Based Discretization，如 10 等分）将用户按该指标排序并划分为若干离散的同期群（Cohorts）。
3. 计算每个同期群的平均指标值以及该同期群的平均流失率。
4. 绘制折线图，横轴为平均指标值，纵轴为对应的流失率，观察两者的相关趋势，寻找指标的"健康阈值"（流失率显著下降的拐点）。
---
分析理论基础：
Gold 在《客户留存数据分析与预测》中定义了指标同期群："A metric cohort is a cohort of customers defined by having similar values on a metric." 作者强调真正的关键指标往往与流失率呈现非线性的降低关系："If customers who use a product less churn more, a group of relatively inactive customers should have a higher churn rate than a group of relatively active customers."

这种分析方法能够揭示行为指标对留存的实际影响，并找出"最低健康使用水平"——低于该阈值的用户流失风险大幅提升。

Agent 应当：自动识别核心业务行为指标，将其等分为 10 个同期群，分别计算流失率，检测指标是否存在明显的头部倾斜（Skewness），并输出能够显著降低流失率的健康阈值。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 II 部分, 第 5 章"Understanding churn and behavior with metrics"
```

#### [如何设计比率指标来揭示客户真实的价值感受？] (拼接：数据获取后缀)
```text
如何设计比率指标来揭示客户真实的价值感受？
1. 选取两个具有关联度但单独看无法反映客户单位价值的绝对指标（如"月经常性收入 MRR"和"客户实际获得的服务量，如通话次数"）。
2. 将两者逐行相除，计算诸如"平均每次通话成本（MRR per call）"的比率指标。
3. 对计算出的比率指标进行异常处理（空值和分母为零的记录须剔除或赋予特殊标记）。
4. 使用该比率指标进行流失相关性评估或同期群分析。
---
分析理论基础：
Gold 解释了比率指标的核心价值："A ratio metric is a metric that is made by taking the ratio of the values of two other metrics... An effective recurring unit cost metric is created from the ratio of MRR to some outcome achieved by the customers. A recurring unit cost metric usually shows increasing churn with increasing unit cost."

直接看 MRR 往往得出"付费越多流失越少"的误导性结论，而单位成本比率才能揭示"高付费但低使用率"客户的流失风险——这类客户感受到的性价比极差，是最大的隐形流失危机。

Agent 应当：扫描数据表中的财务成本指标和对应的业务活动量指标，自动生成相关的比率特征（单位成本、单位收益），剔除分母为 0 的异常，然后评估该比率指标与流失标签的相关性。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 II 部分, 第 7 章"Segmenting customers with advanced metrics"
```

#### [如何通过类别占比指标分析不同功能模块的健康度？] (拼接：数据获取后缀)
```text
如何通过类别占比指标分析不同功能模块的健康度？
1. 对于具备多种业务模块（如不同频道的内容、不同类别的功能）的产品，首先计算客户在各子类下的使用量。
2. 将各子类的使用量相加，得到总活跃度（作为分母）。
3. 将各个特定子类指标除以总活跃度，得出针对各个业务模块的"类别占比"指标。
4. 分析这些占比指标是否导致了流失率的显著差异，从而判定各功能模块的健康度与对留存的实际贡献。
---
分析理论基础：
Gold 阐述了类别占比指标的分析价值："Percentage of total metrics reveals the relative balance between a set of closely related, highly correlated activities."

当产品功能丰富时，整体活跃度指标存在高度共线性。利用占比指标能够**控制总活动量的影响**，进而揭示各项功能的实际表现：某功能占比高的用户是否留存更好？某功能占比低是否是流失的先导信号？这种方法帮助剥离规模效应，找出对留存产生负面影响或积极贡献的特定行为结构。

Agent 应当：识别出同构业务的并行分类指标（如使用功能 A 次数、功能 B 次数），聚合计算总次数，自动生成每一个分类在总次数中的百分比特征，用于后续留存预测分析。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 II 部分, 第 7 章"Segmenting customers with advanced metrics"
```

#### [如何使用行为变化趋势百分比指标捕捉流失衰退预警？] (拼接：数据获取后缀)
```text
如何使用行为变化趋势百分比指标捕捉流失衰退预警？
1. 选取一个考察周期的起点和终点（如过去四周 vs 最近一周）。
2. 提取客户期末的指标值 $Metric_{@end}$ 和期初的指标值 $Metric_{@start}$。
3. 利用百分比变化公式计算衰退或增长程度：
   $$Percentage\_Change = \frac{Metric_{@end}}{Metric_{@start}} - 1.0$$
4. 分析该变化率指标的负值群体（活跃度衰退），检验其是否拥有异常高的流失率，并将其纳入流失预警名单。
---
分析理论基础：
Gold 在书中指出百分比变化的分析优势："The percentage change is a ratio that takes the change in a metric over time and divides that change by the value of the metric at the start of the period."

直接使用绝对差值是不准确的，因为差值大小往往和用户原有的活动基数高度相关——一个重度用户从 100 次减少到 90 次（绝对差 -10），与一个轻度用户从 5 次减少到 0 次（绝对差 -5），后者的流失风险远更高。相对百分比变化 (-10% vs -100%) 能正确反映这种差异。

Agent 应当：针对时间序列上的连续行为指标，自动计算滚动周期的环比变化率。重点关注指标大幅下降的群体，结合同期群分析绘制流失风险衰退曲线，并触发干预策略建议。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 II 部分, 第 7 章"Segmenting customers with advanced metrics"
```

#### [如何基于同期群分析进行高风险客户分层干预？] (拼接：数据获取后缀)
```text
如何基于同期群分析进行高风险客户分层干预？
1. 根据同期群分析的结果，找到流失率显著上升对应的指标阈值（如某个活跃度下流失风险大幅提高的拐点）。
2. 在最新的"活跃客户数据集"中，筛选出该指标低于健康阈值的目标群体。
3. 结合业务资源的限制，根据指标的最低排名（如底部 500 名）进行分类阻断与干预（Triage），而非对所有高危用户均等干预。
---
分析理论基础：
Gold 强调分层干预的策略智慧："Define a segment of customers at risk of churn by choosing the metric level based on the result of your cohort analysis... You usually don't intervene to reduce churn with the most disengaged customers."

最无互动的客户干预成本极高且往往无效（他们已经心理"离开"了产品），应瞄准处于中间流失风险段、且具备挽回潜力的用户进行精准运营。将挽留资源集中投入在"在边缘徘徊"的用户，ROI 最高。

Agent 应当：根据预先执行的同期群分析图表自动提取"流失率拐点"，将其设置为风险健康阈值，筛选出目标客群列表，过滤掉完全没有互动的"绝对沉睡"客户，输出具备干预价值的客群画像和优先级排序。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 II 部分, 第 5 章"Understanding churn and behavior with metrics"
```

---

### 流失预测建模

#### [如何使用 Logistic 回归预测客户流失概率？] (拼接：数据获取后缀)
```text
如何使用 Logistic 回归预测客户流失概率？
1. 收集客户的各类行为评分（Metric Scores）向量 $\bar{s}$，以及历史流失标签。
2. 利用 Logistic 回归算法通过历史流失样本拟合出各指标对应的参与度权重 $\bar{w}$ 以及整体偏移量（Offset）。
3. 根据公式计算单一客户的隐性参与度（Engagement）：$E = \bar{s} \cdot \bar{w}$
4. 将参与度映射到 S 型曲线（Sigmoid Function）中，输出该客户的留存与流失概率：$P = \frac{1}{1 + e^{-(E + offset)}}$
---
分析理论基础：
Gold 提出了通过 Logistic 回归估计客户参与度的核心思想："Customer engagement cannot be measured directly, but you can estimate it from customer metrics... The logistic regression model includes an offset that allows a standard S curve to match any average retention probability."

Logistic 回归的关键优势：(1) 输出经过校准（Calibrated）的概率，能够直接对应真实流失率；(2) 系数具备可解释性，易于向非技术人员说明哪些行为对留存影响最大；(3) 适用于特征数量适中的场景。

Agent 应当：使用 sklearn 等工具拟合 Logistic 回归模型，提取特征系数并乘以对应变量评估影响力，输出符合实际流失基线的真实概率，以指导运营资源的差异化投放。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 III 部分, 第 8 章"Forecasting churn"
```

#### [如何使用 XGBoost 机器学习模型提升流失预测精度？] (拼接：数据获取后缀)
```text
如何使用 XGBoost 机器学习模型提升流失预测精度？
1. 使用未经缩放和未聚合分组的原始特征（Unscaled Metrics）作为模型输入，XGBoost 无需数据标准化。
2. 设定参数网格（树深度、学习率、子样本比例等），通过交叉验证（Cross-Validation）寻找最优参数组合。
3. 训练 XGBoost 分类器，捕捉行为指标之间复杂的非线性关系和高维特征交互。
4. 使用 AUC（用于自我评估模型排序能力）和 Lift 指标（用于向业务方解释模型价值）评估模型效果，而非直接使用预测概率计算 CLV。
---
分析理论基础：
Gold 阐述了 XGBoost 在流失预测上的优势与局限："XGBoost is a state-of-the-art machine learning model that uses an ensemble of decision trees and weights their predictions together to maximize accuracy."

关键警告："XGBoost doesn't necessarily give calibrated churn probability forecasts." 它的预测概率未经校准，只适用于**对高危用户进行排序（Ranking）**，而不能直接带入生命周期价值（CLV）公式计算。若需要精确概率，需使用概率校准（Platt Scaling 或 Isotonic Regression）后处理。

Lift 指标定义："Lift is the ratio of the churn rate in the top decile (top 10% highest predicted risk customers) to the overall average churn rate in the dataset." 用于向业务人员说明模型相比随机挑选的命中率提升倍数。

Agent 应当：配置基于 XGBoost 的网格搜索训练流，提取预测概率进行 AUC/Lift 评估，生成流失风险等级名单，并明确提示用户该概率值不能直接用于精确财务测算，需额外进行概率校准。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 III 部分, 第 9 章"Forecast accuracy and machine learning"
```

#### [如何结合流失预测计算客户未来生命周期价值（FLV）？] (拼接：数据获取后缀)
```text
如何结合流失预测计算客户未来生命周期价值（FLV）？
1. 利用经校准的预测模型得出每位客户的预期流失率（$churn\_rate$）。
2. 获取每位客户当前的每期经常性利润：$mRR = 边际利润率 \times 经常性收入$。
3. 根据以下公式计算客户的预期剩余存活周期和未来生命周期价值：
   - 预期生命周期（Expected Lifetime）$= \frac{1}{churn\_rate}$
   - 未来生命周期价值（FLV）$= \frac{mRR}{churn\_rate} - mRR$
4. 综合得出的 FLV 决策：若挽留该客户的预期成本 > FLV，则挽留无意义；若 < FLV，则投入挽留是合理的。
---
分析理论基础：
Gold 强调 FLV 与传统 CLV 的核心区别："FLV emphasizes the future view of CLV for retention, which ignores acquisition and past revenue and costs."

传统的 CLV 往往包含过去的沉没成本，但在留存运营中**只有未来的价值**决定了我们应投入多少挽留成本。FLV 提供了一个清晰的决策边界：挽留成本的上限就是 FLV 本身。例如 FLV = $150，则挽留该客户可以投入的最大运营成本为 $150（优惠券、人工客服时间成本等）。

Agent 应当：提取模型输出的具体流失概率，将其转化为倒数获取预期存活周期，结合财务接口的客户单位利润进行 FLV 的实时计算，从而为运营团队输出"每位客户的最大挽留预算"决策依据。
---
出处：
《客户留存数据分析与预测》(Fighting Churn with Data), Carl S. Gold — 第 III 部分, 第 8 章"Forecasting churn"
```

---

## 第四部分：增长实验框架

> 来源：《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown

---

### PMF 验证与指标体系

#### [如何验证我们的产品是否达到了 Product/Market Fit（PMF）？] (拼接：数据获取后缀)
```text
如何验证我们的产品是否达到了 Product/Market Fit（PMF）？
1. 锁定近期活跃的核心用户群体，向他们发送包含核心问题的"不可或缺问卷（Must-Have Survey）"。
2. 在问卷中提出核心问题："如果明天这个产品不再存在，你会有多失望？"，提供四个选项：非常失望、有点失望、不失望、不再使用。
3. 收集并统计选择"非常失望"的用户比例。
4. 如果选择"非常失望"的比例达到或超过 40%，则判定产品已达到 PMF，可启动大规模的增长引擎；若低于 40%，则聚焦于产品价值优化或目标客群调整。
---
分析理论基础：
Sean Ellis 的不可或缺问卷来自《增长黑客》："The Must-Have Survey begins with the question: 'How disappointed would you be if this product no longer existed tomorrow?'" 以及："if 40 percent or more of responses are 'very disappointed,' then the product has achieved sufficient must-have status, which means the green light to move full speed ahead gunning for growth."

40% 的黄金法则来自 Ellis 在多个早期团队中的实证经验。若用户基数在没有你的产品时无动于衷，任何砸钱获客的手段都只是在制造虚假繁荣——漏水桶没有被修补，先做增长就是浪费。

Agent 应当：辅助团队设计自动化用户调研问卷，实时统计各选项反馈转化率。在"非常失望"比例不足 40% 时，交叉分析"有点失望"用户的画像，提供功能迭代与市场定位的修正建议。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 I 部分, 第 2 章"Determining If Your Product Is Must-Have"
```

#### [如何为增长团队确立唯一的北极星指标（North Star Metric）？] (拼接：数据获取后缀)
```text
如何为增长团队确立唯一的北极星指标（North Star Metric）？
1. 拆解业务的增长方程式（Growth Equation），盘点所有关键流量与转化节点。
2. 分析产品的核心价值，明确什么是代表用户获得了"Must-Have"体验的最直接变量。
3. 剔除无法直接代表用户价值创造的虚荣指标（如累计注册量、单纯的 PV/UV）。
4. 确立一个能够最准确反映用户核心价值获取的长期指标作为"北极星指标"（如 Airbnb 的"预订天数"、WhatsApp 的"消息发送量"），并以此统一全公司增长团队的目标。
---
分析理论基础：
Ellis 和 Brown 在《增长黑客》中描述了北极星指标的选择标准："The North Star should be the metric that most accurately captures the core value you create for your customers... Which of the variables in your growth equation best represents the delivery of that must-have experience?"

实际案例："For WhatsApp, the aha moment is the ability to send unlimited messages... WhatsApp's North Star was therefore the number of messages sent, rather than, say, daily active users."

北极星指标引导增长团队避免迷失在短期增长黑客技巧中。只要该指标上升，就代表业务的基本盘在真实增长，而不是在制造虚荣数字。

Agent 应当：梳理公司的业务逻辑和数据仪表盘，过滤掉虚假的流量指标；利用数据模型计算各候选指标与长期收入、长期留存之间的相关性权重，输出科学的北极星指标推荐，并建立每日波动的监控面板。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 I 部分, 第 3 章"Identifying Your Growth Levers"
```

---

### 实验优先级与激活

#### [面对众多增长想法，如何科学地为实验排定优先级？] (拼接：数据获取后缀)
```text
面对众多增长想法，如何科学地为实验排定优先级？
1. 将团队收集到的所有增长实验想法归拢入同一个实验创意库（Experiment Pipeline）。
2. 针对每个想法，从三个维度进行 1-10 分的打分：
   - **Impact（影响力）**：该想法预期对关键指标的提升程度。
   - **Confidence（把握度）**：根据过往数据和直觉判定该想法成功的概率。
   - **Ease（容易度）**：开发、设计和实施该实验所需的资源和时间成本。
3. 计算每个实验的 ICE 综合平均得分：$ICE = \frac{Impact + Confidence + Ease}{3}$。
4. 严格按照 ICE 得分从高到低对创意进行排序，优先执行高分实验，确保高节奏的测试循环。
---
分析理论基础：
Ellis 和 Brown 在《增长黑客》中介绍了 ICE 评分模型："The ICE score system... submitter should rate each idea on a ten-point scale, across each of the following three criteria: the idea's potential impact, the submitter's level of confidence in how effective it will be, and how easy it will be to implement."

ICE 的核心价值：在敏捷增长中，想法是廉价的，执行和测试才是昂贵的。ICE 评分模型提供了一个轻量级的定量框架，帮助团队消除主观争论，迅速找出最值得投入资源去试错的"低垂的果实"。

Agent 应当：充当实验管理中枢，接收各方提交的提议。调用历史实验数据库和行业基准，为每一个新的实验想法生成自动化的 I、C、E 预测分值参考，并动态输出按 ROI 排序的高优先级实验队列。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 I 部分, 第 4 章"Testing at High Tempo"
```

#### [如何找到让用户顿悟并爱上产品的 Aha Moment？] (拼接：数据获取后缀)
```text
如何找到让用户顿悟并爱上产品的 Aha Moment？
1. 抓取并分析产品数据仓库中的用户日志，筛选出使用频次最高、留存率最平稳的核心用户群体。
2. 追踪这些核心用户在注册初期的行为路径，寻找他们所完成的特定关键动作组合（如关注一定数量的好友、发送一定数量的消息）。
3. 利用相关性分析，确认哪些早期行为组合与用户长期的超高留存率之间存在强相关关系。
4. 将找到的关键行为（Aha Moment）设定为产品激活的核心目标，并设计 A/B 测试在新用户首日引导中强制或鼓励完成该行为。
---
分析理论基础：
Ellis 和 Brown 定义了 Aha Moment 的发现机制："The aha moment is the point at which users really understand the core value of the product... why that product is a 'must-have'." 以及 Facebook 的案例："For Facebook, once the growth team realized that the aha moment for their users was... adding at least seven friends within their first ten days... all of its efforts were directed at tweaking the site in order to motivate people to friend more people."

其他经典案例：Slack 发现团队发送满 2,000 条消息后 93% 的团队会持续留存；Twitter 发现注册首周关注 30 个账号的用户长期活跃度显著高于大盘。

Agent 应当：通过关联规则挖掘（Association Rule Mining）扫描用户行为日志，找出与长期留存相关性最大的特征动作组合，自动输出构成 Aha Moment 的假设路径，辅助设计新手引导漏斗。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 II 部分, 第 6 章"Hacking Activation"
```

#### [如何诊断新用户流失环节并提升激活转化率？] (拼接：数据获取后缀)
```text
如何诊断新用户流失环节并提升激活转化率？
1. 精确梳理新用户从初次访问到最终体验到 Aha Moment 所必须经历的每一个细微步骤。
2. 将数据按获客渠道（如搜索引擎、社交平台、口碑推荐）进行分群，分别绘制渠道专用的激活漏斗（Funnel）。
3. 计算用户在漏斗中每个节点到下一节点的转化率，找出断崖式流失的最严重瓶颈步骤。
4. 在高流失节点发起微型问卷调研，找出用户流失的真实心理动因，针对性设计 A/B 测试消除阻碍。
---
分析理论基础：
Ellis 和 Brown 阐述了漏斗分析的核心方法："The first step in hacking activation is to identify each point in your customers' journey toward the aha moment... calculate the conversion rates for each of the steps... and segment users by the channel through which they arrive."

通过细粒度的漏斗分群分析，可以将原本模糊的"跳出率"拆解为一个个具体可操作的界面阻力和体验断层。不同渠道的用户可能在不同节点流失——付费广告用户可能在注册页流失更多，因为存在"营销承诺与产品实际体验不符"的价值差距。

Agent 应当：接入埋点数据流，自动生成多维度的交叉漏斗转化图表。当检测到特定渠道或特定路径上的转化率出现异常衰减时，触发自动警报，并针对该漏斗环节提出假说驱动的优化实验草案。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 II 部分, 第 6 章"Hacking Activation"
```

#### [如何通过增加"正向摩擦"步骤来提升新用户的激活率？] (拼接：数据获取后缀)
```text
如何通过增加"正向摩擦（Positive Friction）"步骤来提升新用户的激活率？
1. 识别出为让用户体验产品核心价值，必须向其传达的复杂规则或必须获取的用户偏好信息。
2. 转变"一味缩减步骤以减少摩擦"的常规思维，设计能引起用户兴趣和心流的"正向摩擦"环节。
3. 采用游戏化的新手引导（Learn Flow）或渐进式的表单设计，将原本枯燥的信息收集变成有趣的心理奖励过程。
4. 通过 A/B 测试追踪在增加这些步骤后，用户到达 Aha Moment 的比率是否反而提升了。
---
分析理论基础：
Ellis 和 Brown 打破了"减少摩擦是万能法则"的误区："Creating positive friction is a delicate art of putting manageable, ideally engaging steps in the path of visitors that help them understand what the value is and get to the aha moment with greater predictability." 以及："Videogame developers have honed the practice... providing a psychological reward (the satisfaction of a completed profile)."

并非所有的界面摩擦都是坏事。当摩擦步骤能帮助用户更好理解产品价值，或通过满足用户的掌控感和心理预期（如完成档案的成就感）时，这种摩擦反而会增加用户的沉没成本，提升最终的激活率。

Agent 应当：分析用户放弃表单时的界面驻留时间及跳出动作，辅助交互设计师设计 A/B 测试，比较"极简注册"与"游戏化渐进引导"的长期激活效果，生成激励性的文案与引导建议。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 II 部分, 第 6 章"Hacking Activation"
```

#### [如何科学衡量产品留存率并找出高留存的用户行为特征？] (拼接：数据获取后缀)
```text
如何科学衡量产品留存率并找出高留存的用户行为特征？
1. 将用户按照初次获客的时间（按月、周或日）进行横向切分，建立"同期群留存分析（Cohort Analysis）"数据视图。
2. 追踪各个同期群在第 1 天、第 7 天、第 30 天及更长周期内的留存曲线走势，确认曲线最终是否趋于平稳（不再向下倾斜）。
3. 对比不同时间段同期群的曲线差异，若某个同期群留存暴跌，立即排查当期的渠道质量和产品故障。
4. 进阶切分：按用户的早期核心行为进行纵向同期群拆分，对比找出哪种特定行为模式能造就高水平的"微笑留存曲线"。
---
分析理论基础：
Ellis 和 Brown 阐述了同期群分析的价值："Cohort analysis, which is dividing your customers or users into distinctive groups by a common trait... The most basic way is by the time of acquisition, meaning the date they signed up... tracking retention by cohorts allows teams to discover the overall health of the customer base."

看总体留存率或活跃用户数会掩盖早晚期用户的本质差异。同期群分析是诊断留存率的"X 光机"——它剥离了新用户涌入带来的数据噪音，暴露了产品是否真的在长期留住同批次进来的用户。

Agent 应当：调用 SQL 从数据仓库自动提取并构建时间维度和行为维度的二维同期群数据，自动绘制留存衰减折线图，并通过分析标记出留存率极高的"特异点同期群行为"。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 II 部分, 第 7 章"Hacking Retention"
```

#### [如何评估和设计产品的病毒循环与分享机制？] (拼接：数据获取后缀)
```text
如何评估和设计产品的病毒循环与分享机制？
1. 梳理产品的内生病毒循环（Viral Loop），找出老用户向新用户发出邀请的所有触点。
2. 监测并计算病毒系数（K 因子）：$K = i \times c$
   - $i$ = 用户的平均邀请发出数
   - $c$ = 被邀请人的平均注册转化率
3. 如果 $K > 1$，产品即可实现爆发式自发增长；在大多数情况下，只要 $K > 0$，就能降低综合获客成本。
4. 运用病毒三大要素（Payload 有效载荷、Frequency 频率、Conversion 转化率），设计双向奖励实验（如 Dropbox 赠送存储空间），分别提升公式中的 $i$ 和 $c$。
---
分析理论基础：
Ellis 和 Brown 给出了病毒循环的数学基础："VIRAL COEFFICIENT (K) = INVITES SENT OUT BY CUSTOMERS × THE PERCENTAGE OF THOSE INVITED WHO ACCEPT THE INVITE"

以及关键的先决条件："The virality of any product is controlled by three factors... If your product isn't delivering value, if it doesn't deliver the aha moment—then no viral loop strategy is going to help you."

病毒式传播不是靠运气，而是一个纯粹的数学概率游戏与心理学的结合。只有建立在强大的 Aha Moment 基础上，优化推荐引擎和双端激励机制才能让病毒系数最大化。

Agent 应当：实时监控各项邀请机制的分享率和落地页转化率数据，自动计算 K 因子波动。当识别到转化瓶颈时，自动生成优化落地页（提升 $c$）或增加分享触发点（提升 $i$）的策略建议。
---
出处：
《增长黑客》(Hacking Growth), Sean Ellis & Morgan Brown — 第 II 部分, 第 5 章"Hacking Acquisition" 及 第 8 章"Hacking Referral"
```

---

## 第五部分：产品驱动增长（PLG）策略

> 来源：《产品驱动增长》(Product-Led Growth), Wes Bush

---

### GTM 策略选择

#### [如何为我的产品选择正确的 GTM 策略（Free Trial vs Freemium）？] (拼接：数据获取后缀)
```text
如何为我的产品选择正确的 GTM 策略（Free Trial vs Freemium）？
1. 收集目标产品的市场环境数据、目标受众画像、产品复杂度和研发成本。
2. 应用 MOAT 框架进行结构化分析：
   - **M**arket Strategy（市场策略）：策略是 Dominant（主导）、Disruptive（颠覆）还是 Differentiated（差异化）？
   - **O**cean Conditions（海洋环境）：市场是竞争激烈的红海还是未被开发的蓝海？
   - **A**udience（受众）：销售策略是自上而下（Top-down）还是自下而上（Bottom-up）？
   - **T**ime-to-value（价值实现时间）：用户体验到核心价值需要多长时间？
3. 根据分析结果，输出 Free Trial、Freemium 或混合模式（Hybrid Model）的最优解推荐，并说明推演逻辑。
---
分析理论基础：
Wes Bush 提出了 MOAT 决策框架："To make the right choice, you need a decision framework to compare the free-trial, freemium, and demo models. In this chapter, we'll walk through my MOAT framework to help you pick the right go-to-market strategy for your business."

Freemium 的成功依赖于庞大的总体可寻址市场（$TAM$）：$Revenue = Conversion\_Rate \times TAM \times ARPU$——若 $TAM$ 过小，Freemium 会过度消耗潜在付费用户。Free Trial 适合功能复杂但价值直接的产品；Freemium 适合网络效应驱动或价值需要时间积累的产品。

Agent 应当：引导用户提供市场、受众和产品的详细背景，逐步套用 MOAT 框架的四个维度，生成评分或对比矩阵，最终给出具体的模式选择建议及防范风险的措施。
---
出处：
《产品驱动增长》(Product-Led Growth), Wes Bush — 第 I 部分, 第 2 章"Choose Your Weapon—Free Trial, Freemium, or Demo?" 及 第 6 章"Choose Your Product-Led Growth Model with the MOAT Framework"
```

---

### 价值传递与 Onboarding 优化

#### [如何构建产品驱动增长（PLG）的核心价值基础？] (拼接：数据获取后缀)
```text
如何构建产品驱动增长（PLG）的核心价值基础？
1. 输入产品的定位声明、核心功能列表、现有营销物料及留存表现数据。
2. 利用 UCD 框架进行结构性解构：
   - **U**nderstand（理解你的价值）：分析并明确产品到底解决了用户的哪一个核心诉求（Jobs-to-be-Done）。
   - **C**ommunicate（沟通感知价值）：审计官网、定价页及落地页，确保感知的价值准确无误地传达给目标受众。
   - **D**eliver（交付承诺价值）：评估产品体验是否兑现了前期沟通中的承诺。
3. 识别出 U-C-D 链条中的断裂点，并提供迭代策略，确保期望与实际体验统一。
---
分析理论基础：
Bush 提出 UCD 框架作为 PLG 的基础底座："In this section, we'll go through the UCD framework, which shows you how to build a solid foundation for your product-led business... Each step builds on the other: Understand your value. Communicate the perceived value of your product. Deliver on what you promise."

UCD 框架的核心洞察：产品流失最常发生在用户期待的价值（基于营销沟通）与实际获得的体验不符时。三个环节中任何一个断裂都会导致高流失：理解错了用户需求（U 断裂），沟通夸大了实际价值（C 断裂），或产品交付了低于承诺的体验（D 断裂）。

Agent 应当：通过对比分析营销话术提取的"预期"和实际产品提供的"结果"，量化分析两者之间的匹配度，指出哪一个环节（U、C 或 D）存在偏差，并给出具体的矫正建议。
---
出处：
《产品驱动增长》(Product-Led Growth), Wes Bush — 第 II 部分, 第 7 章"Build a Product-Led Foundation"
```

#### [如何评估并优化新用户的 Time-to-Value（TTV）体验？] (拼接：数据获取后缀)
```text
如何评估并优化新用户的 Time-to-Value（TTV）体验？
1. 提取产品新用户的留存数据、首次操作日志及流失节点的转化率。
2. 将当前新用户群体按"动机强度"与"产品易用性感知"两个维度进行四象限划分：
   - **Mission Impossible Users**：低动机 + 难使用（最难转化）
   - **Rookie Users**：高动机 + 难使用（需降低摩擦）
   - **Veteran Users**：低动机 + 易使用（需强化动机）
   - **Spoiled Users**：高动机 + 易使用（最佳状态，促使更多用户到达此象限）
3. 针对不同类型的用户群，输出具体的优化策略，促使更多用户向 Spoiled Users 转化，从而缩短 TTV。
---
分析理论基础：
Bush 在《产品驱动增长》中强调："To create a successful product-led business, you need a quick time-to-value. New users need to be able to experience a key outcome in your product quickly and without any assistance."

四象限模型揭示了两种截然不同的流失原因：动机不足导致的流失（需要改进文案和价值传递），以及摩擦过大导致的流失（需要优化可用性和产品引导）——对症下药才能有效缩短 TTV。

Agent 应当：请求用户输入 Onboarding 漏斗数据与用户画像，建立动机-易用性矩阵，针对落在非理想象限的用户数据进行归因分析，并生成针对性的 TTV 缩短建议清单。
---
出处：
《产品驱动增长》(Product-Led Growth), Wes Bush — 第 I 部分, 第 5 章"Time-to-Value: How Fast Can You Showcase Value?"
```

#### [如何识别和修复产品转化过程中的价值差距（Value Gap）？] (拼接：数据获取后缀)
```text
如何识别和修复产品转化过程中的价值差距（Value Gap）？
1. 抓取从营销落地页到产品核心功能体验路径上的埋点转化数据。
2. 从三个维度排查转化漏斗中的 Value Gap：
   - **Ability Debt（能力债务）**：识别产品中让用户无法独立完成核心操作的摩擦点（如强制邮件验证、不必要的表单字段）。
   - **购买动机错位**：对比营销端传递的价值与用户实际追求的 Outcome 是否一致。
   - **价值沟通偏差**：分析产品内的文案和引导是否准确传递了产品价值。
3. 产出包含严重程度排序的"价值差距修复清单"，优先消除 Ability Debt。
---
分析理论基础：
Bush 定义了 Ability Debt 的概念："Ability debt is the price you pay every time your user fails to accomplish a key outcome in your product... To chip away at your ability debt, you need to be ruthless about reducing friction."

每一次用户未能在产品中完成关键成果，都是一笔 Ability Debt 的债务。这些失败体验不仅导致当次流失，还会损害产品的口碑和推荐率。Value Gap 的修复应从影响最大、成本最低的 Ability Debt 入手。

Agent 应当：模拟用户的视线路径和操作流程，比对"期望获得的成果"与"实际操作的复杂度"，量化摩擦成本，并提供减少 Ability Debt 的重构建议，按严重程度排序输出修复优先级清单。
---
出处：
《产品驱动增长》(Product-Led Growth), Wes Bush — 第 II 部分, 第 11 章"The Three Value Gaps You Need to Crush"
```

#### [如何设计有效的新用户产品内引导（In-app Guidance）？] (拼接：数据获取后缀)
```text
如何设计有效的新用户产品内引导（In-app Guidance）？
1. 录制或拉取用户从注册到达成 Aha Moment 的所有操作步骤记录。
2. 使用"保龄球道框架（Bowling Alley Framework）"对步骤进行改造：
   - **绘制直线（Straight Line）**：梳理最短路径，将步骤标记为绿（必要保留）、黄（延后引入）或红（完全删除）。
   - **设计产品保险杠（Product Bumpers）**：识别用户容易放弃的节点，规划进度条、检查清单、空状态提示等应用内引导元素。
   - **设计对话保险杠（Conversational Bumpers）**：规划基于触发条件的消息（触发式邮件、应用内消息），将脱轨用户拉回主线。
3. 输出完整的新用户入轨（Onboarding）优化方案图谱，包含每个节点的改造建议。
---
分析理论基础：
Bush 提出了保龄球道框架的核心原则："When users get sidetracked or leave the product, it's our duty to bump them back in the right direction... To master the Bowling Alley Framework, you need to do three things: Develop your straight line. Create a product bumper. Build a conversational bumper."

保龄球道比喻：用户是保龄球，价值体验（Aha Moment）是球瓶，Product Bumpers 和 Conversational Bumpers 是防止球滚入沟槽（流失）的挡板。最短直线路径确保了用户以最快速度触达价值，而双重护栏系统则确保了偏航用户能被及时纠正。

Agent 应当：要求用户输入当前的 Onboarding 流程节点，执行"红黄绿"标记剥离分析，然后为剩下的核心直线路径补充适合的 Product/Conversational Bumpers，以闭环形式输出改进地图。
---
出处：
《产品驱动增长》(Product-Led Growth), Wes Bush — 第 III 部分, 第 13 章"The Bowling Alley Framework"
```

#### [如何基于 LTV 和 CAC 数据匹配合适的销售介入时机？] (拼接：数据获取后缀)
```text
如何基于 LTV 和 CAC 数据匹配合适的销售介入时机？
1. 导入当前产品的客户生命周期价值（$LTV$）和客户获取成本（$CAC$）数据，以及各渠道的转化情况。
2. 测算 $LTV/CAC$ 的比值：
   - $LTV/CAC \geq 3.0$：健康——可引入适度的销售介入策略。
   - $LTV/CAC \in [1.0, 3.0)$：警告——需先提升产品留存或降低获客成本，再考虑销售投入。
   - $LTV/CAC < 1.0$：危险——立即停止付费获客，每获取一个用户都在亏损。
3. 匹配销售模型：高 LTV → 低接触（Low-touch）或高接触（High-touch）销售；低 LTV → 严格限制销售介入，依赖纯自助式 PLG。
4. 输出销售团队介入的触发条件阈值（如用户在产品内达到特定里程碑行为时触发 SDR 介入）。
---
分析理论基础：
Bush 在《产品驱动增长》中给出了销售介入的经济学逻辑："How you reach out depends on your average LTV. If you don't match your outreach approach with your LTV, you risk running an unprofitable business."

SaaS 行业健康约束：$CAC \leq \frac{LTV}{3}$。当不根据 LTV 来匹配触达策略时，不可持续的 CAC 将摧毁企业的利润率——一个只值 $200 的用户，如果需要花费 $300 的销售成本才能转化，每获一个用户都在亏钱。

Agent 应当：接收财务与转化数据，计算当前阶段的 LTV 与 CAC 水平，判断人工介入的盈亏平衡点，据此为企业制定阶梯化的销售介入策略，并输出触发销售介入的用户行为阈值配置建议。
---
出处：
《产品驱动增长》(Product-Led Growth), Wes Bush — 第 III 部分（LTV/CAC 匹配策略章节）
```

---

## 快速引用索引

| 分析场景 | 对应 Prompt | 来源书目 |
|----------|-------------|----------|
| 实验结果可信度验证 | SRM 检验、Twyman 定律、辛普森悖论 | 关键迭代 |
| 实验设计与样本量 | OEC 设计、MDE 计算、护栏指标 | 关键迭代 |
| 多指标同时监控 | 多重比较问题、护栏指标分层 | 关键迭代 |
| 网络效应产品实验 | SUTVA 检测与隔离 | 关键迭代 |
| 功能价值评估 | 功能陷阱诊断、Product Kata | 逃离功能陷阱 |
| 需求验证（0代码）| 礼宾实验、绿野仙踪实验 | 逃离功能陷阱 |
| 产品战略对齐 | 愿景拆解、成果导向沟通 | 逃离功能陷阱 |
| 流失率细粒度分析 | 单指标同期群、比率指标、占比指标 | 客户留存分析 |
| 流失预警与干预 | 趋势百分比指标、高风险分层 | 客户留存分析 |
| 流失预测建模 | Logistic 回归、XGBoost、FLV 计算 | 客户留存分析 |
| PMF 验证 | 不可或缺问卷、北极星指标 | 增长黑客 |
| 实验优先级排序 | ICE 评分 | 增长黑客 |
| 激活漏斗优化 | Aha Moment 发现、漏斗诊断、正向摩擦 | 增长黑客 |
| 留存与病毒增长 | 同期群分析、K 因子 | 增长黑客 |
| GTM 模式选择 | MOAT 框架 | 产品驱动增长 |
| Onboarding 优化 | UCD 框架、TTV 四象限、保龄球道、Value Gap | 产品驱动增长 |
| 销售介入时机 | LTV/CAC 匹配策略 | 产品驱动增长 |
