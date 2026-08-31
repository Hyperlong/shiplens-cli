const fs = require('fs');
const path = require('path');
const { detectProjectPages } = require('./scanner');
const { extractPageSkeleton, extractProjectFactsheet } = require('./extractor');

/**
 * 路由前缀命名空间生成算法 (Route Namespace Algorithm)
 * 将长路由转换为全局唯一的紧凑自解释前缀 (3~10 字符)
 * @param {string} routePath 路由路径 (如 /tools/base64-file-converter)
 * @returns {string} 前缀 (如 b64file)
 */
function generateRoutePrefix(routePath) {
  if (!routePath || routePath === '/' || routePath === '/index' || routePath === '/home') {
    return 'home';
  }
  if (routePath.includes('404')) return 'p404';
  if (routePath.includes('about')) return 'about';

  // 去除前缀 /tools/, /modules/, /pages/, /views/
  let clean = routePath.replace(/^\/(?:tools|modules|pages|views)\//i, '').replace(/^\/+|\/+$/g, '');

  // 常见工具名称简写映射字典
  const ABBR_MAP = {
    'base64-file-converter': 'b64file',
    'base64-string-converter': 'b64str',
    'base64-converter': 'b64conv',
    'basic-auth-generator': 'basic_auth',
    'ascii-text-drawer': 'ascii_text',
    'password-strength-analyser': 'pwd_strength',
    'token-generator': 'token_gen',
    'jwt-parser': 'jwt_parser',
    'json-formatter': 'json_fmt',
    'json-to-yaml': 'json_yaml',
    'yaml-to-json': 'yaml_json',
    'html-entities': 'html_ent',
    'url-encoder': 'url_enc',
    'color-converter': 'color_conv',
    'regex-tester': 'regex_test',
    'uuid-generator': 'uuid_gen',
    'hash-generator': 'hash_gen',
    'qr-code-generator': 'qrcode_gen',
    'markdown-previewer': 'md_preview',
    'svg-optimizer': 'svg_opt',
    'sql-formatter': 'sql_fmt',
    'diff-viewer': 'diff_view',
  };

  if (ABBR_MAP[clean.toLowerCase()]) {
    return ABBR_MAP[clean.toLowerCase()];
  }

  // 通用缩写规则
  let parts = clean.split(/[-_/]/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const compacted = parts.map((p) => {
    if (p === 'converter') return 'conv';
    if (p === 'generator') return 'gen';
    if (p === 'formatter') return 'fmt';
    if (p === 'analyzer' || p === 'analyser') return 'eval';
    if (p === 'encoder') return 'enc';
    if (p === 'decoder') return 'dec';
    if (p === 'calculator') return 'calc';
    if (p === 'validator') return 'val';
    if (p === 'base64') return 'b64';
    if (p === 'string') return 'str';
    if (p === 'number') return 'num';
    return p.slice(0, 4);
  }).join('_');

  return compacted.slice(0, 14).toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/**
 * 控件 ID 全局命名空间化生成算法
 * @param {object} btn 控件对象
 * @param {string} routePrefix 路由前缀
 * @param {Set<string>} seenIds 已使用 ID 集合
 * @returns {string} 全局唯一控件 ID (如 btn_b64file_download)
 */
function normalizeControlId(btn, routePrefix, seenIds) {
  let actionSlug = '';

  const label = (btn.label || '').trim();
  const rawId = (btn.id || '').trim();
  const clickHandler = (btn.click_handler || '').replace(/\(.*?\)/, '').replace(/^(?:on|handle)/i, '').trim();
  const vModel = (btn.v_model || '').trim();
  const rawText = (btn.text || '').replace(/\[State:[^\]]+\]/g, '').trim();
  const placeholder = (btn.placeholder || '').trim();
  const roleType = btn.role_type || 'button';

  // 1. 优先使用显式声明的 data-shiplens-label
  if (label) {
    actionSlug = label.replace(/[-_]+/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_+|_+$/g, '');
  }
  // 2. 优先使用点击事件处理函数名 (如 downloadFile -> download_file, copyBase64 -> copy_b64)
  else if (clickHandler) {
    actionSlug = clickHandler
      .replace(/FileBase64$/i, '_b64')
      .replace(/Base64$/i, '_b64')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_+|_+$/g, '');
  }
  // 3. 优先使用双向绑定的表单模型 (如 fileName -> file_name, base64Input -> base64_input)
  else if (vModel) {
    actionSlug = vModel
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_+|_+$/g, '');
  }
  // 4. 其次使用源码中的语义 id (过滤掉无意义的自动生成 ID 或十六进制哈希)
  else if (rawId && !/^(btn[_-]?\d+|button[_-]?\d+|el[_-]?\d+|btn_[0-9a-f]{6,})$/i.test(rawId)) {
    actionSlug = rawId.replace(/^btn[_-]/i, '').replace(/[-_]+/g, '_').toLowerCase().replace(/^_+|_+$/g, '');
  }
  // 5. 英文按钮文本文案 (如 "Start Free Trial" -> "start_free_trial")
  else if (rawText && !/^(\$t|\(|\)|\{|\}|icon|button|action)/i.test(rawText)) {
    actionSlug = rawText
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    if (/[\u4e00-\u9fa5]/.test(actionSlug)) {
      actionSlug = encodeURIComponent(actionSlug).replace(/%/g, '').slice(0, 8).toLowerCase();
    }
  }
  // 6. 输入框 placeholder
  else if (placeholder) {
    actionSlug = placeholder
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 16);
  }

  if (!actionSlug || /^(true|false|undefined|null|item|element)$/i.test(actionSlug)) {
    actionSlug = roleType || 'action';
  }

  // 统一前缀：按钮、输入框、上传统一用 btn_ 作为 Shiplens 点击/操作埋点前缀
  let candidateId = `btn_${routePrefix}_${actionSlug}`;
  let finalId = candidateId;
  let counter = 2;

  while (seenIds.has(finalId)) {
    finalId = `${candidateId}_${counter}`;
    counter += 1;
  }

  seenIds.add(finalId);
  return finalId;
}

/**
 * 转化属性 (Conversion Role) 判定算法
 * @param {object} btn 控件对象
 * @returns {'核心转化' | '核心输入' | '辅助配置' | '辅助体验' | '反向重置' | '导航跳转'}
 */
function inferConversionRole(btn) {
  const t = (btn.text || '').toLowerCase();
  const tag = (btn.tag || '').toLowerCase();
  const id = (btn.id || '').toLowerCase();
  const handler = (btn.click_handler || '').toLowerCase();
  const roleType = btn.role_type || '';

  // 1. 导航跳转
  if (roleType === 'link' || tag === 'a' || tag.includes('link') || t.includes('github') || t.includes('x.com') || t.includes('twitter') || t.includes('about')) {
    return '导航跳转';
  }

  // 2. 核心输入
  if (roleType === 'upload' || tag.includes('upload') || t.includes('upload') || t.includes('上传') || t.includes('drag and drop')) {
    return '核心输入';
  }
  if (roleType === 'input' || roleType === 'textarea' || tag.includes('input') || tag.includes('textarea')) {
    if (/input|source|content|data|text|code|body|query|sql|json|yaml|xml/i.test(btn.v_model || '') || /input|string to|base64 string|put your/i.test(t)) {
      return '核心输入';
    }
    return '辅助配置';
  }

  // 3. 辅助配置与开关
  if (roleType === 'select' || roleType === 'switch' || tag.includes('select') || tag.includes('switch') || tag.includes('checkbox') || tag.includes('radio')) {
    return '辅助配置';
  }
  if (/filename|extension|fileext|saltcount|width|height|font|mode|type|format|lang|safe/i.test(btn.v_model || '') || /extension|file name|font|width|salt/i.test(t)) {
    return '辅助配置';
  }

  // 4. 辅助体验与增强
  if (t.includes('preview') || t.includes('预览') || handler.includes('preview') || id.includes('preview')) {
    return '辅助体验';
  }

  // 5. 反向重置
  if (t.includes('clear') || t.includes('reset') || t.includes('清除') || t.includes('重置') || t.includes('undo') || t.includes('redo')) {
    return '反向重置';
  }

  // 6. 核心转化动作 (SaaS / E-commerce / Tools / Auth 核心 CTA)
  if (
    t.includes('download') || t.includes('下载') || handler.includes('download') ||
    t.includes('copy') || t.includes('复制') || handler.includes('copy') ||
    t.includes('generate') || t.includes('生成') || handler.includes('generate') ||
    t.includes('convert') || t.includes('转换') || handler.includes('convert') ||
    t.includes('run') || t.includes('execute') || t.includes('format') || t.includes('美化') ||
    t.includes('buy') || t.includes('checkout') || handler.includes('checkout') || t.includes('购买') || t.includes('结账') ||
    t.includes('upgrade') || t.includes('pro') || t.includes('pricing') || t.includes('订阅') || handler.includes('upgrade') ||
    t.includes('start') || t.includes('trial') || t.includes('free') || t.includes('try') || t.includes('免费') || t.includes('试用') ||
    t.includes('sign up') || t.includes('login') || t.includes('register') || t.includes('注册') || t.includes('登录') ||
    t.includes('submit') || t.includes('save') || t.includes('send') || t.includes('deal') || t.includes('calc')
  ) {
    return '核心转化';
  }

  return '辅助配置';
}

/**
 * 控件 4 要素精准自然语言描述生成器 (Control Description Generator)
 * 结构：触发时机/区域 + 前置输入依赖 + 业务处理动作与数据流 + 转化后果
 * @param {object} btn 控件对象
 * @param {object} page 页面对象
 * @param {string} conversionRole 转化属性
 * @param {boolean} isZh 是否中文
 * @returns {string} 自然语言描述
 */
function generateControlDescription(btn, page, conversionRole, isZh = true) {
  const t = (btn.text || '').replace(/\[State:[^\]]+\]/g, '').trim();
  const tag = btn.tag || '';
  const handler = btn.click_handler || '';
  const vModel = btn.v_model || '';
  const section = btn.section || '';
  const placeholder = btn.placeholder || '';

  if (isZh) {
    if (conversionRole === '核心转化') {
      if (/download/i.test(t) || /download/i.test(handler)) {
        return '**核心转化按钮**：将输入的待转换数据/Base64 字符串根据配置参数解码并触发浏览器二进制文件下载。';
      }
      if (/copy/i.test(t) || /copy/i.test(handler)) {
        return '**核心转化按钮**：一键将转换生成的计算结果或 Base64 编码完整复制到系统剪贴板。';
      }
      if (/upgrade|pro|pricing|订阅|checkout|buy|购买/i.test(t) || /checkout|upgrade|buy/i.test(handler)) {
        return `**核心转化按钮**：发起商业付费套餐订阅或结账流程 (${t || '升级 Pro'})。`;
      }
      if (/start|trial|free|try|免费|试用/i.test(t) || /start|trial/i.test(handler)) {
        return `**核心转化按钮**：触发产品核心转化 CTA，发起免费试用或新手引导流程 (${t})。`;
      }
      if (/sign up|register|注册/i.test(t) || /signup|register/i.test(handler)) {
        return `**核心转化按钮**：提交新用户账号注册表单，完成注册建档。`;
      }
      if (/login|sign in|登录/i.test(t) || /login/i.test(handler)) {
        return `**核心转化按钮**：提交用户登录凭据，完成身份认证会话。`;
      }
      if (/generate|calc|run|execute/i.test(t) || /generate|calc|run/i.test(handler)) {
        return `**核心转化按钮**：根据用户提供的输入配置触发核心计算生成流程，输出目标结果。`;
      }
      if (/submit|save|send/i.test(t) || /submit|save|send/i.test(handler)) {
        return `**核心转化按钮**：提交当前表单或配置，持久化数据或发起 API 请求。`;
      }
      return `**核心转化按钮**：触发当前核心业务动作 (${t || handler || '执行'})。`;
    }

    if (conversionRole === '核心输入') {
      if (btn.role_type === 'upload' || /upload/i.test(tag) || /drag and drop/i.test(t)) {
        return '用户拖拽或点击选择本地文件，前端自动读取文件并将其编码或转换为处理所需格式。';
      }
      return `接收用户粘贴或输入的待处理数据/字符串 (${vModel || t || placeholder})。`;
    }

    if (conversionRole === '辅助配置') {
      if (/filename/i.test(vModel) || /file name/i.test(t)) {
        return '输入还原文件时使用的目标文件名（可选，默认使用原文件名）。';
      }
      if (/extension|fileext/i.test(vModel) || /extension/i.test(t)) {
        return '指定还原文件的扩展名（如 png, pdf, zip），用于确定下载文件的 MIME 类型与文件后缀。';
      }
      if (btn.role_type === 'switch' || /switch/i.test(tag)) {
        return `切换配置开关项 (${t || vModel})，调整编码规范或执行模式。`;
      }
      if (btn.role_type === 'select' || /select/i.test(tag)) {
        return `选择配置项 (${t || vModel})，指定目标字体、编码算法或运行环境。`;
      }
      return `配置 ${t || vModel || '参数'}，用于自定义输出结果格式。`;
    }

    if (conversionRole === '辅助体验') {
      if (/preview/i.test(t) || /preview/i.test(handler)) {
        return '在当前卡片内即时渲染预览效果，便于用户无需下载即可即时核验处理结果。';
      }
      return `辅助体验操作 (${t})，用于即时预览或交互增强。`;
    }

    if (conversionRole === '反向重置') {
      return `清空当前输入区的内容或重置配置项 (${t})。`;
    }

    if (conversionRole === '导航跳转') {
      return `跳转至相关页面或外部项目仓库 (${t})。`;
    }

    return `触发 ${t || tag} 控件操作。`;
  }

  // 英文版本
  if (conversionRole === '核心转化') {
    if (/download/i.test(t)) return '**Core Conversion**: Decodes input payload and triggers browser binary file download.';
    if (/copy/i.test(t)) return '**Core Conversion**: Copies generated output or encoded string to system clipboard.';
    return `**Core Conversion**: Executes primary workflow action (${t}).`;
  }
  if (conversionRole === '核心输入') {
    return 'Receives user input data, payload string, or file drag-and-drop.';
  }
  if (conversionRole === '辅助配置') {
    return `Configures optional parameter (${t || vModel}) to customize processing result.`;
  }
  return `Triggers ${t || tag} interaction.`;
}

/**
 * 页面功能全景总结 (Page Functional Summary) 4 要素高阶业务语义合成引擎
 * 结构：
 * 1. 功能全景与业务定义 (包含 1~3 个核心工作流)
 * 2. 业务用途与满足的用户需求 (包含用户需求痛点与开发者设计意图)
 * 3. 输入与输出流 (I/O)
 * 4. 核心转化动作 (OEC) 与数据分析指引
 * @param {object} page 页面对象
 * @param {object} skeleton 骨架数据
 * @param {object} factsheet 项目事实
 * @param {boolean} isZh 是否中文
 * @returns {string} 页面功能全景总结 Markdown 引用块
 */
function generatePageSummary(page, skeleton, factsheet = {}, isZh = true) {
  const meta = skeleton.tool_meta || {};
  const toolTitle = meta.title || skeleton.headings[0] || page.name;
  const toolDesc = meta.description || skeleton.descriptions[0] || factsheet.description || '';
  const cardTitles = skeleton.card_titles || [];
  const formLabels = skeleton.form_labels || [];
  const placeholders = skeleton.placeholders || [];
  const buttons = skeleton.raw_buttons || [];

  // 提取核心输入项与转化按钮
  const inputLabels = formLabels.concat(placeholders).slice(0, 4);
  const conversionBtns = buttons.filter((b) => inferConversionRole(b) === '核心转化').map((b) => b.text).filter(Boolean);
  const coreOECNames = Array.from(new Set(conversionBtns)).slice(0, 3);
  const oecText = coreOECNames.length > 0 ? coreOECNames.map((n) => `\`${n}\``).join(' 或 ') : '`核心操作按钮`';

  if (isZh) {
    let workflows = [];
    if (cardTitles.length >= 2) {
      workflows = cardTitles.slice(0, 3).map((ct, idx) => `${idx + 1}. **${ct}**：支持在当前面板中执行 ${ct} 相关的配置与转换处理；`);
    } else if (cardTitles.length === 1) {
      workflows.push(`1. **${cardTitles[0]}**：用户输入或配置相关参数，即时触发处理并获取结果；`);
    } else {
      workflows.push(`1. **核心配置与执行**：用户提供输入数据，通过页面控件即时完成转换与输出；`);
    }

    const workflowStr = workflows.join('\n> ');

    // 提炼输入流与输出流
    let inputSummary = inputLabels.length > 0
      ? `用户提供的文本字符串、参数字段（如 ${inputLabels.map(l => `\`${l}\``).join('、')}）或本地待处理文件。`
      : '用户输入的配置参数、文本数据或上传的本地文件。';

    let outputSummary = coreOECNames.some(n => /download/i.test(n))
      ? '下载还原后的本地文件、生成文本复制到剪贴板、或页面内即时预览渲染。'
      : '计算生成的结果数据、复制到剪贴板的令牌/字符串、或即时渲染的视图。';

    return [
      `> **功能全景与业务定义**:  `,
      `> 本页面是面向用户的**${toolTitle}**功能，${toolDesc ? `${toolDesc}。` : ''}主要提供以下核心工作流：  `,
      `> ${workflowStr}  `,
      `> **业务用途与满足的用户需求**:  `,
      `> - **满足需求**: 解决用户在${toolTitle}场景下的数据处理、格式转换或调试需求，提供免安装、纯前端运行的快速工具；  `,
      `> - **开发者设计意图**: 开发者通过模块化卡片与清晰的表单布局，引导用户以“输入 $\\rightarrow$ 配置 $\\rightarrow$ 导出”的标准闭环高效完成任务。  `,
      `> **输入与输出流 (I/O)**:  `,
      `> - **输入 (Input)**: ${inputSummary}  `,
      `> - **输出 (Output)**: ${outputSummary}  `,
      `> **核心转化动作 (OEC) 与数据分析指引**:  `,
      `> 点击 ${oecText} 代表本次业务操作成功闭环。在漏斗分析中，若用户完成输入或上传但未触发上述任一核心转化动作，视为转换流程受阻，应重点排查输入校验报错或操作指引清晰度。`,
    ].join('\n');
  }

  // 英文总结
  return [
    `> **Functional Overview & Capabilities**:  `,
    `> This page provides **${toolTitle}** capabilities. ${toolDesc ? `${toolDesc}.` : ''}  `,
    `> **Business Purpose & User Needs**:  `,
    `> - **User Need**: Enables rapid in-browser conversion and processing without external software installation.  `,
    `> - **Developer Intent**: Guides users through a streamlined "Input $\\rightarrow$ Configure $\\rightarrow$ Export" conversion funnel.  `,
    `> **Input & Output Flow (I/O)**:  `,
    `> - **Input**: Config parameters, text payloads, or uploaded local binary files.  `,
    `> - **Output**: Exported/downloaded files, clipboard text, or inline visual rendering.  `,
    `> **Overall Evaluation Criterion (OEC) & Analytics Guidance**:  `,
    `> Triggering ${oecText} signifies successful conversion completion. Focus on drop-offs where inputs were provided but no conversion CTA was clicked.`,
  ].join('\n');
}

/**
 * 生成符合 v2.0 标准的项目业务上下文与 UI 语义字典 Markdown
 * @param {string} dir 项目根目录
 * @param {string} appId Target App ID
 * @param {string} projectName Project Name
 * @param {string} framework Framework detected
 * @param {string} lang Language ('en' | 'zh')
 * @returns {{ filePath: string, relPath: string, totalPages: number, totalButtons: number, totalOEC: number, markdown: string }}
 */
function generateProjectContext(dir = process.cwd(), appId, projectName = 'My App', framework = 'custom', lang = 'zh') {
  const { framework: detectedFramework, pages } = detectProjectPages(dir);
  const activeFramework = framework || detectedFramework;
  const factsheet = extractProjectFactsheet(dir);

  const isZh = lang === 'zh';
  const pageDetails = [];
  let totalButtonsCount = 0;
  let totalOECCount = 0;
  const globalSeenControlIds = new Set();

  for (const p of pages) {
    const skeleton = extractPageSkeleton(p.filePath, p.path, p.name, dir, p.component_files);
    const routePrefix = generateRoutePrefix(p.path);

    const controls = (skeleton.raw_buttons || []).map((b) => {
      const conversionRole = inferConversionRole(b);
      if (conversionRole === '核心转化') {
        totalOECCount += 1;
      }
      const uniqueId = normalizeControlId(b, routePrefix, globalSeenControlIds);
      const desc = generateControlDescription(b, p, conversionRole, isZh);

      return {
        ...b,
        id: uniqueId,
        conversion_role: conversionRole,
        description: desc,
      };
    });

    totalButtonsCount += controls.length;
    const pageSummary = generatePageSummary(p, skeleton, factsheet, isZh);

    pageDetails.push({
      ...p,
      relFilePath: path.relative(dir, p.filePath).replace(/\\/g, '/'),
      meta: skeleton.tool_meta || {},
      headings: skeleton.headings,
      alerts: skeleton.alerts,
      tooltips: skeleton.tooltips,
      form_labels: skeleton.form_labels,
      placeholders: skeleton.placeholders,
      card_titles: skeleton.card_titles,
      faqs: skeleton.faqs,
      feature_bullets: skeleton.feature_bullets,
      descriptions: skeleton.descriptions,
      controls,
      pageSummary,
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

  // 0. 项目概览与全局事实清单
  mdLines.push('---');
  mdLines.push('');
  mdLines.push(isZh ? '## 0. 项目概览与全局事实清单' : '## 0. Project Overview & Factsheet');
  mdLines.push(isZh ? `- **产品标题**: ${factsheet.readme.title || projectName}` : `- **Product Title**: ${factsheet.readme.title || projectName}`);
  if (factsheet.description) {
    mdLines.push(isZh ? `- **定位描述**: ${factsheet.description}` : `- **Product Positioning**: ${factsheet.description}`);
  }
  if (factsheet.i18n && factsheet.i18n.rawList.length > 0) {
    const topTerms = factsheet.i18n.rawList.slice(0, 8).map((t) => `\`${t.key}\` -> **${t.val}**`).join(', ');
    mdLines.push(isZh ? `- **核心业务词条字典 (${factsheet.i18n.primaryLang})**: ${topTerms}` : `- **Core Localized Dictionary (${factsheet.i18n.primaryLang})**: ${topTerms}`);
  }
  mdLines.push('');

  // 1. 页面与路由功能清单
  mdLines.push('---');
  mdLines.push('');
  mdLines.push(isZh ? '## 1. 页面与路由功能清单' : '## 1. Page & Route Catalog');
  mdLines.push('');

  if (pageDetails.length === 0) {
    mdLines.push(isZh ? '*在静态扫描中未检测到前端模板页面。*' : '*No frontend template pages detected during initial static scanning.*');
    mdLines.push('');
  } else {
    for (const p of pageDetails) {
      const pageTitle = p.meta.title || p.headings[0] || p.name;
      mdLines.push(isZh ? `### 页面/视图: ${pageTitle} (\`${p.path}\`)` : `### Page: ${pageTitle} (\`${p.path}\`)`);
      mdLines.push(isZh ? `- **源码文件**: [\`${p.relFilePath}\`](file:///${path.resolve(dir, p.relFilePath).replace(/\\/g, '/')})` : `- **Source File**: [\`${p.relFilePath}\`](file:///${path.resolve(dir, p.relFilePath).replace(/\\/g, '/')})`);
      if (p.meta.category) {
        mdLines.push(isZh ? `- **所属业务分类**: ${p.meta.category}` : `- **Business Category**: ${p.meta.category}`);
      }

      // 1. 页面全域说明与文案资产
      mdLines.push('');
      mdLines.push(isZh ? '#### 1. 页面全域说明与文案资产:' : '#### 1. Page Copy & Text Assets:');
      if (p.headings.length > 0) {
        mdLines.push(isZh ? `- **主标题与副标题**: ${p.headings.join(' / ')}` : `- **Headings & Titles**: ${p.headings.join(' / ')}`);
      }
      if (p.alerts.length > 0 || p.tooltips.length > 0) {
        mdLines.push(isZh ? '- **引导与提示文案**:' : '- **Guidance & Notice Copy**:');
        for (const a of p.alerts.concat(p.tooltips).slice(0, 5)) {
          mdLines.push(`  - "${a}"`);
        }
      }
      if (p.feature_bullets.length > 0) {
        mdLines.push(isZh ? '- **核心亮点与特性列表**:' : '- **Feature Highlights**:');
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
      if (p.form_labels.length > 0 || p.placeholders.length > 0) {
        const labels = Array.from(new Set(p.form_labels.concat(p.placeholders))).slice(0, 8);
        mdLines.push(isZh ? `- **输入与表单标签**: ${labels.map(l => `\`${l}\``).join('、')}` : `- **Form & Field Labels**: ${labels.map(l => `\`${l}\``).join(', ')}`);
      }

      // 2. 交互控件与精准业务描述字典
      mdLines.push('');
      if (p.controls.length > 0) {
        mdLines.push(isZh ? `#### 2. 交互控件与精准业务描述字典 (${p.controls.length}):` : `#### 2. Interactive Controls & UI Dictionary (${p.controls.length}):`);
        mdLines.push(isZh 
          ? '| 控件 ID (全局唯一) | 控件文案 | 组件类型 | 源码位置 | 详细业务功能与意图描述 | 转化属性 |'
          : '| Control ID | Label / Text | Tag | Source Location | Inferred Action & Business Intent | Conversion Role |');
        mdLines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
        for (const c of p.controls) {
          const textDisplay = (c.text || '').replace(/\|/g, '\\|').trim() || (isZh ? '(图标/操作)' : '(icon/action)');
          const locDisplay = c.source_loc ? `\`${c.source_loc}\`` : '-';
          const roleDisplay = c.conversion_role === '核心转化' ? `**${c.conversion_role}**` : c.conversion_role;
          mdLines.push(`| \`${c.id}\` | ${textDisplay} | \`${c.tag}\` | ${locDisplay} | ${c.description} | ${roleDisplay} |`);
        }
      } else {
        mdLines.push(isZh ? '#### 2. 交互控件与精准业务描述字典:\n*(该页面未发现独立控件)*' : '#### 2. Interactive Controls:\n*(No controls found on this page)*');
      }

      // 3. 页面功能全景总结 (Page Functional Summary)
      mdLines.push('');
      mdLines.push(isZh ? '#### 3. 页面功能全景总结 (Page Functional Summary):' : '#### 3. Page Functional Summary:');
      mdLines.push(p.pageSummary);
      mdLines.push('');
    }
  }

  // 2. 业务指标与埋点对齐
  mdLines.push('---');
  mdLines.push('');
  mdLines.push(isZh ? '## 2. 业务指标与埋点对齐' : '## 2. Business Metric Grounding');
  mdLines.push(isZh ? `- **页面与视图映射总量**: ${pageDetails.length}` : `- **Total Pages Mapped**: ${pageDetails.length}`);
  mdLines.push(isZh ? `- **交互控件与操作单元总量**: ${totalButtonsCount}` : `- **Total Interactive Controls**: ${totalButtonsCount}`);
  mdLines.push(isZh ? `- **核心转化动作总量 (OEC)**: ${totalOECCount}` : `- **Total Core Conversion Actions (OEC)**: ${totalOECCount}`);
  mdLines.push(isZh ? '- **三锚点对齐策略**: 1. `data-shiplens-label`/`id` -> 2. `path` + `target_tag` + `target_text` -> 3. `target_signature`。' : '- **Alignment Strategy**: Triple-Anchor Match (1. `data-shiplens-label`/`id` -> 2. `path` + `target_tag` + `target_text` -> 3. `target_signature`).');
  mdLines.push(isZh ? '- **数据分析与流失归因指引**: 在排查漏斗流失、转化断点或热力图聚集时，将 SDK 遥测指标直接与上述控件 ID、I/O 流及 OEC 动作对照，实现零幻觉业务洞察。' : '- **Usage**: Reference the Control IDs, I/O streams, and OECs above to translate technical telemetry directly into high-confidence conversion insights.');
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
    totalOEC: totalOECCount,
    markdown: markdownContent,
  };
}

module.exports = {
  generateProjectContext,
  generateRoutePrefix,
  normalizeControlId,
  inferConversionRole,
  generateControlDescription,
  generatePageSummary,
};


