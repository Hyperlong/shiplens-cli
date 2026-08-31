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
    return btn.action_hint;
  }
  const t = (btn.text || '').toLowerCase();
  const tag = (btn.tag || '').toLowerCase();
  const id = (btn.id || '').toLowerCase();

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
 * Generate standard business context markdown and write to .shiplens/contexts/<app_id>.md
 * @param {string} dir Project root directory
 * @param {string} appId Target App ID
 * @param {string} projectName Project Name
 * @param {string} framework Framework detected
 * @returns {{ filePath: string, relPath: string, totalPages: number, totalButtons: number, markdown: string }}
 */
function generateProjectContext(dir = process.cwd(), appId, projectName = 'My App', framework = 'custom') {
  const { framework: detectedFramework, pages } = detectProjectPages(dir);
  const activeFramework = framework || detectedFramework;
  const factsheet = extractProjectFactsheet(dir);

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
        intent: inferButtonIntent(b, p),
      })),
    });
  }

  const now = new Date().toISOString();
  const mdLines = [
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
    mdLines.push('## 0. Project Overview & Factsheet');
    if (factsheet.readme.title) {
      mdLines.push(`- **Product Title**: ${factsheet.readme.title}`);
    }
    if (factsheet.description) {
      mdLines.push(`- **Product Positioning**: ${factsheet.description}`);
    }
    if (factsheet.i18n && factsheet.i18n.rawList.length > 0) {
      const topTerms = factsheet.i18n.rawList.slice(0, 8).map((t) => `\`${t.key}\` -> **${t.val}**`).join(', ');
      mdLines.push(`- **Core Localized Dictionary (${factsheet.i18n.primaryLang})**: ${topTerms}`);
    }
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## 1. Page & Route Catalog');
  mdLines.push('');

  if (pageDetails.length === 0) {
    mdLines.push('*No frontend template pages detected during initial static scanning.*');
    mdLines.push('');
  } else {
    for (const p of pageDetails) {
      mdLines.push(`### Page: ${p.name} (\`${p.path}\`)`);
      mdLines.push(`- **Source File**: [\`${p.relFilePath}\`](file:///${path.resolve(dir, p.relFilePath).replace(/\\/g, '/')})`);
      mdLines.push(`- **Page Purpose**: ${p.purpose}`);

      if (p.headings.length > 0) {
        mdLines.push(`- **Key Headings**: ${p.headings.map((h) => `\`${h}\``).join(', ')}`);
      }
      if (p.feature_bullets.length > 0) {
        mdLines.push('- **Feature Highlights**:');
        for (const f of p.feature_bullets.slice(0, 5)) {
          mdLines.push(`  - ${f}`);
        }
      }
      if (p.faqs.length > 0) {
        mdLines.push('- **FAQ Context**:');
        for (const f of p.faqs.slice(0, 3)) {
          mdLines.push(`  - Q: ${f.q}${f.a ? ` -> A: ${f.a}` : ''}`);
        }
      }

      if (p.buttons.length > 0) {
        mdLines.push('');
        mdLines.push(`#### Interactive Elements & Buttons (${p.buttons.length}):`);
        mdLines.push('| Button ID | Text / Label | Selector | Source Location | Inferred Action / Intent |');
        mdLines.push('| :--- | :--- | :--- | :--- | :--- |');
        for (const b of p.buttons) {
          const textDisplay = (b.text || '').replace(/\|/g, '\\|').trim() || '(icon/action)';
          const locDisplay = b.source_loc ? `\`${b.source_loc}\`` : '-';
          mdLines.push(`| \`${b.id}\` | ${textDisplay} | \`${b.selector}\` | ${locDisplay} | ${b.intent} |`);
        }
      } else {
        mdLines.push('- **Interactive Elements**: *(No buttons or interactive controls found on this page)*');
      }
      mdLines.push('');
    }
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## 2. Business Metric Grounding');
  mdLines.push(`- **Total Pages Mapped**: ${pageDetails.length}`);
  mdLines.push(`- **Total Interactive Controls**: ${totalButtonsCount}`);
  mdLines.push('- **Alignment Strategy**: Triple-Anchor Match (1. `label`/`id` -> 2. `path` + `target_tag` + `target_text` -> 3. `target_signature`).');
  mdLines.push('- **Usage**: When analyzing drop-offs, funnels, or heatmaps, reference the Button IDs and Page Purposes above to translate technical telemetry into actionable product insights.');
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
};

