# Shiplens CLI Execution Prompt Preset Library

---

## Scenario Outline (43 Scenarios)

> **How to use**: Scan this outline to find the matching scenario, then jump to its full section below for deterministic CLI commands and analysis steps.

### Basic Analytics (3)
1. [What Stage Is My Product In? What Metrics Should I Track?](#what-stage-is-my-product-in-what-metrics-should-i-track)
2. [How Did the Product Perform This Week?](#how-did-the-product-perform-this-week)
3. [Post-Release Product Iteration Analysis](#post-release-product-iteration-analysis)

### Product Demand Validation (3)
4. [Do Users Really Need My Product?](#do-users-really-need-my-product)
5. [Do I Have a Core Group of Loyal Users? What Are Their Behaviors?](#do-i-have-a-core-group-of-loyal-users-what-are-their-behaviors)
6. [Which Single Metric Should I Track Daily?](#which-single-metric-should-i-track-daily)

### User Activation & Experience (4)
7. [How Long Does It Take New Users to Reach Value (TTV)?](#how-long-does-it-take-new-users-to-reach-value-ttv)
8. [Where Do New Users Drop Off in the Onboarding Funnel?](#where-do-new-users-drop-off-in-the-onboarding-funnel)
9. [Which User Behaviors Signal Long-Term Retention (Aha Moment)?](#which-user-behaviors-signal-long-term-retention-aha-moment)
10. [Where Do New Users Come From and What Are Their Traits?](#where-do-new-users-come-from-and-what-are-their-traits)

### Acquisition Quality (1)
11. [Are Low-Quality Channels Driving Fake Traffic? How Do Channels Compare?](#are-low-quality-channels-driving-fake-traffic-how-do-channels-compare)

### A/B Testing (4)
12. [A/B Test Experiment Results Comparison](#ab-test-experiment-results-comparison)
13. [Are My A/B Test Results Trustworthy and Statistically Valid?](#are-my-ab-test-results-trustworthy-and-statistically-valid)
14. [Is There an Overall Score to Track if the Product Is Improving?](#is-there-an-overall-score-to-track-if-the-product-is-improving)
15. [How to Run an A/A Test to Validate the Experiment System?](#how-to-run-an-aa-test-to-validate-the-experiment-system)

### User Retention & Churn (5)
16. [Which Users Are Becoming Inactive and How to Catch Them Before Churn?](#which-users-are-becoming-inactive-and-how-to-catch-them-before-churn)
17. [What Leading Indicators Predict User Churn?](#what-leading-indicators-predict-user-churn)
18. [Are High-Paying Users Satisfied or at Risk of Canceling?](#are-high-paying-users-satisfied-or-at-risk-of-canceling)
19. [Which Feature Usage Mix Indicates Healthy Engagement?](#which-feature-usage-mix-indicates-healthy-engagement)
20. [Which Churn-Risk Users Should Be Prioritized for Re-Engagement?](#which-churn-risk-users-should-be-prioritized-for-re-engagement)

### Monetization & Revenue (5)
21. [Pre-Subscription User Behavior Analysis](#pre-subscription-user-behavior-analysis)
22. [Subscriber Insights & Upsell Triggers](#subscriber-insights--upsell-triggers)
23. [What Is the Customer Lifetime Value (LTV)?](#what-is-the-customer-lifetime-value-ltv)
24. [Is My CAC Reasonable and What Is the Payback Period?](#is-my-cac-reasonable-and-what-is-the-payback-period)
25. [Should I Choose Freemium or Free Trial?](#should-i-choose-freemium-or-free-trial)
26. [When Does a Free User Become a Product Qualified Lead (PQL)?](#when-does-a-free-user-become-a-product-qualified-lead-pql)

### Virality & Team Efficiency (4)
27. [Does My Product Have Viral Growth Loops?](#does-my-product-have-viral-growth-loops)
28. [Are We Truly Improving the Product or Shipping Outputs?](#are-we-truly-improving-the-product-or-shipping-outputs)
29. [Are We Trapped in Building Features Nobody Wants?](#are-we-trapped-in-building-features-nobody-wants)
30. [How to Prioritize Growth and Feature Ideas with ICE Scoring?](#how-to-prioritize-growth-and-feature-ideas-with-ice-scoring)

### Dashboard Creation (2)
31. [Create 30-Day New User Retention Matrix Dashboard](#create-30-day-new-user-retention-matrix-dashboard)
32. [Create Sequential Step Conversion Funnel Dashboard](#create-sequential-step-conversion-funnel-dashboard)

### Advanced Configuration & Tracking (3)
33. [Configure A/B Test Event Tracking](#configure-ab-test-event-tracking)
34. [Track and Measure User Aha Moment](#track-and-measure-user-aha-moment)
35. [Track Subscription Revenue & Build Daily Subscription Dashboard](#track-subscription-revenue--build-daily-subscription-dashboard)

### Initial Setup (5)
36. [Shiplens CLI One-Click Setup & Analytics Initialization](#shiplens-cli-one-click-setup-analytics-initialization)
37. [Use Shiplens CLI to Install Analytics SDK & Link to Existing Account](#use-shiplens-cli-to-install-analytics-sdk-link-to-existing-account)
38. [Delete Shiplens Project Analytics Data & SDK (No Longer Needed)](#delete-shiplens-project-analytics-data-sdk-no-longer-needed)
39. [Delete Shiplens CLI](#delete-shiplens-cli)
40. [Use Shiplens CLI to Generate Context Descriptions for All Pages and Buttons](#use-shiplens-cli-to-generate-context-descriptions-for-all-pages-and-buttons)

### Troubleshooting & Diagnostics (3)
41. [Test Shiplens Telemetry Pipeline and Environment](#test-shiplens-telemetry-pipeline-and-environment)
42. [Enable Local Debug Mode and Verify Event Reporting](#enable-local-debug-mode-and-verify-event-reporting)
43. [Test Event Reporting in Production Build & Release Environments](#test-event-reporting-in-production-build--release-environments)

---

## 1. Scenario-Based Prompt Shortcuts Library

### Basic Analytics

#### [lifecycle_stage] What Stage Is My Product In? What Metrics Should I Track? (Suffix: Data Fetching)
```text
What stage is my product in? What metrics should I track?
1. Run `shiplens summary --range 7d --json` to extract total unique visitors (unique_visitors), pageviews (pageviews), and daily active users (DAU).
2. Run `shiplens query --metric daily_retention --range 30d --grain week --json` to fetch Day 1, Day 7, Day 14, and Day 30 cohort retention matrices across the past 4 weeks.
3. Run `shiplens summary --range 30d --json` to compute the 30-day user stickiness ratio (DAU / MAU).
4. Determine the product lifecycle phase:
   - If Day 1 retention < 20% or DAU/MAU < 0.10, classify as PMF Exploration & Activation; primary lever is Time-to-Value (TTV) and activation rate;
   - If Day 30 retention stabilizes at 15%~25% with a flattened curve, classify as Retention Stabilization; focus on feature adoption and second-week retention;
   - If retention is resilient and engagement is high, classify as Scale & Monetization; focus on LTV/CAC unit economics and K-factor virality.
5. Output lifecycle diagnosis, target metric benchmarks, and actionable optimization strategies.

Please prioritize calling Shiplens CLI (Action: lifecycle_stage) to execute the above requirements.
---
Analysis Foundation:
- Lifecycle Stage Alignment: Product growth levers shift systematically across lifecycle stages:
  - PMF & Activation: Prioritize short-term retention (Day 1 / Day 7) and core activation rate. Premature acquisition scaling accelerates churn.
  - Retention Stabilization: Focus on retention curve flattening and Day 30 retention asymptote to validate sustained value delivery.
  - Scale & Monetization: Shift focus to unit economics (LTV/CAC) and viral expansion (K-factor).
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 3: "Determining Your Growth Levers"
```

#### [weekly_performance] How Did the Product Perform This Week? (Suffix: Data Fetching)
```text
How did the product perform this week?
1. Run `shiplens summary --range 7d --json` to extract 7-day UV, PV, sessions, and average dwell time.
2. Run `shiplens query --metric pageviews --grain day --range 14d --json` to slice daily data and calculate week-over-week (WoW) Delta against the previous 7 days.
3. Read `.shiplens/contexts/<app_id>.md` to identify core feature routes, then run `shiplens pages --range 14d --json` to compare traffic and dwell time shifts for core modules.
4. Run `shiplens query --metric bounce_rate --grain day --range 14d --json` to check if macro bounce rate increased anomalously.
5. Output weekly performance scorecard: traffic changes, core feature momentum, anomaly warnings, and growth opportunities.

Please prioritize calling Shiplens CLI (Action: weekly_performance) to execute the above requirements.
---
Analysis Foundation:
- Ratio & Trend Monitoring: Periodic health evaluation requires combining ratio metrics with week-over-week trend analysis:
  - Ratio Metrics: Quantify depth of engagement (e.g., active days per week or core actions per session) rather than raw vanity volume.
  - Trend Metrics: Compare rolling observation windows (e.g., current 7 days vs. previous 7 days) to eliminate daily noise and detect early adoption anomalies.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part II, Chapter 7: "Customer Cohorts and Customer Churn"
```

#### [post_release_analysis] Post-Release Product Iteration Analysis (Suffix: Data Fetching)
```text
How effective was the latest product release?
1. Run `shiplens query --metric pageviews --range 14d --grain day --json` to extract daily PV/UV time series 7 days pre- and post-launch.
2. Run `shiplens pages --range 14d --json` to compare adoption rates, dwell time, and visit depth across modified pages and new feature buttons.
3. Run `shiplens query --metric daily_retention --range 30d --grain week --json` to measure Day 1 and Day 7 retention Delta between pre- and post-release cohorts.
4. Run `shiplens query --metric bounce_rate --range 14d --grain day --json` to verify if post-release bounce rates deteriorated (> 10% increase indicates interface friction).
5. Output iteration outcome scorecard: key metrics comparison, net outcome evaluation (positive lift / neutral / negative regression), and next iteration roadmap.

Please prioritize calling Shiplens CLI (Action: post_release_analysis) to execute the above requirements.
---
Analysis Foundation:
- Outcome Verification over Output: Shipping a feature is merely an output; true progress is measured by measurable shifts in user behavior (outcomes).
- Pre/Post Cohort Comparison: Evaluate the net impact of an iteration by comparing retention curves (Day 1/7/30) and friction metrics (bounce rate, time-to-first-action) between pre-release and post-release cohorts. If retention drops, the release added cognitive load or interface friction.
---
Sources:
- Escaping the Build Trap, Melissa Perri -- Part IV, Chapter 16: "Setting Direction and Product Metrics"
```

### Product Demand Validation

#### [need_product] Do Users Really Need My Product? (Suffix: Data Fetching)
```text
Do users really need my product?
1. Run `shiplens query --metric daily_retention --range 30d --json` to fetch the 30-day daily retention decay sequence.
2. Inspect if the retention curve flattens between Day 14 and Day 30:
   - If Day 30 retention >= 15% with a near-zero slope, confirm positive PMF behavioral signals;
   - If the curve declines continuously toward zero and Day 30 retention < 5%, indicate weak value proposition.
3. Run `shiplens summary --range 30d --json` to calculate the DAU/MAU stickiness ratio against the 0.20~0.25 health threshold.
4. Output PMF evaluation report with specific positioning and workflow adjustment recommendations.

Please prioritize calling Shiplens CLI (Action: need_product) to execute the above requirements.
---
Analysis Foundation:
- Behavioral Retention Asymptote: Product-Market Fit (PMF) is proven when the cohort retention curve flattens into a horizontal asymptote between Day 14 and Day 30, rather than decaying continuously toward zero.
- Usage Stickiness: A DAU/MAU ratio exceeding category benchmarks (typically > 0.20-0.25 for SaaS and productivity tools) confirms that the product has become an essential recurring habit.
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 2: "Determining If Your Product Is Must-Have"
```

#### [loyal_users] Do I Have a Core Group of Loyal Users? What Are Their Behaviors? (Suffix: Data Fetching)
```text
Do I have a core group of loyal users? What are their behavioral patterns?
1. Run `shiplens query --metric daily_retention --range 30d --json` to confirm the retention tail stabilizes above the baseline.
2. Run `shiplens sql --query "SELECT user_id, COUNT(*) AS event_count, COUNT(DISTINCT toDate(timestamp)) AS active_days FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY user_id ORDER BY event_count DESC LIMIT 50" --json` to segment the top 5% power users.
3. Run `shiplens sql --query "SELECT properties.feature AS feature_name, COUNT(*) AS usage_count FROM events WHERE user_id IN (SELECT user_id FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY user_id ORDER BY count(*) DESC LIMIT 50) GROUP BY feature_name ORDER BY usage_count DESC LIMIT 10" --json` to identify their favorite feature combinations.
4. Extract early habits formed during their first week (Day 0~7) to optimize onboarding for new signups.

Please prioritize calling Shiplens CLI (Action: loyal_users) to execute the above requirements.
---
Analysis Foundation:
- Power User Behavioral Clustering: Identifying the top 5% most engaged users reveals the highest-value functional combinations and optimal user pathways.
- Cohort Tail Stability: When the 30-day retention curve stabilizes above a baseline threshold (e.g., >= 15%), a resilient core audience exists. Isolating their early-session habits (Day 0-7) provides the blueprint for optimizing new user onboarding.
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 2: "Determining If Your Product Is Must-Have"
- Fighting Churn with Data, Carl S. Gold -- Part I, Chapter 3: "Cohort Analysis"
```

#### [north_star_metric] Which Single Metric Should I Track Daily? (Suffix: Data Fetching)
```text
Which single metric should I focus on daily?
1. Read `.shiplens/contexts/<app_id>.md` to deduce the North Star Metric (e.g., core creations produced, key collaboration milestones) that represents core value delivery.
2. Run `shiplens summary --range 7d --json` to establish current operational baseline volumes.
3. Deconstruct the North Star Metric into 2-3 L1 driver metrics (e.g., active user count x actions per user).
4. Output North Star formula, daily alert thresholds, and operational review priorities.

Please prioritize calling Shiplens CLI (Action: north_star_metric) to execute the above requirements.
---
Analysis Foundation:
- Metric Hierarchy & Alignment: An effective analytics structure aligns daily operational tracking with strategic value delivery:
  - North Star Metric: The single outcome metric that best captures the core value delivered to users (e.g., messages sent, files synced).
  - L1 Driver Metrics: Immediate mathematical inputs that directly compound into the North Star (e.g., active teams x actions per user).
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 3: "Determining Your Growth Levers"
- Escaping the Build Trap, Melissa Perri -- Part IV, Chapter 16: "Setting Direction and Product Metrics"
```

### User Activation & Experience

#### [time_to_value] How Long Does It Take New Users to Reach Value (TTV)? (Suffix: Data Fetching)
```text
How long does it take new users from initial arrival to reaching core value (TTV)?
1. Read `.shiplens/contexts/<app_id>.md` to isolate core value milestone event names.
2. Run `shiplens paths --range 7d --json` to track new user journey paths from initial landing to first value completion.
3. Run `shiplens sql --query "SELECT quantile(0.50)(ttv_seconds) AS p50_ttv, quantile(0.90)(ttv_seconds) AS p90_ttv, avg(ttv_seconds) AS avg_ttv FROM (SELECT user_id, dateDiff('second', min(timestamp), minIf(timestamp, event_name = 'core_action')) AS ttv_seconds FROM events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY user_id HAVING minIf(timestamp, event_name = 'core_action') > min(timestamp))" --json` to calculate P50 and P90 Time-to-Value.
4. Benchmark against category standards, identify intermediate friction steps, and output streamlined onboarding recommendations.

Please prioritize calling Shiplens CLI (Action: time_to_value) to execute the above requirements.
---
Analysis Foundation:
- Time-to-Value (TTV) Distribution: TTV measures elapsed time from initial landing or signup to experiencing core product value. Shorter TTV directly drives higher initial activation and reduces early drop-off.
- Friction Elimination: Analyzing the cumulative distribution (P50/P90) of time-to-first-value identifies friction points (excessive setup, redundant form fields) that can be removed, delayed, or automated.
---
Sources:
- Product-Led Growth, Wes Bush -- Part II, Chapter 12: "Streamline the Onboarding Experience"
```

#### [onboarding_bottleneck] Where Do New Users Drop Off in the Onboarding Funnel? (Suffix: Data Fetching)
```text
Where do new users get stuck during onboarding?
1. Run `shiplens query --metric conversion_funnel --range 7d --json` to build the step conversion funnel from landing to registration and core feature usage.
2. Calculate step drop-off rates (Drop-off Rate = 1 - Next Step Users / Current Step Users) to pinpoint the highest-friction bottleneck.
3. Run `shiplens heatmap --template <bottleneck_page_id> --json` on the drop-off step to inspect click distribution and dead zones.
4. Output bottleneck diagnosis and concrete UX recommendations to eliminate user friction.

Please prioritize calling Shiplens CLI (Action: onboarding_bottleneck) to execute the above requirements.
---
Analysis Foundation:
- Bowling Alley Framework & Funnel Friction: Users require clear boundaries and minimal friction to reach their desired outcome:
  - Straight Line Path: The shortest, most direct route to value realization.
  - Product Bumpers: Contextual cues, empty state helpers, and progress trackers that prevent drop-offs at high-friction funnel steps.
---
Sources:
- Product-Led Growth, Wes Bush -- Part III, Chapter 13: "The Bowling Alley Framework"
```

#### [power_users] Which User Behaviors Signal Long-Term Retention (Aha Moment)? (Suffix: Data Fetching)
```text
Which early user actions correlate with long-term retention?
1. Run `shiplens sql --query "SELECT user_id, countIf(event_name = 'core_feature') AS d7_core_count, (max(timestamp) - min(timestamp) >= 2592000) AS is_retained_d30 FROM events WHERE timestamp >= now() - INTERVAL 60 DAY GROUP BY user_id" --json` to extract first-week actions and Day 30 retention states.
2. Calculate retention lift curves across action frequency buckets (e.g., 1 vs. 2 vs. 3 completions within Day 0-7).
3. Isolate the threshold that produces the steepest retention lift (Aha Moment milestone).
4. Recommend embedding this milestone prominently in the onboarding checklist and product cues.

Please prioritize calling Shiplens CLI (Action: power_users) to execute the above requirements.
---
Analysis Foundation:
- Aha Moment Threshold: An Aha Moment is the specific early action (or frequency threshold within Day 0-7) that exhibits the strongest statistical correlation with Day 30 retention.
- Cohort Cross-Analysis: Comparing action frequency distributions between retained and churned cohorts identifies the critical threshold that should become the primary target of the onboarding flow.
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 3: "Determining Your Growth Levers"
```

#### [user_acquisition_channels] Where Do New Users Come From and What Are Their Traits? (Suffix: Data Fetching)
```text
Where do my new users come from, and what are their characteristics?
1. Run `shiplens query --metric unique_visitors --group-by referrer --range 7d --json` to aggregate visitor volumes by referrer channel.
2. Run `shiplens sql --query "SELECT referrer, COUNT(DISTINCT user_id) AS total_users, countIf(day_diff = 1) / COUNT(DISTINCT user_id) AS d1_retention, countIf(day_diff = 7) / COUNT(DISTINCT user_id) AS d7_retention FROM (SELECT referrer, user_id, dateDiff('day', min_time, timestamp) AS day_diff FROM (SELECT user_id, referrer, min(timestamp) OVER (PARTITION BY user_id) AS min_time, timestamp FROM events WHERE timestamp >= now() - INTERVAL 30 DAY)) GROUP BY referrer HAVING total_users >= 10" --json` to compute Day 1/7 retention by referrer.
3. Compare engagement depth and core action penetration across acquisition sources.
4. Output channel quality rankings and high-ROI channel recommendations.

Please prioritize calling Shiplens CLI (Action: user_acquisition_channels) to execute the above requirements.
---
Analysis Foundation:
- Channel Intent & Quality Alignment: Acquisition volume does not equal user quality. Channel effectiveness must be evaluated through the lens of user intent, Day 1/7 retention, and feature adoption depth rather than raw signup volume.
- Value Gap Detection: High acquisition volume accompanied by immediate Day 1 drop-off indicates an expectation mismatch between external marketing promises and actual product delivery.
---
Sources:
- Product-Led Growth, Wes Bush -- Part I, Chapters 2-6: "The MOAT Framework"
```

#### [traffic_quality_check] Are Low-Quality Channels Driving Fake Traffic? How Do Channels Compare? (Suffix: Data Fetching)
```text
Are any channels sending fake traffic? How do user behaviors differ across acquisition sources?
1. Run `shiplens query --metric bounce_rate --group-by referrer --range 7d --json` to inspect bounce rates across traffic sources.
2. Run `shiplens sql --query "SELECT referrer, COUNT(DISTINCT user_id) AS users, avg(duration) AS avg_duration, countIf(click_count = 0) / COUNT(*) AS zero_click_ratio FROM (SELECT referrer, session_id, user_id, dateDiff('second', min(timestamp), max(timestamp)) AS duration, countIf(event_name = 'click') AS click_count FROM events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY referrer, session_id, user_id) GROUP BY referrer ORDER BY users DESC" --json` to extract zero-click ratios and average dwell time per referrer.
3. Flag suspicious channels where bounce rate > 85%, zero-click ratio > 90%, and average dwell time < 3 seconds as low-intent or bot traffic.
4. Output anomaly traffic report and ad spend filtering guidelines.

Please prioritize calling Shiplens CLI (Action: traffic_quality_check) to execute the above requirements.
---
Analysis Foundation:
- Behavioral Depth Vectors & Anomaly Detection: Genuine users exhibit continuous interactive behavior (scrolling, clicking, navigation). Bot traffic and low-intent referrals display zero behavioral depth, uniform dwell time, and high bounce rates.
- Channel Quality Filtering: Cross-referencing referrer sources with bounce rates and engagement depth protects acquisition budgets from fraudulent or misleading traffic.
---
Sources:
- Product-Led Growth, Wes Bush -- Part I, Chapters 2-6: "The MOAT Framework"
- Fighting Churn with Data, Carl S. Gold -- Part II, Chapter 7: "Customer Cohorts and Customer Churn"
```

### A/B Testing

#### [ab_test_comparison] A/B Test Experiment Results Comparison (Suffix: Data Fetching)
```text
How did the A/B test perform?
1. Run `shiplens sql --query "SELECT properties.variant AS variant, COUNT(DISTINCT user_id) AS total_users, countIf(event_name = 'core_conversion') AS conversions, countIf(event_name = 'core_conversion') / COUNT(DISTINCT user_id) AS cvr, avg(session_duration) AS avg_duration FROM events WHERE properties.experiment_id IS NOT NULL AND timestamp >= now() - INTERVAL 14 DAY GROUP BY variant" --json` to extract conversion rates, retention, and duration across variants.
2. Compute relative metric lift: Lift = (Treatment - Control) / Control.
3. Compute two-sample two-tailed Z-test statistic and p-value to confirm 95% confidence level (p < 0.05).
4. Perform trade-off analysis against secondary guardrails and provide a clear rollout or rollback recommendation.

Please prioritize calling Shiplens CLI (Action: ab_test_comparison) to execute the above requirements.
---
Analysis Foundation:
- Hypothesis Testing & Statistical Significance: In randomized controlled trials, observed metric differences must achieve statistical significance (typically p < 0.05 / 95% confidence level) to reject the null hypothesis and rule out random variance.
- Trade-off Analysis: Primary metric gains must be evaluated alongside secondary metrics to ensure gains in one area (e.g., CTR) do not degrade user experience elsewhere.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part I, Chapter 2: "Running and Analyzing Experiments"
```

#### [ab_test_trustworthiness] Are My A/B Test Results Trustworthy and Statistically Valid? (Suffix: Data Fetching)
```text
Are my A/B test results reliable and methodologically sound?
1. Run `shiplens sql --query "SELECT properties.variant AS variant, COUNT(DISTINCT user_id) AS observed_users FROM events WHERE properties.experiment_id IS NOT NULL AND timestamp >= now() - INTERVAL 14 DAY GROUP BY variant" --json` to extract allocated sample sizes.
2. Run Chi-Square goodness-of-fit test for Sample Ratio Mismatch (SRM): $\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$. If p < 0.001, emit an invalid experiment alert and halt analysis.
3. Verify test runtime >= 7 days to eliminate day-of-week seasonality, and confirm sample size achieves >= 80% statistical power for the Minimum Detectable Effect (MDE).
4. Calculate 95% confidence intervals and p-values for primary metrics.
5. Output experiment trust scorecard (SRM status, power adequacy, statistical significance).

Please prioritize calling Shiplens CLI (Action: ab_test_trustworthiness) to execute the above requirements.
---
Analysis Foundation:
- Sample Ratio Mismatch (SRM): An imbalance between observed and expected sample ratios (detected via Chi-Square test, p < 0.001) invalidates experiment results. SRM is typically caused by bot filters, redirection delays, or data pipeline drops.
- Statistical Power & Business Cycles: Valid experiments require adequate sample size to detect the Minimum Detectable Effect (MDE) with >= 80% power, while running across full business cycles (minimum 7 days) to account for day-of-week seasonality.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part V, Chapter 21: "Sample Ratio Mismatch and Other Trust-Related Guardrail Metrics"
```

#### [product_health_oec] Is There an Overall Score to Track if the Product Is Improving? (Suffix: Data Fetching)
```text
Is there a single composite score to track whether product iterations are improving overall health?
1. Run `shiplens summary --range 30d --json` and `shiplens query --range 30d --json` to retrieve 4-week activity, retention, and conversion metrics.
2. Formulate a 0-100 Overall Evaluation Criterion (OEC) model by weighting normalized key metrics (e.g., OEC = 0.4 * Retention + 0.3 * Conversion + 0.3 * Stickiness).
3. Run `shiplens query --metric error_rate --range 30d --grain week --json` to verify organizational guardrails (error rate, latency).
4. Output 4-week OEC health score trendline, score change breakdown, and guardrail health status.

Please prioritize calling Shiplens CLI (Action: product_health_oec) to execute the above requirements.
---
Analysis Foundation:
- Overall Evaluation Criterion (OEC): A composite, weighted metric that aligns short-term experiment measurements with long-term strategic objectives, preventing teams from over-optimizing isolated vanity metrics.
- Guardrail Metrics: Organizational health metrics (error rates, page load latency, churn spikes) that must remain uncompromised during localized optimization.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part II, Chapter 6: "Organizational Metrics" & Chapter 7: "The Overall Evaluation Criterion"
```

#### [aa_test_validation] How to Run an A/A Test to Validate the Experiment System? (Suffix: Data Fetching)
```text
How to run an A/A test to verify experiment platform integrity?
1. Explain the A/A testing rationale to the user and prompt for the validation mode:
   - Mode A (Retrospective Validation on Completed Experiment): Apply hash-based pseudo-random splitting to the control cohort:
     `shiplens sql --query "SELECT if(cityHash64(user_id) % 2 = 0, 'control_a', 'control_b') AS aa_group, COUNT(DISTINCT user_id) AS total_users, countIf(event_name = 'click') / COUNT(DISTINCT user_id) AS ctr, avg(session_duration) AS avg_duration FROM events WHERE properties.experiment_id = '<exp_id>' AND properties.variant = 'control' AND timestamp >= now() - INTERVAL 14 DAY GROUP BY aa_group" --json`
   - Mode B (Real-time Ongoing A/A Experiment): Query live A/A telemetry:
     `shiplens sql --query "SELECT properties.variant AS variant, COUNT(DISTINCT user_id) AS total_users, countIf(event_name = 'click') / COUNT(DISTINCT user_id) AS ctr, avg(session_duration) AS avg_duration FROM events WHERE properties.experiment_id = '<aa_exp_id>' AND timestamp >= now() - INTERVAL 7 DAY GROUP BY variant" --json`
2. Run two-sample significance tests (t-test or chi-square test). If metric divergence p-value < 0.05 (rejecting null hypothesis of equality), flag systematic bias in the randomization engine or tracking instrumentation.
3. If no divergence is detected (p >= 0.05 and no Sample Ratio Mismatch / SRM), certify experiment infrastructure as sound for A/B testing.

Please prioritize calling Shiplens CLI (Action: aa_test_validation) to execute the above requirements.
---
Analysis Foundation:
- A/A Testing & System Calibration: Exposing two groups to identical experiences (via live split or post-hoc control group sub-sampling) validates that the experimentation pipeline is unbiased. If an A/A test yields statistically significant differences (p < 0.05), the split engine, tracking instrumentation, or metric computation has fundamental flaws that must be resolved prior to running A/B tests.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part I, Chapter 3: "Twyman's Law and Experimentation Trustworthiness" & Part V, Chapter 19: "A/A Tests"
```

### User Retention & Churn

#### [inactive_user_prevention] Which Users Are Becoming Inactive and How to Catch Them Before Churn? (Suffix: Data Fetching)
```text
Which users are declining in activity, and how can we re-engage them before they churn?
1. Run `shiplens sql --query "SELECT user_id, recent_7d_events, prior_28d_weekly_avg, recent_7d_events / nullIf(prior_28d_weekly_avg, 0) AS activity_decay_ratio FROM (SELECT user_id, countIf(timestamp >= now() - INTERVAL 7 DAY) AS recent_7d_events, countIf(timestamp >= now() - INTERVAL 35 DAY AND timestamp < now() - INTERVAL 7 DAY) / 4.0 AS prior_28d_weekly_avg FROM events WHERE timestamp >= now() - INTERVAL 35 DAY GROUP BY user_id) WHERE prior_28d_weekly_avg >= 5 AND activity_decay_ratio < 0.5 ORDER BY activity_decay_ratio ASC LIMIT 50" --json` to identify users with > 50% usage decay.
2. Run `shiplens sql --query "SELECT properties.feature AS feature_name, count(*) AS dropped_count FROM events WHERE user_id IN (...) GROUP BY feature_name ORDER BY dropped_count DESC LIMIT 3" --json` to trace the top 3 features abandoned first.
3. Output at-risk customer list, feature drop-off root causes, and targeted win-back email/in-app nudges.

Please prioritize calling Shiplens CLI (Action: inactive_user_prevention) to execute the above requirements.
---
Analysis Foundation:
- Activity Decay Ratio: Churn is a gradual process rather than an abrupt event. Defining a decay ratio (Recent 7-Day Usage / Prior 28-Day Weekly Average) identifies accounts experiencing severe behavioral decline (< 0.5) before they completely stop logging in.
- Drop-off Sequence: Feature disengagement typically precedes account cancellation by 7-14 days. Identifying the first abandoned features reveals root causes and enables targeted re-engagement.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part II, Chapter 7: "Customer Cohorts and Customer Churn"
```

#### [churn_early_warning] What Leading Indicators Predict User Churn? (Suffix: Data Fetching)
```text
What metrics or behavioral signals serve as leading indicators of churn?
1. Run `shiplens sql --query "SELECT user_id, dateDiff('day', max(timestamp), now()) AS days_since_last_active, countIf(timestamp >= now() - INTERVAL 14 DAY) AS recent_activity, count(DISTINCT toDate(timestamp)) AS active_days FROM events WHERE timestamp >= now() - INTERVAL 60 DAY GROUP BY user_id" --json` to extract leading disengagement vectors.
2. Build a churn predictive scoring model to isolate the most sensitive leading indicators (e.g., sharp drops in core action frequency).
3. Output early-warning trigger thresholds and automated intervention playbooks.

Please prioritize calling Shiplens CLI (Action: churn_early_warning) to execute the above requirements.
---
Analysis Foundation:
- Leading Behavioral Predictors: Lagging churn events are preceded by leading telemetry signals: declining usage frequency, extended gaps between sessions, and abandonment of key workflow actions.
- Risk Tiering: Ranking users by behavioral risk scores allows teams to concentrate proactive intervention on the top 10-20% highest-risk accounts where outreach yields the highest return.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part III, Chapter 8: "Forecasting Churn" & Chapter 9: "Measuring and Improving Churn Prediction"
```

#### [high_paying_churn_risk] Are High-Paying Users Satisfied or at Risk of Canceling? (Suffix: Data Fetching)
```text
Are high-paying customers truly satisfied or paying for unused subscriptions and at risk of canceling?
1. Run `shiplens sql --query "SELECT r.user_id, r.amount AS mrr, COUNT(e.id) AS usage_count, r.amount / nullIf(COUNT(e.id), 0) AS unit_cost FROM revenue_events r LEFT JOIN events e ON r.user_id = e.user_id AND e.timestamp >= now() - INTERVAL 30 DAY WHERE r.timestamp >= now() - INTERVAL 30 DAY GROUP BY r.user_id, r.amount ORDER BY unit_cost DESC" --json` to extract MRR and 30-day usage counts per account.
2. Calculate recurring unit cost (Unit Cost = MRR / Usage Count) and rank accounts in descending order.
3. Isolate the top 20% highest unit cost tier (high MRR with < 5 monthly interactions) as prime churn risks.
4. Output at-risk account roster and custom onboarding/outreach intervention plans.

Please prioritize calling Shiplens CLI (Action: high_paying_churn_risk) to execute the above requirements.
---
Analysis Foundation:
- Recurring Unit Cost Risk: Evaluating gross revenue in isolation masks churn vulnerability. The ratio of recurring spend to actual usage volume (MRR / Usage Count) measures unit cost. High unit cost correlates with elevated cancellation risk, as customers eventually recognize poor value for money.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part II, Chapter 7: "Customer Cohorts and Customer Churn"
```

#### [golden_feature_mix] Which Feature Usage Mix Indicates Healthy Engagement? (Suffix: Data Fetching)
```text
With multiple features available, which feature usage distribution reflects healthy retention?
1. Run `shiplens pages --range 7d --json` to compute pageviews and dwell time share across all features (Percentage of Total).
2. Run `shiplens sql --query "SELECT is_retained_d30, properties.feature AS feature_name, count(*) / sum(count(*)) OVER (PARTITION BY is_retained_d30) AS feature_time_share FROM events GROUP BY is_retained_d30, feature_name" --json` to compare time allocation between retained and churned cohorts.
3. Identify the "Golden Feature Mix" that shows the strongest statistical association with sustained retention.
4. Output feature health matrix and onboarding navigation recommendations.

Please prioritize calling Shiplens CLI (Action: golden_feature_mix) to execute the above requirements.
---
Analysis Foundation:
- Percentage of Total Activity: When overall usage is dominated by power users, raw activity counts exhibit heavy collinearity. Tracking percentage-of-total metrics controls for volume and reveals the structural feature mix associated with high long-term retention.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part II, Chapter 7: "Customer Cohorts and Customer Churn"
```

#### [churn_triage_winback] Which Churn-Risk Users Should Be Prioritized for Re-Engagement? (Suffix: Data Fetching)
```text
With many users drifting away, which segment should we prioritize for re-engagement?
1. Run `shiplens query --metric daily_retention --range 60d --json` to identify the activity decay threshold where churn spikes exponentially.
2. Run `shiplens sql --query "SELECT user_id, dateDiff('day', max(timestamp), now()) AS inactive_days, countIf(timestamp >= now() - INTERVAL 30 DAY) AS past_activity FROM events GROUP BY user_id HAVING inactive_days BETWEEN 7 AND 21 AND past_activity >= 10" --json` to filter out dormant (> 60 days) users and target moderately cooling accounts (7-21 days).
3. Output high-ROI triage win-back list and targeted re-engagement messages.

Please prioritize calling Shiplens CLI (Action: churn_triage_winback) to execute the above requirements.
---
Analysis Foundation:
- Triage Intervention Strategy: Outreach resources should be concentrated on moderately disengaged users near the churn risk tipping point. Intervening with completely inactive or long-dormant users yields negligible ROI, whereas re-engaging users at the threshold of cooling off delivers the highest save rate.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part II, Chapter 5: "Understanding Churn and Customer Behavior"
```

### Monetization & Revenue

#### [pre_subscription_funnel] Pre-Subscription User Behavior Analysis (Suffix: Data Fetching)
```text
What behavioral patterns appear before users subscribe?
1. Run `shiplens heatmap --template <pricing_page_id> --json` to inspect pricing page clicks and tier selections.
2. Run `shiplens pages --range 14d --json` to measure average dwell time and scroll depth on the pricing table.
3. Run `shiplens query --metric conversion_funnel --range 14d --json` to analyze checkout step drop-off rates from pricing click to payment confirmation.
4. Identify checkout UX friction and deliver pricing copy/layout optimization recommendations.

Please prioritize calling Shiplens CLI (Action: pre_subscription_funnel) to execute the above requirements.
---
Analysis Foundation:
- Value Gap & Checkout Friction: Drop-offs at subscription touchpoints stem from either an expectation gap (unclear plan value) or checkout friction (excessive input fields, unclear billing tiers).
- Intent Telemetry: High pricing-page dwell times combined with zero checkouts signal confusion over packaging tiers or perceived value misalignment.
---
Sources:
- Product-Led Growth, Wes Bush -- Part I, Chapter 5: "The Value Gap"
```

#### [subscriber_insights] Subscriber Insights & Upsell Triggers (Suffix: Data Fetching)
```text
What are the defining characteristics of paying subscribers?
1. Run `shiplens sql --query "SELECT properties.feature AS trigger_feature, COUNT(*) AS hit_count FROM events WHERE user_id IN (SELECT user_id FROM revenue_events WHERE timestamp >= now() - INTERVAL 30 DAY) AND timestamp >= now() - INTERVAL 37 DAY GROUP BY trigger_feature ORDER BY hit_count DESC LIMIT 5" --json` to extract actions taken in the 7 days before upgrading.
2. Run `shiplens query --metric daily_retention --group-by plan_type --range 60d --json` to compare retention curves between monthly and annual plans.
3. Isolate core conversion triggers to guide premium feature packaging.

Please prioritize calling Shiplens CLI (Action: subscriber_insights) to execute the above requirements.
---
Analysis Foundation:
- Pre-Conversion Trigger Patterns: Free users convert to paid subscriptions upon encountering specific threshold triggers (e.g., approaching usage caps, attempting to unlock premium modules).
- Plan Cohort Retention: Comparing long-term retention across billing frequencies (monthly vs. annual) and subscription tiers identifies the highest-LTV customer archetypes.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part III, Chapter 8: "Forecasting Churn"
```

#### [customer_ltv] What Is the Customer Lifetime Value (LTV)? (Suffix: Data Fetching, Dashboard Creation)
```text
How much revenue does an average user generate over their entire lifecycle?
1. Run `shiplens query --metric daily_retention --range 60d --grain month --json` to estimate the empirical churn rate.
2. Run `shiplens sql --query "SELECT avg(amount) AS arpu, count(DISTINCT user_id) AS total_paying_users FROM revenue_events WHERE timestamp >= now() - INTERVAL 30 DAY" --json` to extract monthly ARPU.
3. Compute LTV using the standard formula: $$\text{LTV} = \frac{\text{ARPU} \times \text{Gross Margin} \times \text{Retention Rate}}{\text{Monthly Churn Rate}} - \text{CAC}$$.
4. Run `shiplens dashboards create --title "Customer Lifetime Value (LTV) Dashboard" --prompt "Show cohort LTV curves, monthly ARPU, and cumulative margin contributions" --json`.
5. Output LTV calculation and recommended maximum acquisition cost ceilings.

Please prioritize calling Shiplens CLI (Action: customer_ltv) to execute the above requirements.
---
Analysis Foundation:
- LTV Formulation & Retention Decay: Customer Lifetime Value represents the net present value of recurring gross profit generated over a user's relationship with the product:
  $$\text{LTV} = \frac{\text{ARPU} \times \text{Gross Margin} \times \text{Retention Rate}}{\text{Churn Rate}} - \text{CAC}$$
- Cohort Integration: Integrating the area under empirical cohort retention curves provides an accurate model of cumulative long-term cash flow.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part III, Chapter 8, Section 8.6: "Customer Lifetime Value Formula"
```

#### [cac_payback_period] Is My CAC Reasonable and What Is the Payback Period? (Suffix: Data Fetching)
```text
Is customer acquisition cost (CAC) sustainable, and what is the payback period?
1. Ingest marketing and ad spend inputs divided by new acquired signups to calculate average CAC.
2. Evaluate the LTV/CAC ratio against the healthy threshold (>= 3.0).
3. Compute CAC Payback Period: Payback Period = CAC / (Monthly User Gross Profit), verifying it falls under 12 months.
4. Output unit economics health audit and budget allocation recommendations.

Please prioritize calling Shiplens CLI (Action: cac_payback_period) to execute the above requirements.
---
Analysis Foundation:
- Unit Economics Benchmarks:
  - LTV/CAC Ratio: >= 3.0 indicates sustainable unit economics; < 1.0 signals unprofitable growth where paid acquisition must be halted.
  - CAC Payback Period: CAC / (Monthly Revenue per User x Gross Margin). A payback window under 12 months ensures working capital safety and reinvestment efficiency.
---
Sources:
- Product-Led Growth, Wes Bush -- Part I, Chapter 1: "Why Product-Led Growth?"
- Fighting Churn with Data, Carl S. Gold -- Part III, Chapter 8: "Forecasting Churn"
```

#### [freemium_vs_trial] Should I Choose Freemium or Free Trial? (Suffix: Data Fetching)
```text
Should I offer a permanent Freemium tier or a time-limited Free Trial?
1. Run `shiplens paths --range 14d --json` to analyze new user Time-to-Value (TTV).
2. Run `shiplens sql --query "SELECT countIf(dateDiff('day', signup_time, pay_time) <= 14) / COUNT(*) AS trial_cvr, avg(dateDiff('day', signup_time, pay_time)) AS avg_days_to_pay FROM (SELECT user_id, min(timestamp) AS signup_time, minIf(timestamp, event_name = 'pay') AS pay_time FROM events GROUP BY user_id HAVING pay_time IS NOT NULL)" --json` to measure conversion cycle length.
3. Apply the MOAT framework: recommend Free Trial if TTV < 5 minutes with immediate standalone value; recommend Freemium if network effects or extended evaluation cycles are required.
4. Output GTM model selection assessment.

Please prioritize calling Shiplens CLI (Action: freemium_vs_trial) to execute the above requirements.
---
Analysis Foundation:
- MOAT Strategic Decision Framework: The choice between Freemium and Free Trial depends on Time-to-Value (TTV), market ocean conditions, and audience motion:
  - Free Trial: Best suited for products with short TTV (< 5 minutes), clear standalone value, and competitive urgency.
  - Freemium: Best suited for bottom-up adoption models requiring network effects, longer evaluation cycles, or high organic top-of-funnel expansion.
---
Sources:
- Product-Led Growth, Wes Bush -- Part I, Chapters 2-6: "The MOAT Framework"
```

#### [pql_conversion_lead] When Does a Free User Become a Product Qualified Lead (PQL)? (Suffix: Data Fetching)
```text
At what engagement level does a free user qualify for paid marketing or sales outreach?
1. Establish outreach budget limits based on LTV (ensuring sales cost <= LTV / 3).
2. Run `shiplens sql --query "SELECT user_id, count(*) AS total_actions, countIf(event_name = 'export' OR event_name = 'invite') AS advanced_actions FROM events WHERE user_id NOT IN (SELECT user_id FROM revenue_events) AND timestamp >= now() - INTERVAL 14 DAY GROUP BY user_id HAVING advanced_actions >= 3 ORDER BY total_actions DESC LIMIT 30" --json` to detect high-intent PQL signals.
3. Output prioritized lead roster and contextual in-app upgrade triggers.

Please prioritize calling Shiplens CLI (Action: pql_conversion_lead) to execute the above requirements.
---
Analysis Foundation:
- Economic Outreach Boundary: Direct sales or personalized marketing outreach is only economically viable when CAC remains capped at CAC <= LTV / 3.
- Product Qualified Leads (PQL): Identifying high-intent behavioral thresholds (approaching capacity limits, multi-seat invitations) ensures sales effort is directed only at users who have already experienced core product value.
---
Sources:
- Product-Led Growth, Wes Bush -- Part III: "Product-Led Go-to-Market Strategy"
```

### Virality & Team Efficiency

#### [viral_growth_loops] Does My Product Have Viral Growth Loops? (Suffix: Data Fetching)
```text
Does my product have viral self-propagation loops? Do users bring in new users?
1. Run `shiplens sql --query "SELECT countIf(event_name = 'invite_sent') / COUNT(DISTINCT user_id) AS invites_per_user, countIf(event_name = 'invite_accepted') / nullIf(countIf(event_name = 'invite_sent'), 0) AS invite_cvr FROM events WHERE timestamp >= now() - INTERVAL 30 DAY" --json` to compute invites per user (i) and conversion rate (c).
2. Calculate the viral coefficient K-factor: K = i x c; and estimate the average viral cycle time.
3. Run `shiplens pages --range 14d --json` to locate moments where users complete creations or export results.
4. Output virality evaluation report and strategic share-prompt placement recommendations.

Please prioritize calling Shiplens CLI (Action: viral_growth_loops) to execute the above requirements.
---
Analysis Foundation:
- Viral Loop Dynamics: Viral expansion is governed by the K-factor and Viral Cycle Time:
  - Viral Coefficient (K): K = i x c (invitations sent per user x conversion rate per invite). K > 1 creates exponential compounding growth; K > 0.2 significantly reduces blended CAC.
  - Viral Cycle Time: Minimizing the time between receiving an invite and sending the next invite accelerates compound expansion.
  - Trigger Placement: Sharing prompts should be embedded at the peak moments of value realization (e.g., completing an artifact or achieving a milestone).
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part II, Chapter 8: "Referral: Tapping the Viral Loop"
```

#### [outcome_vs_output] Are We Truly Improving the Product or Shipping Outputs? (Suffix: Data Fetching)
```text
Are we genuinely improving product outcomes or merely shipping outputs?
1. Run `shiplens query --metric daily_retention --range 60d --grain week --json` and `shiplens summary --range 60d --json` to track target outcomes (retention, key conversion, active stickiness) across multiple historical releases.
2. Measure the proportion of releases that generated statistically positive outcome shifts to calculate the Iteration Win Rate (Win Rate = Successful Releases / Total Releases).
3. If Win Rate < 50%, trigger a Product Kata strategic pivot alert.
4. Output iteration scorecard and roadmap realignment guidance.

Please prioritize calling Shiplens CLI (Action: outcome_vs_output) to execute the above requirements.
---
Analysis Foundation:
- Product Kata & Outcome Accountability: Development velocity (story points completed, features released) represents output rather than outcome. Healthy product management tracks the "Iteration Win Rate" -- the percentage of releases that positively move target user outcomes (retention, conversion, core task completion).
---
Sources:
- Escaping the Build Trap, Melissa Perri -- Part IV, Chapter 15: "The Product Kata" & Chapter 16: "Setting Direction and Product Metrics"
```

#### [build_trap_diagnosis] Are We Trapped in Building Features Nobody Wants? (Suffix: Data Fetching)
```text
Are we building unwanted features? How do we avoid wasted effort?
1. Run `shiplens pages --range 30d --json` to audit pageviews, UVs, and active adoption rates across all shipped features.
2. Run `shiplens sql --query "SELECT properties.feature AS feature_name, COUNT(DISTINCT user_id) AS active_users, COUNT(DISTINCT user_id) / (SELECT COUNT(DISTINCT user_id) FROM events WHERE timestamp >= now() - INTERVAL 30 DAY) AS adoption_rate FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY feature_name ORDER BY adoption_rate ASC" --json` to isolate zombie features with < 5% adoption.
3. Assess whether low-usage features contribute cognitive load or page bloat.
4. Output feature deprecation and UI simplification recommendations.

Please prioritize calling Shiplens CLI (Action: build_trap_diagnosis) to execute the above requirements.
---
Analysis Foundation:
- Build Trap Diagnosis: The Build Trap occurs when organizations equate feature volume with business value. Deploying features without validating actual user adoption or outcome lift leads to bloated products, cognitive overload, and rising churn.
---
Sources:
- Escaping the Build Trap, Melissa Perri -- Part I: "The Build Trap" & Part IV, Chapter 15: "The Product Kata"
```

#### [ice_scoring_prioritize] How to Prioritize Growth and Feature Ideas with ICE Scoring? (Suffix: Data Fetching)
```text
How should we prioritize a large backlog of feature ideas?
1. Compile candidate growth experiments and feature backlog items.
2. Use `shiplens query` and `shiplens pages` bottleneck data to quantify potential value (Impact, 1-10); assess historical test success to estimate Confidence (1-10); collect engineering effort estimates for Ease (1-10).
3. Compute the composite ICE Score: $$\text{ICE} = \frac{\text{Impact} + \text{Confidence} + \text{Ease}}{3}$$.
4. Sort ideas in descending order by ICE score and output high-leverage sprint priorities.

Please prioritize calling Shiplens CLI (Action: ice_scoring_prioritize) to execute the above requirements.
---
Analysis Foundation:
- ICE Prioritization Framework: In agile iteration, generating ideas is cheap while implementation is expensive. The ICE scoring model provides a disciplined quantitative ranking:
  $$\text{ICE Score} = \frac{\text{Impact} + \text{Confidence} + \text{Ease}}{3}$$
  where Impact is estimated from bottleneck data, Confidence from historical validation, and Ease from engineering effort.
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 4: "High-Tempo Testing"
```

### Dashboard Creation

#### [create_retention_matrix] Create 30-Day New User Retention Matrix Dashboard (Suffix: Data Fetching, Dashboard Creation)
```text
Create a 30-day new user retention matrix dashboard in Shiplens:
Please prioritize calling Shiplens CLI (Action: create_retention_matrix) to execute the above requirements.
2. Parse the JSON response to extract `dashboard_id` and live URL `dashboard_url`.
3. Return the generated dashboard link and interpretation guide to the user.
---
Analysis Foundation:
- Cohort Matrix Telemetry: Organizing users into daily registration cohorts and tracking discrete 30-day retention decay reveals whether retention curves are systematically flattening over time. It isolates acquisition quality anomalies on specific days from macro product trends.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part I, Chapter 3: "Cohort Analysis" & Part II, Chapter 7: "Customer Cohorts and Customer Churn"
```

#### [create_funnel_dashboard] Create Sequential Step Conversion Funnel Dashboard (Suffix: Data Fetching, Dashboard Creation)
```text
Inspect core workflows in code and create a step conversion funnel dashboard in Shiplens:
1. Scan frontend code and routes to identify the core sequential workflow (e.g., Signup -> Onboarding -> Core Action -> Publish).
Please prioritize calling Shiplens CLI (Action: create_funnel_dashboard) to execute the above requirements.
3. Extract and return the live `dashboard_url` to the user.
---
Analysis Foundation:
- Multi-Step Funnel Telemetry: Sequential workflows (onboarding, setup, publishing) require step-by-step drop-off measurement. Pinpointing the steepest step-level drop identifies the primary cognitive or operational friction point in the user journey.
---
Sources:
- Product-Led Growth, Wes Bush -- Part III, Chapter 13: "The Bowling Alley Framework"
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part I, Chapter 2: "Running and Analyzing Experiments"
```

### Advanced Configuration & Tracking

#### [config_ab_telemetry] Configure A/B Test Event Tracking (Suffix: Data Fetching)
```text
Configure A/B test behavioral telemetry:
1. Prompt user to locate component rendering and split logic in frontend code.
2. Inject Shiplens SDK tracking attributes: `Shiplens.track('experiment_exposure', { experiment_id: '<exp_id>', variant: 'control' | 'treatment' })`.
3. Establish an A/A testing validation stage (e.g. control-arm A/A sub-tagging or dry run), and run `shiplens doctor --json` to verify telemetry ingestion health and split symmetry.
4. Ensure telemetry from both variants is reported independently for subsequent retention and conversion analysis.

Please prioritize calling Shiplens CLI (Action: config_ab_telemetry) to execute the above requirements.
---
Analysis Foundation:
- Variant Telemetry Tagging & Isolation: Reliable online experimentation requires event-level isolation. Emitting persistent experiment_id and variant_id tags prevents crossover contamination across multi-page user sessions.
- Pre-Experiment A/A Validation: Incorporating an A/A test phase before launching A/B variants verifies telemetry symmetry and split integrity, preventing invalid experiment outcomes.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part I, Chapter 2: "Running and Analyzing Experiments" & Part V, Chapter 19: "A/A Tests"
```

#### [track_aha_moment] Track and Measure User Aha Moment (Suffix: Data Fetching, Dashboard Creation)
```text
Instrument and analyze user Aha Moment milestones:
1. Inject SDK telemetry at the value completion trigger: `Shiplens.track('aha_moment_achieved', { milestone_type: '<type>', time_to_reach: <seconds> })`.
2. Run CLI command: `npx.cmd --yes @shiplens/cli dashboards create --title "Aha Moment Retention Comparison Dashboard" --prompt "Show 30-day retention comparison curves between users who achieved the Aha Moment vs those who did not" --json`.
3. Return the dashboard URL and verify telemetry ingestion.

Please prioritize calling Shiplens CLI (Action: track_aha_moment) to execute the above requirements.
---
Analysis Foundation:
- Milestone Telemetry & Dual-Cohort Tracking: Tracking Aha Moments requires capturing both time-to-milestone and action frequency. Dashboards must visualize 30-day retention curves comparing users who achieved the Aha Moment versus those who did not.
---
Sources:
- Hacking Growth, Sean Ellis & Morgan Brown -- Part I, Chapter 3: "Determining Your Growth Levers"
```

#### [track_subscription_revenue] Track Subscription Revenue & Build Daily Subscription Dashboard (Suffix: Data Fetching, Dashboard Creation)
```text
Track subscription revenue and connect usage with revenue events:
1. Inject SDK revenue event telemetry at checkout completion: `Shiplens.track('revenue_event', { amount: <amount>, currency: '<USD|CNY>', plan: '<plan_id>', user_id: '<user_id>' })`.
2. Run CLI command: `npx.cmd --yes @shiplens/cli dashboards create --title "Daily Subscriptions & Revenue Dashboard" --prompt "Show daily subscriber counts, MRR/ARR growth, and subscriber retention trends" --json`.
3. Return the live `dashboard_url` to the user.

Please prioritize calling Shiplens CLI (Action: track_subscription_revenue) to execute the above requirements.
---
Analysis Foundation:
- Behavior & Revenue Telemetry Integration: Binding event-level telemetry (amount, currency, user_id) to behavioral user paths enables precise calculation of Customer Lifetime Value (LTV) and sets empirical ceilings for Customer Acquisition Cost (CAC).
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part III, Chapter 8: "Forecasting Churn"
```

### Initial Setup

#### [setup_init] Shiplens CLI One-Click Setup & Analytics Initialization (Suffix: None)
```text
Set up Shiplens analytics: install SDK, create the project, and retrieve the live dashboard URL.
1. Run CLI initialization command:
   - Windows: npx.cmd --yes @shiplens/cli init --json
   - macOS/Linux: npx --yes @shiplens/cli init --json
2. Present the standard project & dashboard summary (including: Project Name, App ID, Code Injection file, User Account Status, Live Dashboard / Activation URL);
3. Immediately prompt the user for their email address (informing them that you will register on their behalf and Shiplens will send an activation email for 50,000 monthly free events and project binding);
4. Upon receiving the user's email, run: npx.cmd --yes @shiplens/cli auth bind --email <email> --json.
```

#### [setup_bind_project] Use Shiplens CLI to Install Analytics SDK & Link to Existing Account (Suffix: None)
```text
Use Shiplens CLI to install the analytics SDK in this new project and link it to the user's existing Shiplens account:

1. Run the project setup & initialization command:
   - Windows: npx.cmd --yes @shiplens/cli init --json
   - macOS/Linux: npx --yes @shiplens/cli init --json
   (Automatically detects framework, installs SDK dependency, injects code entry, and creates cloud project)

2. Inspect returned `user_account_status` and credential states:
   - [Branch A: Logged in & linked] (`logged_in_linked`):
     No extra step needed; present the project summary card containing App ID, Project Name, Injected file, and Live Dashboard URL (`dashboard_url`).
   - [Branch B: No local credentials detected] (`not_logged_in_unlinked` or `activation_required=true`):
     Prompt the user for their registered Shiplens account email, and upon reply run:
     `npx.cmd --yes @shiplens/cli auth bind --email <email> --json`
     Instruct the user to click the Magic Link in the email to authorize and complete project binding.
   - [Branch C: Account quota / project limit reached] (Error `QUOTA_EXCEEDED` / `PLAN_LIMIT` / unable to link):
     Clearly notify the user that their current free/existing tier project limit or monthly event quota is full;
     Provide upgrade instructions: recommend upgrading to Pro / Team tier (URL: https://shiplens.dev/pricing or console settings) for expanded project limits and advanced analytics;
     Note that once upgraded, re-running the bind command will activate immediately without modifying code.

3. Output the final project summary and dashboard link, confirming the project is ready for analytics queries.

Please prioritize calling Shiplens CLI (Action: setup_bind_project) to execute the above requirements.
```

#### [remove_sdk] Delete Shiplens Project Analytics Data & SDK (No Longer Needed) (Suffix: None)
```text
Delete Shiplens project analytics data and SDK integration (analytics no longer needed):
1. Read `.shiplens.json` in the project root to get project name, app_id, and instrumented file paths.
2. Clearly display the project name and app_id to be deleted, warn the user that historical events and hosted data will be permanently purged, and pause for explicit user confirmation ("Confirm deleting this project").
3. Upon confirmation, remove SDK imports/instrumentation code from local frontend files, and delete `./.shiplens.json` and `.shiplens/contexts/<app_id>.md`.
4. Run CLI command to destroy cloud project: npx.cmd --yes @shiplens/cli projects delete --app-id <app_id> --force --json.

Please prioritize calling Shiplens CLI (Action: remove_sdk) to execute the above requirements.
```

#### [uninstall_cli] Delete Shiplens CLI and Restore Project (Suffix: None)
```text
Please prioritize calling Shiplens CLI (Action: uninstall_cli) to execute the above requirements.
 - Windows: npm.cmd uninstall -g @shiplens/cli
 - macOS/Linux: npm uninstall -g @shiplens/cli
```

#### [generate_context] Use Shiplens CLI to Generate Context Descriptions for All Pages and Buttons (Suffix: None)
```text
Use Shiplens CLI to map pages, features, and button layouts into `.shiplens/contexts/<app_id>.md` (deep business context) and `.shiplens/contexts/<app_id>.json` (deterministic UI dictionary) so AI analytics can understand the business context and exact control IDs behind each metric:
1. Check `./.shiplens.json` for current app_id and project name.
2. Run AST static code scan across frontend code and routes to extract page purposes, feature copy, interactive buttons, test IDs, selectors, and exact source code locations.
3. Write structured details into `.shiplens/contexts/<app_id>.md` and `.shiplens/contexts/<app_id>.json` pair, binding app_id and project name.
Please prioritize calling Shiplens CLI (Action: generate_context) to execute the above requirements.
```

### Troubleshooting & Diagnostics

#### [doctor_diagnose] Test Shiplens Telemetry Pipeline and Environment (Suffix: None)
```text
Diagnose Shiplens telemetry pipeline and environment health:
Please prioritize calling Shiplens CLI (Action: doctor_diagnose) to execute the above requirements.
2. Verify all 5 health checks: `local_config`, `sdk_installed`, `code_instrumented`, `network_connectivity`, and `auth_valid`.
3. If failures occur, output exact remediation instructions based on returned error codes.
---
Analysis Foundation:
- Data Pipeline Sanity Verification: Twyman's Law states that any metric or figure that looks unusual or overly perfect is usually the result of a data pipeline error or instrumentation failure. Immediate end-to-end diagnostic checks eliminate silent ingestion drops, credential errors, and network blocks.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part I, Chapter 3: "Twyman's Law and Experimentation Trustworthiness"
```

#### [debug_mode_verify] Enable Local Debug Mode and Verify Event Reporting (Suffix: None)
```text
Enable local debug mode and verify event ingestion:
1. Enable debug flag in local SDK initialization: `Shiplens.init({ appId: '<app_id>', debug: true })`.
2. Localhost events are automatically tagged as staging; open browser DevTools (F12) to inspect real-time console logs and HTTP 200 responses.
3. Run `shiplens summary --env staging --range 24h --json` to verify staging data reception.

Please prioritize calling Shiplens CLI (Action: debug_mode_verify) to execute the above requirements.
---
Analysis Foundation:
- Environment Isolation & Telemetry Purity: Isolating development/staging telemetry from production environments is essential to prevent synthetic test events from contaminating conversion funnels and retention baselines.
---
Sources:
- Fighting Churn with Data, Carl S. Gold -- Part I, Chapter 2: "Measuring Churn"
```

#### [production_smoke_test] Test Event Reporting in Production Build & Release Environments (Suffix: None)
```text
Verify event reporting in production build and release environments:
1. Run production build (e.g., `npm.cmd run build`) to ensure bundlers do not strip SDK code.
2. Confirm Content Security Policy (CSP) `connect-src` allows Shiplens ingestion endpoints.
3. Launch preview server, trigger test sessions, and run `shiplens summary --range 24h --json` to confirm production event ingestion.

Please prioritize calling Shiplens CLI (Action: production_smoke_test) to execute the above requirements.
---
Analysis Foundation:
- Production Ingestion Guardrails: Production asset bundling, Content Security Policies (CSP), and client-side ad blockers can silently intercept telemetry requests. Full-stack smoke testing in staging/production builds ensures telemetry resilience before general release.
---
Sources:
- Trustworthy Online Controlled Experiments, Ron Kohavi, Diane Tang, Ya Xu -- Part V, Chapter 21: "Sample Ratio Mismatch and Other Trust-Related Guardrail Metrics"
```

---
