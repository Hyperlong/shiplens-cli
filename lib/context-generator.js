const fs = require('fs');
const path = require('path');
const { detectProjectPages } = require('./scanner');
const { extractPageSkeleton, extractProjectFactsheet } = require('./extractor');

/**
 * Infer page purpose from headings, descriptions, factsheet and route name
 */
function inferPagePurpose(page, headings, descriptions, faqs, factsheet = {}) {
  if (descriptions && descriptions.length > 0) {
    return descriptions[0];
  }
  if (headings && headings.length > 0) {
    return headings.join(' / ');
  }
  if (factsheet && factsheet.description) {
    return factsheet.description;
  }
  if (page.path === '/') {
    return 'Primary landing / core product overview page';
  }
  const cleanName = page.name.replace(/[^a-zA-Z0-9_\- ]/g, '');
  return `Core ${cleanName} feature page`;
}

/**
 * Infer intent and next step for interactive controls across all 26 genres
 */
function inferButtonIntent(btn, page) {
  if (btn.action_hint) {
    let hint = btn.action_hint;
    if (btn.text && btn.text.includes('[State: Active/True]')) {
      hint = `${hint} (Active State)`;
    } else if (btn.text && btn.text.includes('[State: Inactive/False]')) {
      hint = `${hint} (Inactive State)`;
    }
    return hint;
  }
  const t = (btn.text || '').toLowerCase();
  const tag = (btn.tag || '').toLowerCase();
  const id = (btn.id || '').toLowerCase();

  if (btn.is_schema_action || tag === 'schema-action') {
    return `Execute schema action: ${btn.text.replace(/\[State:[^\]]+\]/g, '').trim()}`;
  }

  // 1. 通用工具与转换
  if (t.includes('copy') || t.includes('复制') || id.includes('copy')) return 'Copy generated output or token to clipboard';
  if (t.includes('generate') || t.includes('生成') || id.includes('generate')) return 'Generate new token, hash or data payload';
  if (t.includes('download') || t.includes('下载') || t.includes('export') || t.includes('导出')) return 'Export and download data file or assets';
  if (t.includes('upload') || t.includes('上传') || t.includes('import') || t.includes('导入')) return 'Import external file or JSON schema';
  if (t.includes('convert') || t.includes('转换') || t.includes('format') || t.includes('美化')) return 'Transform and format input string';
  if (t.includes('clear') || t.includes('清除') || t.includes('reset') || t.includes('重置')) return 'Clear active inputs or reset canvas state';

  // 2. API 调试与网络请求
  if (t.includes('send') || t.includes('发送') || id.includes('send')) return 'Send HTTP / GraphQL / WebSocket API request';
  if (t.includes('save') || t.includes('保存') || id.includes('save')) return 'Save request to collection or persistent workspace';
  if (t.includes('env') || t.includes('环境') || id.includes('env')) return 'Toggle active environment variable set';

  // 3. 电商与转化
  if (t.includes('cart') || t.includes('购物车') || t.includes('add to cart') || id.includes('cart')) return 'Add item to shopping cart';
  if (t.includes('checkout') || t.includes('结账') || t.includes('buy') || t.includes('购买')) return 'Initiate checkout and payment pipeline';
  if (t.includes('start') || t.includes('free') || t.includes('try') || t.includes('get started') || t.includes('免费') || t.includes('试用')) return 'Primary conversion CTA / onboarding initiation';
  if (t.includes('sign up') || t.includes('register') || t.includes('注册')) return 'User account registration';
  if (t.includes('login') || t.includes('sign in') || t.includes('登录')) return 'User authentication login';
  if (t.includes('upgrade') || t.includes('pro') || t.includes('pricing') || t.includes('订阅')) return 'Monetization checkout / subscription upgrade';

  // 4. 画布、编辑器与多媒体
  if (t.includes('undo') || t.includes('撤销')) return 'Undo last canvas mutation';
  if (t.includes('redo') || t.includes('重做')) return 'Redo previous mutation';
  if (t.includes('zoom') || t.includes('缩放')) return 'Adjust zoom scale or viewport';
  if (t.includes('play') || t.includes('播放')) return 'Start media playback';
  if (t.includes('pause') || t.includes('暂停')) return 'Pause media playback';
  if (t.includes('filter') || t.includes('滤镜') || t.includes('crop') || t.includes('裁剪')) return 'Apply visual filter or crop bounding box';

  // 5. 游戏与博弈
  if (t.includes('deal') || t.includes('发牌')) return 'Deal cards and start hand';
  if (t.includes('hit') || t.includes('要牌')) return 'Draw card from deck';
  if (t.includes('stand') || t.includes('停牌')) return 'End turn and hold hand';
  if (t.includes('double') || t.includes('加倍')) return 'Double bet and take final card';
  if (t.includes('split') || t.includes('分牌')) return 'Split pairs into two hands';
  if (t.includes('restart') || t.includes('new game') || t.includes('新游戏')) return 'Start fresh game round';

  // 6. 导航与出行
  if (t.includes('route') || t.includes('路线') || t.includes('navigate') || t.includes('导航')) return 'Calculate routing directions and waypoint path';
  if (t.includes('search') || t.includes('query') || t.includes('搜索') || t.includes('查询')) return 'Execute search query';
  if (t.includes('delete') || t.includes('remove') || t.includes('删除')) return 'Delete or purge data item';

  return `Trigger ${tag || 'control'} interaction on ${page.path}`;
}

/**
 * Infer intent and next step for interactive controls across all 26 genres (Chinese version)
 */
function inferButtonIntentZh(btn, page) {
  if (btn.action_hint) {
    let hint = btn.action_hint
      .replace(/^calls\s+/i, '调用 ')
      .replace(/^navigate to\s+/i, '跳转至 ')
      .replace(/^submit form/i, '提交表单')
      .replace(/^trigger\s+/i, '触发 ')
      .replace(/^execute\s+/i, '执行 ')
      .replace(/^open and configure\s+/i, '打开并配置 ');

    if (btn.text && btn.text.includes('[State: Active/True]')) {
      hint = `${hint} (激活态)`;
    } else if (btn.text && btn.text.includes('[State: Inactive/False]')) {
      hint = `${hint} (未激活态)`;
    }
    return hint;
  }
  const t = (btn.text || '').toLowerCase();
  const tag = (btn.tag || '').toLowerCase();
  const id = (btn.id || '').toLowerCase();

  if (btn.is_schema_action || tag === 'schema-action') {
    return `执行配置操作: ${btn.text.replace(/\[State:[^\]]+\]/g, '').trim()}`;
  }

  if (t.includes('copy') || t.includes('复制') || id.includes('copy')) return '复制生成结果或令牌至剪贴板';
  if (t.includes('generate') || t.includes('生成') || id.includes('generate')) return '生成新数据、哈希值或令牌';
  if (t.includes('download') || t.includes('下载') || t.includes('export') || t.includes('导出')) return '导出并下载数据文件或资源';
  if (t.includes('upload') || t.includes('上传') || t.includes('import') || t.includes('导入')) return '导入外部文件或数据结构';
  if (t.includes('convert') || t.includes('转换') || t.includes('format') || t.includes('美化')) return '转换或美化输入内容';
  if (t.includes('clear') || t.includes('清除') || t.includes('reset') || t.includes('重置')) return '清除当前输入或重置画布状态';

  if (t.includes('send') || t.includes('发送') || id.includes('send')) return '发送 HTTP / GraphQL / WebSocket API 请求';
  if (t.includes('save') || t.includes('保存') || id.includes('save')) return '保存请求至集合或工作区';
  if (t.includes('env') || t.includes('环境') || id.includes('env')) return '切换环境变量集合';

  if (t.includes('cart') || t.includes('购物车') || t.includes('add to cart') || id.includes('cart')) return '加入商品至购物车';
  if (t.includes('checkout') || t.includes('结账') || t.includes('buy') || t.includes('购买')) return '发起结账与支付流程';
  if (t.includes('start') || t.includes('free') || t.includes('try') || t.includes('get started') || t.includes('免费') || t.includes('试用')) return '核心转化 CTA / 发起新手引导';
  if (t.includes('sign up') || t.includes('register') || t.includes('注册')) return '用户注册账号';
  if (t.includes('login') || t.includes('sign in') || t.includes('登录')) return '用户登录认证';
  if (t.includes('upgrade') || t.includes('pro') || t.includes('pricing') || t.includes('订阅')) return '商业变现与付费套餐升级';

  if (t.includes('undo') || t.includes('撤销')) return '撤销上一步画布操作';
  if (t.includes('redo') || t.includes('重做')) return '重做上一步操作';
  if (t.includes('zoom') || t.includes('缩放')) return '调整缩放比例或视口';
  if (t.includes('play') || t.includes('播放')) return '开始多媒体播放';
  if (t.includes('pause') || t.includes('暂停')) return '暂停多媒体播放';
  if (t.includes('filter') || t.includes('滤镜') || t.includes('crop') || t.includes('裁剪')) return '应用图像滤镜或裁剪选区';

  if (t.includes('deal') || t.includes('发牌')) return '洗牌发牌并开始牌局';
  if (t.includes('hit') || t.includes('要牌')) return '从牌堆抽取一张牌';
  if (t.includes('stand') || t.includes('停牌')) return '结束当前回合保留手牌';
  if (t.includes('double') || t.includes('加倍')) return '加倍下注并抽取最后一张牌';
  if (t.includes('split') || t.includes('分牌')) return '分牌为两幅独立手牌';
  if (t.includes('restart') || t.includes('new game') || t.includes('新游戏')) return '开启新一轮游戏';

  if (t.includes('route') || t.includes('路线') || t.includes('navigate') || t.includes('导航')) return '规划路径并计算导航轨迹';
  if (t.includes('search') || t.includes('query') || t.includes('搜索') || t.includes('查询')) return '执行关键词搜索查询';
  if (t.includes('delete') || t.includes('remove') || t.includes('删除')) return '删除或清空数据项';

  return `触发 ${tag || '控件'} 交互操作 (${page.path})`;
}

/**
 * Generate standard business context markdown and write to .shiplens/contexts/<app_id>.md
 * @param {string} dir Project root directory
 * @param {string} appId Target App ID
 * @param {string} projectName Project Name
 * @param {string} framework Framework detected
 * @param {string} lang Language ('en' | 'zh')
 * @returns {{ filePath: string, relPath: string, totalPages: number, totalButtons: number, markdown: string }}
 */
function generateProjectContext(dir = process.cwd(), appId, projectName = 'My App', framework = 'custom', lang = 'en') {
  const { framework: detectedFramework, pages } = detectProjectPages(dir);
  const activeFramework = framework || detectedFramework;
  const factsheet = extractProjectFactsheet(dir);

  const isZh = lang === 'zh';
  const pageDetails = [];
  let totalButtonsCount = 0;

  for (const p of pages) {
    const skeleton = extractPageSkeleton(p.filePath, p.path, p.name, dir, p.component_files);
    const purpose = inferPagePurpose(p, skeleton.headings, skeleton.descriptions, skeleton.faqs, factsheet);
    totalButtonsCount += skeleton.raw_buttons.length;
    pageDetails.push({
      ...p,
      relFilePath: path.relative(dir, p.filePath).replace(/\\/g, '/'),
      purpose,
      headings: skeleton.headings,
      faqs: skeleton.faqs,
      feature_bullets: skeleton.feature_bullets,
      descriptions: skeleton.descriptions,
      buttons: skeleton.raw_buttons.map((b) => ({
        ...b,
        intent: isZh ? inferButtonIntentZh(b, p) : inferButtonIntent(b, p),
      })),
    });
  }

  const now = new Date().toISOString();
  const mdLines = isZh ? [
    '# Shiplens 项目业务上下文与 UI 语义字典',
    '',
    `> **项目名称**: ${projectName}`,
    `> **应用 ID**: ${appId}`,
    `> **前端框架**: ${activeFramework}`,
    `> **生成时间**: ${now}`,
    '',
  ] : [
    '# Shiplens Project Business Context & UI Dictionary',
    '',
    `> **Project Name**: ${projectName}`,
    `> **App ID**: ${appId}`,
    `> **Framework**: ${activeFramework}`,
    `> **Generated At**: ${now}`,
    '',
  ];

  // 1. Factsheet Overview
  if (factsheet.readme.title || factsheet.description || (factsheet.i18n && factsheet.i18n.rawList.length > 0)) {
    mdLines.push('---');
    mdLines.push('');
    mdLines.push(isZh ? '## 0. 项目概览与 5 层事实清单' : '## 0. Project Overview & Factsheet');
    if (factsheet.readme.title) {
      mdLines.push(isZh ? `- **产品标题**: ${factsheet.readme.title}` : `- **Product Title**: ${factsheet.readme.title}`);
    }
    if (factsheet.description) {
      mdLines.push(isZh ? `- **定位描述**: ${factsheet.description}` : `- **Product Positioning**: ${factsheet.description}`);
    }
    if (factsheet.i18n && factsheet.i18n.rawList.length > 0) {
      const topTerms = factsheet.i18n.rawList.slice(0, 8).map((t) => `\`${t.key}\` -> **${t.val}**`).join(', ');
      mdLines.push(isZh ? `- **核心多语言词典 (${factsheet.i18n.primaryLang})**: ${topTerms}` : `- **Core Localized Dictionary (${factsheet.i18n.primaryLang})**: ${topTerms}`);
    }
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push(isZh ? '## 1. 页面与路由功能清单' : '## 1. Page & Route Catalog');
  mdLines.push('');

  if (pageDetails.length === 0) {
    mdLines.push(isZh ? '*在静态扫描中未检测到前端模板页面。*' : '*No frontend template pages detected during initial static scanning.*');
    mdLines.push('');
  } else {
    for (const p of pageDetails) {
      mdLines.push(isZh ? `### 页面/视图: ${p.name} (\`${p.path}\`)` : `### Page: ${p.name} (\`${p.path}\`)`);
      mdLines.push(isZh ? `- **源码文件**: [\`${p.relFilePath}\`](file:///${path.resolve(dir, p.relFilePath).replace(/\\/g, '/')})` : `- **Source File**: [\`${p.relFilePath}\`](file:///${path.resolve(dir, p.relFilePath).replace(/\\/g, '/')})`);
      mdLines.push(isZh ? `- **功能定位**: ${p.purpose}` : `- **Page Purpose**: ${p.purpose}`);

      if (p.headings.length > 0) {
        mdLines.push(isZh ? `- **主要标题**: ${p.headings.map((h) => `\`${h}\``).join(', ')}` : `- **Key Headings**: ${p.headings.map((h) => `\`${h}\``).join(', ')}`);
      }
      if (p.feature_bullets.length > 0) {
        mdLines.push(isZh ? '- **核心亮点与特性**:' : '- **Feature Highlights**:');
        for (const f of p.feature_bullets.slice(0, 5)) {
          mdLines.push(`  - ${f}`);
        }
      }
      if (p.faqs.length > 0) {
        mdLines.push(isZh ? '- **常见问题 (FAQ)**:' : '- **FAQ Context**:');
        for (const f of p.faqs.slice(0, 3)) {
          mdLines.push(`  - Q: ${f.q}${f.a ? ` -> A: ${f.a}` : ''}`);
        }
      }

      if (p.buttons.length > 0) {
        mdLines.push('');
        mdLines.push(isZh ? `#### 交互控件与操作单元 (${p.buttons.length}):` : `#### Interactive Elements & Buttons (${p.buttons.length}):`);
        mdLines.push(isZh 
          ? '| 控件 ID | 文本 / 标签 | 选择器 | 源码位置 | 推断交互意图 |'
          : '| Button ID | Text / Label | Selector | Source Location | Inferred Action / Intent |');
        mdLines.push('| :--- | :--- | :--- | :--- | :--- |');
        for (const b of p.buttons) {
          const textDisplay = (b.text || '').replace(/\|/g, '\\|').trim() || (isZh ? '(图标/操作)' : '(icon/action)');
          const locDisplay = b.source_loc ? `\`${b.source_loc}\`` : '-';
          mdLines.push(`| \`${b.id}\` | ${textDisplay} | \`${b.selector}\` | ${locDisplay} | ${b.intent} |`);
        }
      } else {
        mdLines.push(isZh ? '- **交互控件**: *(该页面未发现独立控件)*' : '- **Interactive Elements**: *(No buttons or interactive controls found on this page)*');
      }
      mdLines.push('');
    }
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push(isZh ? '## 2. 业务指标与埋点对齐' : '## 2. Business Metric Grounding');
  mdLines.push(isZh ? `- **页面与视图映射总量**: ${pageDetails.length}` : `- **Total Pages Mapped**: ${pageDetails.length}`);
  mdLines.push(isZh ? `- **交互控件与操作单元总量**: ${totalButtonsCount}` : `- **Total Interactive Controls**: ${totalButtonsCount}`);
  mdLines.push(isZh ? '- **三锚点对齐策略**: 1. `label`/`id` -> 2. `path` + `target_tag` + `target_text` -> 3. `target_signature`。' : '- **Alignment Strategy**: Triple-Anchor Match (1. `label`/`id` -> 2. `path` + `target_tag` + `target_text` -> 3. `target_signature`).');
  mdLines.push(isZh ? '- **分析指引**: 在排查漏斗流失、热力图聚集或转化断点时，参考上述控件 ID 与功能定位即可将遥测技术指标直接映射为业务洞察。' : '- **Usage**: When analyzing drop-offs, funnels, or heatmaps, reference the Button IDs and Page Purposes above to translate technical telemetry into actionable product insights.');
  mdLines.push('');

  const markdownContent = mdLines.join('\n');

  // Standard storage path: .shiplens/contexts/<app_id>.md
  const contextDir = path.join(dir, '.shiplens', 'contexts');
  fs.mkdirSync(contextDir, { recursive: true });
  const targetFilePath = path.join(contextDir, `${appId}.md`);
  fs.writeFileSync(targetFilePath, markdownContent, 'utf8');

  return {
    filePath: targetFilePath,
    relPath: path.relative(dir, targetFilePath).replace(/\\/g, '/'),
    totalPages: pageDetails.length,
    totalButtons: totalButtonsCount,
    markdown: markdownContent,
  };
}

module.exports = {
  generateProjectContext,
  inferPagePurpose,
  inferButtonIntent,
  inferButtonIntentZh,
};


