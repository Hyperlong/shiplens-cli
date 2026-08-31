const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default || require('@babel/traverse');
const t = require('@babel/types');

/**
 * 提取项目 README.md 关键摘要（过滤安装指令与代码块，只保留核心自然语言描述）
 * @param {string} rootDir 项目根目录
 * @returns {{ title: string, description: string, rawSummary: string }}
 */
function extractReadmeSummary(rootDir = process.cwd()) {
  const candidates = ['README.md', 'readme.md', 'README.MD', 'README.cn.md', 'README.fr.md', 'readme.txt'];
  for (const cand of candidates) {
    const p = path.join(rootDir, cand);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split(/\r?\n/);
        let title = '';
        const bodyLines = [];
        let inCodeBlock = false;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
          }
          if (inCodeBlock) continue;

          if (!title && (trimmed.startsWith('# ') || trimmed.startsWith('## '))) {
            title = trimmed.replace(/^#+\s*/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').trim();
            continue;
          }

          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('[!') && !trimmed.startsWith('npm ') && !trimmed.startsWith('git ')) {
            const clean = trimmed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').trim();
            if (clean) {
              bodyLines.push(clean);
              if (bodyLines.length >= 5) break;
            }
          }
        }

        const summary = bodyLines.join(' ').slice(0, 300);
        return {
          title: title || '',
          description: summary || '',
          rawSummary: `${title ? `# ${title}\n` : ''}${summary}`.trim(),
        };
      } catch (e) {}
    }
  }
  return { title: '', description: '', rawSummary: '' };
}

/**
 * 结构化提取 README 中的核心功能特性、工具清单与操作指令 (Layer 1 增强)
 * @param {string} rootDir 项目根目录
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, category: string, action_hint: string, source_loc: string, is_readme_feature: boolean }>}
 */
function extractReadmeFeatures(rootDir = process.cwd()) {
  const candidates = ['README.md', 'readme.md', 'README.MD', 'README.cn.md', 'README.fr.md', 'readme.txt'];
  const features = [];

  for (const cand of candidates) {
    const p = path.join(rootDir, cand);
    if (!fs.existsSync(p)) continue;

    try {
      const content = fs.readFileSync(p, 'utf8');
      const lines = content.split(/\r?\n/);
      let inFeatureSection = false;
      let currentCategory = 'Core Features';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (/^#+\s*/.test(line)) {
          const headingText = line.replace(/^#+\s*/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').trim();
          if (/license|contributing|sponsors|credits|donate|setup|install/i.test(headingText)) {
            inFeatureSection = false;
            continue;
          }

          if (/feature|tool|command|function|control|component|key|hotkey|usage|module|gameplay|characteristic|operation|action|button|rule|tree|list|hash|graph|sort|huffman|algorithm|功能|特性|工具|按键|操作/i.test(headingText)) {
            inFeatureSection = true;
            currentCategory = headingText;

            // 标题本身也可以作为一个特征/操作分类
            if (headingText.length > 2 && headingText.length < 50) {
              const slug = headingText.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
              if (slug && !features.some((f) => f.id === `act_readme_${slug}`)) {
                features.push({
                  id: `act_readme_${slug}`,
                  tag: 'feature-module',
                  text: headingText,
                  selector: `[data-feature="${slug}"]`,
                  category: currentCategory,
                  action_hint: `Open and configure ${headingText}`,
                  source_loc: `${cand}:${i + 1}`,
                  is_readme_feature: true,
                });
              }
            }
            continue;
          }
        }

        if (inFeatureSection) {
          // 匹配列表条目
          const listMatch = line.match(/^[-*+]\s+(?:\[[ xX]\]\s+)?(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
          if (listMatch) {
            const rawItem = listMatch[1].trim();
            const cleanText = rawItem
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/`([^`]+)`/g, '$1')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/<[^>]*>/g, '')
              .trim();

            if (cleanText.length > 2 && cleanText.length < 120 && !cleanText.startsWith('http')) {
              const slug = cleanText
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 32);

              if (slug && !features.some((f) => f.id === `act_readme_${slug}`)) {
                features.push({
                  id: `act_readme_${slug}`,
                  tag: 'feature-action',
                  text: cleanText,
                  selector: `[data-feature="${slug}"]`,
                  category: currentCategory,
                  action_hint: `Execute ${cleanText}`,
                  source_loc: `${cand}:${i + 1}`,
                  is_readme_feature: true,
                });
              }
            }
          }

          // 匹配代码示例中的方法调用 (如 bst.insert(...), g.dijkstra(...), s.quickSort(...))
          const codeCallMatch = line.match(/(?:[a-zA-Z0-9_]+)\.([a-zA-Z0-9_]{3,30})\s*\(/);
          if (codeCallMatch) {
            const fnName = codeCallMatch[1];
            if (!/^(log|warn|error|info|assert|push|slice|indexOf|includes|forEach|map|filter)/i.test(fnName)) {
              const slug = fnName.toLowerCase();
              if (!features.some((f) => f.id === `act_fn_${slug}`)) {
                features.push({
                  id: `act_fn_${slug}`,
                  tag: 'api-call',
                  text: `${fnName}()`,
                  selector: `[data-api="${fnName}"]`,
                  category: currentCategory,
                  action_hint: `Call ${fnName}() in ${currentCategory}`,
                  source_loc: `${cand}:${i + 1}`,
                  is_readme_feature: true,
                });
              }
            }
          }
        }
      }

      if (features.length > 0) break;
    } catch (e) {}
  }

  return features;
}

/**
 * 自动递归扫描并提取项目多语言/i18n 字典（如 locales/zh-CN/translation.json 等）
 * @param {string} rootDir 项目根目录
 * @returns {{ primaryLang: string, terms: Record<string, string>, rawList: Array<{ key: string, val: string }> }}
 */
function extractI18nDictionary(rootDir = process.cwd()) {
  const possibleDirs = [
    'src/locales', 'locales', 'src/i18n', 'i18n', 'src/lang', 'lang', 'src/messages', 'messages',
    'locale', 'languages', 'app/i18n', 'app/locales'
  ].map((d) => path.join(rootDir, d));

  const terms = {};
  const rawList = [];
  let primaryLang = 'en';

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      const candidates = [
        'zh-CN/translation.json', 'zh-CN.json', 'zh/translation.json', 'zh.json',
        'en/translation.json', 'en.json', 'index.json', 'translation.json',
        'en.yaml', 'en.yml', 'zh-CN.yaml', 'zh-CN.yml'
      ];

      for (const cand of candidates) {
        const full = path.join(dir, cand);
        if (fs.existsSync(full)) {
          try {
            const fileContent = fs.readFileSync(full, 'utf8');
            let data = {};
            if (cand.endsWith('.json')) {
              data = JSON.parse(fileContent);
            }
            if (cand.includes('zh')) primaryLang = 'zh-CN';
            for (const [k, v] of Object.entries(data)) {
              if (typeof v === 'string' && v.trim()) {
                const cleanVal = v.replace(/<[^>]*>/g, '').trim();
                terms[k] = cleanVal;
                rawList.push({ key: k, val: cleanVal });
                if (rawList.length >= 80) break;
              }
            }
            if (rawList.length > 0) break;
          } catch (e) {}
        }
      }
      if (rawList.length > 0) break;
    }
  }

  return { primaryLang, terms, rawList };
}

/**
 * 提取 HTML Head / SEO 元信息（Title 与 Description）
 * @param {string} rootDir 项目根目录
 * @returns {{ title: string, description: string }}
 */
function extractHtmlHeadSummary(rootDir = process.cwd()) {
  const candidates = [
    'public/index.html', 'index.html', 'src/index.html',
    'freeciv-web/src/main/webapp/index.html', 'SpaceCadetPinball/emscripten_shell.html'
  ].map((f) => path.join(rootDir, f));

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const html = fs.readFileSync(p, 'utf8');
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
        return {
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descMatch ? descMatch[1].trim() : '',
        };
      } catch (e) {}
    }
  }
  return { title: '', description: '' };
}

/**
 * 清洗代码字符串，去除注释、import、CSS-in-JS 与复杂逻辑噪音
 * @param {string} rawCode 原始文件代码
 * @returns {string} 精简后的模板与文案字符串
 */
function cleanCode(rawCode) {
  return rawCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '')
    .replace(/const\s+.*?=\s*require\(.*?\);?/gm, '');
}

/**
 * 深度提取页面内的多维富文本文案：
 * 包含：H1~H6 标题、FAQ 折叠问答、套餐权益列表 (li)、卡片段落描述 (p)、Badge 标签
 * @param {string} code 清洗后的代码
 * @returns {{ headings: string[], faqs: Array<{ q: string, a?: string }>, feature_bullets: string[], descriptions: string[] }}
 */
function extractRichPageContent(code) {
  const headings = [];
  const faqs = [];
  const featureBullets = [];
  const descriptions = [];

  // 1. 提取 H1 到 H6 标题
  const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let match;
  while ((match = headingRegex.exec(code)) !== null) {
    const text = cleanTagContent(match[1]);
    if (text && text.length > 1 && text.length < 120 && !headings.includes(text)) {
      headings.push(text);
    }
  }

  // 2. 提取 FAQ 问答结构 (<details><summary> 或常见 FAQ 容器)
  const detailsRegex = /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  while ((match = detailsRegex.exec(code)) !== null) {
    const question = cleanTagContent(match[1]);
    const answer = cleanTagContent(match[2]);
    if (question && question.length > 2) {
      faqs.push({
        q: question,
        ...(answer ? { a: answer.slice(0, 150) } : {})
      });
    }
  }

  // 匹配 dt/dd 键值问答
  const dtRegex = /<dt[^>]*>([\s\S]*?)<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((match = dtRegex.exec(code)) !== null) {
    const q = cleanTagContent(match[1]);
    const a = cleanTagContent(match[2]);
    if (q && q.length > 2 && !faqs.some(f => f.q === q)) {
      faqs.push({ q, ...(a ? { a: a.slice(0, 150) } : {}) });
    }
  }

  // 3. 提取套餐权益与核心特性列表 (<li>)
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((match = liRegex.exec(code)) !== null) {
    const text = cleanTagContent(match[1]);
    if (text && text.length > 2 && text.length < 100 && !featureBullets.includes(text)) {
      featureBullets.push(text);
    }
  }

  // 4. 提取核心描述段落 (<p> 及含有 desc/title/text 类的元素)
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pRegex.exec(code)) !== null) {
    const text = cleanTagContent(match[1]);
    if (text && text.length > 5 && text.length < 200 && !descriptions.includes(text) && !headings.includes(text)) {
      descriptions.push(text);
    }
  }

  return {
    headings: headings.slice(0, 12),
    faqs: faqs.slice(0, 10),
    feature_bullets: featureBullets.slice(0, 15),
    descriptions: descriptions.slice(0, 8)
  };
}

const NATIVE_INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'details', 'summary', 'textarea']);
const CUSTOM_COMPONENT_PREFIXES = /^(c-|n-|el-|v-|ant-|van-|a-|t-|hopp|ui|custom|router-link|nuxtlink|localized)/i;
const CUSTOM_COMPONENT_NAME_KEYWORDS = /(?:button|btn|cta|submit|link|action|tab|item|menu|tool|card|switch|radio|checkbox|dropdown|select|picker|dialog|modal|icon)/i;

function cleanClassName(classStr) {
  if (!classStr) return '';
  return classStr
    .split(/\s+/)
    .filter((c) => c && !/^(css-|_[a-z0-9]{5,}|[a-z0-9]{8,})/i.test(c))
    .slice(0, 2)
    .join(' ');
}

function cleanTagContent(content) {
  if (!content) return '';
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateIdFromTextOrClass(text, classStr, tag, index) {
  if (text && typeof text === 'string') {
    const cleanText = text.replace(/[\r\n\t]+/g, ' ').trim();
    if (cleanText.length >= 1 && cleanText.length <= 50) {
      if (/[\u4e00-\u9fa5]/.test(cleanText)) {
        const hexToken = encodeURIComponent(cleanText)
          .replace(/%/g, '')
          .slice(0, 12)
          .toLowerCase();
        if (hexToken) return `btn_${hexToken}`;
      } else {
        const slug = cleanText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 28);
        if (slug && !/^(true|false|icon|button|action|item)$/i.test(slug)) return `btn_${slug}`;
      }
    }
  }

  if (classStr && typeof classStr === 'string') {
    const firstClass = classStr.split(' ')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    if (firstClass && !/^(btn|button|link|item|active|disabled)$/i.test(firstClass)) {
      return `btn_${firstClass.replace(/^btn_?/, '') ? firstClass : `btn_${firstClass}`}`;
    }
  }

  const cleanTag = (tag || 'element').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `btn_${cleanTag}_${index || 1}`;
}

/**
 * 健壮解析 HTML / Vue Template / Blade / Swig 模板中的所有交互控件与自定义组件
 * @param {string} templateCode 模板代码
 * @param {string} filePath 相对文件路径
 * @param {boolean} isVueSfc 是否为 Vue 单文件组件模板
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean }>}
 */
function extractHtmlOrTemplateElements(templateCode, filePath = '', isVueSfc = false) {
  const elements = [];
  let elementIndex = 1;

  // 正则匹配所有标签开标签：<tag attr1="val" ... > 或自闭合 <tag ... />
  const tagRegex = /<([a-zA-Z0-9_\-:]+)([\s\S]*?)(\/?>)/g;
  let match;

  while ((match = tagRegex.exec(templateCode)) !== null) {
    const rawTag = match[1];
    const rawAttrs = match[2];
    const tagEnd = match[3];
    const lowerTag = rawTag.toLowerCase();

    // 过滤无意义的容器标签
    if (['script', 'style', 'path', 'svg', 'g', 'polygon', 'circle', 'line', 'defs', 'clippath', 'head', 'meta', 'link'].includes(lowerTag)) {
      // 仅保留有交互属性的 link / a
      if (lowerTag === 'link' && !/@click|onclick|to=|href=/i.test(rawAttrs)) continue;
      if (lowerTag !== 'link') continue;
    }

    const isNative = NATIVE_INTERACTIVE_TAGS.has(lowerTag);
    const isCustomPrefix = CUSTOM_COMPONENT_PREFIXES.test(rawTag);
    const isCustomKeyword = CUSTOM_COMPONENT_NAME_KEYWORDS.test(rawTag);
    const hasClickEvent = /(@click|v-on:click|onclick|onpress|ontap|bindtap|@submit|v-on:submit|@change|v-on:change|@select)/i.test(rawAttrs);
    const hasInteractiveRole = /role=["'](button|link|tab|menuitem|option|switch|checkbox)["']/i.test(rawAttrs);
    const hasSubmitType = /type=["'](submit|button|reset)["']/i.test(rawAttrs);
    const hasHrefOrTo = /(?:href|to|:to)=["'][^"']+["']/i.test(rawAttrs);
    const hasClickClass = /class=["'][^"']*(?:btn|button|clickable|action-item|nav-item|menu-item)[^"']*["']/i.test(rawAttrs);

    if (!isNative && !isCustomPrefix && !isCustomKeyword && !hasClickEvent && !hasInteractiveRole && !hasSubmitType && !hasHrefOrTo && !hasClickClass) {
      continue;
    }

    // 提取属性
    const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
    const labelMatch = rawAttrs.match(/(?:data-shiplens-label|data-label|:label|label)=["']([^"']+)["']/i);
    const testIdMatch = rawAttrs.match(/(?:data-testid|data-test-id|testid)=["']([^"']+)["']/i);
    const classMatch = rawAttrs.match(/(?:class|className)=["']([^"']+)["']/i);
    const valueMatch = rawAttrs.match(/(?:value|:value|placeholder|title|aria-label)=["']([^"']+)["']/i);
    const toMatch = rawAttrs.match(/(?:to|:to|href)=["']([^"']+)["']/i);
    const clickHandlerMatch = rawAttrs.match(/(?:@click|v-on:click|onclick|onpress|@submit)=["']?\{?([^"'>}]+)\}?["']?/i);

    const rawId = idMatch ? idMatch[1] : null;
    const explicitLabel = labelMatch ? labelMatch[1] : null;
    const testId = testIdMatch ? testIdMatch[1] : null;
    const classStr = classMatch ? cleanClassName(classMatch[1]) : '';
    const hrefOrTo = toMatch ? toMatch[1] : '';
    const clickHandler = clickHandlerMatch ? clickHandlerMatch[1].trim() : '';

    // 提取标签内容文案（若非自闭合）
    let innerText = '';
    if (!tagEnd.startsWith('/>')) {
      const closeTag = `</${rawTag}>`;
      const closeIndex = templateCode.indexOf(closeTag, match.index + match[0].length);
      if (closeIndex !== -1 && closeIndex - match.index < 1500) {
        const body = templateCode.slice(match.index + match[0].length, closeIndex);
        innerText = cleanTagContent(body);
      }
    }

    const text = innerText || (valueMatch ? valueMatch[1].trim() : '') || explicitLabel || '';

    const stableId = explicitLabel
      || rawId
      || testId
      || generateIdFromTextOrClass(text, classStr, rawTag, elementIndex);

    const firstClass = classStr ? classStr.split(' ')[0] : '';
    const selector = rawId
      ? `#${rawId}`
      : firstClass
      ? `${lowerTag}.${firstClass}`
      : `${lowerTag}`;

    let actionHint = '';
    if (hrefOrTo) actionHint = `navigate to ${hrefOrTo}`;
    else if (clickHandler) actionHint = `calls ${clickHandler.replace(/[\r\n\t]+/g, ' ').slice(0, 40)}`;
    else if (hasSubmitType) actionHint = 'submit form';
    else if (text) actionHint = `trigger ${text}`;

    // 计算行号
    const line = templateCode.slice(0, match.index).split('\n').length;
    const sourceLoc = filePath ? `${filePath}:${line}` : `line ${line}`;

    elements.push({
      id: stableId,
      tag: lowerTag,
      text: text || '(图标/操作)',
      selector,
      ...(explicitLabel ? { label: explicitLabel } : {}),
      ...(actionHint ? { action_hint: actionHint } : {}),
      ...(sourceLoc ? { source_loc: sourceLoc } : {}),
      ...(!isNative ? { is_custom_component: true } : {}),
    });

    elementIndex += 1;
  }

  const seen = new Set();
  return elements.filter((el) => {
    if (seen.has(el.id)) return false;
    seen.add(el.id);
    return true;
  });
}

function getTagName(nameNode) {
  if (!nameNode) return '';
  if (t.isJSXIdentifier(nameNode)) return nameNode.name;
  if (t.isJSXMemberExpression(nameNode)) {
    return `${getTagName(nameNode.object)}.${nameNode.property.name}`;
  }
  if (t.isJSXNamespacedName(nameNode)) {
    return `${nameNode.namespace.name}:${nameNode.name.name}`;
  }
  return '';
}

function extractAttributeStringValue(valNode) {
  if (!valNode) return null;
  if (t.isStringLiteral(valNode)) return valNode.value;
  if (t.isJSXExpressionContainer(valNode)) {
    const expr = valNode.expression;
    if (t.isStringLiteral(expr)) return expr.value;
    if (t.isNumericLiteral(expr)) return String(expr.value);
    if (t.isTemplateLiteral(expr)) {
      return expr.quasis.map((q) => q.value.raw).join('');
    }
  }
  return null;
}

function extractHandlerDescription(valNode) {
  if (!valNode) return '';
  if (t.isJSXExpressionContainer(valNode)) {
    const expr = valNode.expression;
    if (t.isIdentifier(expr)) return `${expr.name}()`;
    if (t.isCallExpression(expr)) {
      if (t.isIdentifier(expr.callee)) return `${expr.callee.name}()`;
      if (t.isMemberExpression(expr.callee) && t.isIdentifier(expr.callee.property)) {
        return `${expr.callee.property.name}()`;
      }
      return 'function()';
    }
    if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
      return 'inline handler';
    }
  }
  return '';
}

function extractAttrs(attributes) {
  const result = {
    id: null,
    shiplensLabel: null,
    testId: null,
    href: null,
    to: null,
    type: null,
    role: null,
    className: null,
    clickHandler: null,
    hasClick: false,
    value: null,
    rel: null,
  };

  for (const attr of attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      const name = attr.name.name;
      const attrNameLower = name.toLowerCase();
      const valNode = attr.value;
      const strVal = extractAttributeStringValue(valNode);

      if (attrNameLower === 'id') result.id = strVal;
      else if (attrNameLower === 'data-shiplens-label' || attrNameLower === 'data-label') result.shiplensLabel = strVal;
      else if (attrNameLower === 'data-testid' || attrNameLower === 'data-test-id' || attrNameLower === 'testid') result.testId = strVal;
      else if (attrNameLower === 'href') result.href = strVal;
      else if (attrNameLower === 'to') result.to = strVal;
      else if (attrNameLower === 'type') result.type = strVal;
      else if (attrNameLower === 'role') result.role = strVal;
      else if (attrNameLower === 'class' || attrNameLower === 'classname') result.className = strVal;
      else if (attrNameLower === 'value' || attrNameLower === 'placeholder' || attrNameLower === 'title' || attrNameLower === 'aria-label') result.value = strVal;
      else if (attrNameLower === 'rel') result.rel = strVal;

      if (['onclick', '@click', 'v-on:click', 'onpress', 'ontap', 'bindtap', 'onselect', 'onsubmit', 'onchange'].includes(attrNameLower)) {
        result.hasClick = true;
        result.clickHandler = extractHandlerDescription(valNode);
      }
    }
  }

  return result;
}

function extractChildText(children) {
  const parts = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;
      if (t.isStringLiteral(expr)) {
        const text = expr.value.trim();
        if (text) parts.push(text);
      } else if (t.isNumericLiteral(expr)) {
        parts.push(String(expr.value));
      } else if (t.isTemplateLiteral(expr)) {
        const text = expr.quasis.map((q) => q.value.raw).join('').trim();
        if (text) parts.push(text);
      } else if (t.isConditionalExpression(expr)) {
        const consequent = t.isStringLiteral(expr.consequent) ? expr.consequent.value.trim() : '';
        const alternate = t.isStringLiteral(expr.alternate) ? expr.alternate.value.trim() : '';
        if (consequent || alternate) parts.push(consequent || alternate);
      }
    } else if (t.isJSXElement(child)) {
      const nested = extractChildText(child.children);
      if (nested) parts.push(nested);
    }
  }
  return parts.join(' ').trim();
}

/**
 * 基于 Babel AST 遍历提取 JSX/TSX 页面内所有的交互按钮、链接和提交控件
 * @param {string} code 源代码
 * @param {string} filePath 相对文件路径
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean }> | null}
 */
function extractInteractiveElementsAST(code, filePath = '') {
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'dynamicImport',
        'objectRestSpread',
        'optionalCatchBinding',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
      errorRecovery: true,
    });
  } catch (e) {
    return null;
  }

  const elements = [];
  let elementIndex = 1;

  traverse(ast, {
    JSXElement(pathNode) {
      const opening = pathNode.node.openingElement;
      const rawTagName = getTagName(opening.name);
      if (!rawTagName) return;

      const lowerTagName = rawTagName.toLowerCase();
      const isNative = NATIVE_INTERACTIVE_TAGS.has(lowerTagName);
      const isCustomPrefix = CUSTOM_COMPONENT_PREFIXES.test(rawTagName);
      const isCustomKeyword = CUSTOM_COMPONENT_NAME_KEYWORDS.test(rawTagName);

      const attrs = extractAttrs(opening.attributes);
      if (lowerTagName === 'link' && !attrs.hasClick && !attrs.to && (attrs.rel || !attrs.href || /^(stylesheet|icon|apple-touch-icon|mask-icon|manifest|preload)/i.test(attrs.rel || ''))) {
        return;
      }

      const isSubmit = attrs.type === 'submit';
      const isButtonRole = attrs.role === 'button' || attrs.role === 'link' || attrs.role === 'tab';

      if (!isNative && !isCustomPrefix && !isCustomKeyword && !attrs.hasClick && !isSubmit && !isButtonRole && !attrs.to && !attrs.href) {
        return;
      }

      const childText = extractChildText(pathNode.node.children);
      const text = childText || (attrs.value ? attrs.value : '');

      const stableId = attrs.shiplensLabel ||
        attrs.id ||
        attrs.testId ||
        generateIdFromTextOrClass(text, attrs.className || '', rawTagName, elementIndex);

      const cleanClass = cleanClassName(attrs.className);
      const firstClass = cleanClass ? cleanClass.split(' ')[0] : '';
      const selector = attrs.id
        ? `#${attrs.id}`
        : firstClass
        ? `${lowerTagName}.${firstClass}`
        : `${lowerTagName}`;

      let actionHint = '';
      if (attrs.href || attrs.to) actionHint = `navigate to ${attrs.href || attrs.to}`;
      else if (attrs.clickHandler) actionHint = `calls ${attrs.clickHandler}`;
      else if (isSubmit) actionHint = 'submit form';

      let sourceLoc = undefined;
      if (opening.loc) {
        const line = opening.loc.start.line;
        sourceLoc = filePath ? `${filePath}:${line}` : `line ${line}`;
      }

      elements.push({
        id: stableId,
        tag: lowerTagName,
        text: text || '(图标/无文案)',
        selector,
        ...(attrs.shiplensLabel ? { label: attrs.shiplensLabel } : {}),
        ...(actionHint ? { action_hint: actionHint } : {}),
        ...(sourceLoc ? { source_loc: sourceLoc } : {}),
        ...(!isNative ? { is_custom_component: true } : {}),
      });

      elementIndex += 1;
    },
  });

  const seenIds = new Set();
  return elements.filter((el) => {
    if (seenIds.has(el.id)) return false;
    seenIds.add(el.id);
    return true;
  });
}

/**
 * 针对纯 JS/TS 库、画布或游戏，提取键盘事件、操作控制与公开方法
 * @param {string} code JS/TS 代码
 * @param {string} filePath 相对文件路径
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, action_hint?: string, source_loc?: string }>}
 */
function extractJsActionElements(code, filePath = '') {
  const elements = [];
  let index = 1;

  // 1. 提取键盘按键监听 (如 addEventListener('keydown'), key == 38, case 'ArrowUp')
  const keyMatches = code.matchAll(/(?:case\s+['"]([a-zA-Z0-9_\-]+)['"]|case\s+(\d+)|addEventListener\(['"](keydown|keyup|click)['"])/g);
  for (const km of keyMatches) {
    const keyVal = km[1] || km[2] || km[3];
    const stableId = `key_${String(keyVal).toLowerCase()}_${index}`;
    elements.push({
      id: stableId,
      tag: 'key-listener',
      text: `Key Control [${keyVal}]`,
      selector: `[data-key="${keyVal}"]`,
      action_hint: `Trigger keyboard control ${keyVal}`,
      source_loc: filePath ? `${filePath}` : undefined,
    });
    index += 1;
    if (elements.length >= 10) break;
  }

  // 2. 提取核心方法声明 (函数、类方法、原型链、挂载方法)
  const fnMatches = code.matchAll(/(?:export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)|function\s+([A-Z][a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\.prototype\.([a-zA-Z0-9_]+)\s*=|this\.([a-zA-Z0-9_]+)\s*=\s*(?:function|\()|(?:async\s+)?([a-zA-Z0-9_]{3,30})\s*\([^)]*\)\s*\{)/g);
  for (const fm of fnMatches) {
    const fnName = fm[1] || fm[2] || fm[4] || fm[5] || fm[6];
    if (fnName && !/^(init|setup|render|constructor|get|set|if|for|while|switch|catch|function|return|import|export|_)/i.test(fnName) && fnName.length >= 3 && fnName.length <= 36) {
      const slug = fnName.toLowerCase();
      if (!elements.some((e) => e.id === `act_${slug}`)) {
        elements.push({
          id: `act_${slug}`,
          tag: 'js-action',
          text: `${fnName}()`,
          selector: `[data-action="${fnName}"]`,
          action_hint: `Invoke ${fnName}() method`,
          source_loc: filePath ? `${filePath}` : undefined,
        });
        if (elements.length >= 25) break;
      }
    }
  }

  const seen = new Set();
  return elements.filter((el) => {
    if (seen.has(el.id)) return false;
    seen.add(el.id);
    return true;
  });
}

/**
 * 提取页面内所有的交互按钮、链接和提交控件（主入口：Vue SFC -> JSX AST -> Template Regex -> JS Action）
 * @param {string} code 代码
 * @param {string} filePath 相对文件路径
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean }>}
 */
function extractInteractiveElements(code, filePath = '') {
  const ext = path.extname(filePath).toLowerCase();

  // 1. Vue 单文件组件 (.vue)
  if (ext === '.vue' || code.includes('<template>')) {
    const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
    const templateCode = templateMatch ? templateMatch[1] : code;
    const vueElements = extractHtmlOrTemplateElements(templateCode, filePath, true);
    if (vueElements.length > 0) return vueElements;
  }

  // 2. JSX / TSX 文件 (.tsx, .jsx, .js, .ts)
  if (ext === '.tsx' || ext === '.jsx' || ext === '.js' || ext === '.ts') {
    const astResult = extractInteractiveElementsAST(code, filePath);
    if (astResult && astResult.length > 0) {
      return astResult;
    }
  }

  // 3. HTML / PHP / Blade / Swig / Jinja 模板
  const templateElements = extractHtmlOrTemplateElements(code, filePath, false);
  if (templateElements.length > 0) {
    return templateElements;
  }

  // 4. 纯 JS 逻辑文件操作与事件
  if (ext === '.js' || ext === '.ts') {
    return extractJsActionElements(code, filePath);
  }

  return [];
}

/**
 * 完整解析一个页面的结构与富文本骨架（支持多组件文件聚合与 README 特征双向补偿）
 * @param {string} filePath 文件绝对路径
 * @param {string} routePath 对应路由
 * @param {string} pageName 页面候选名称
 * @param {string} rootDir 项目根目录
 * @param {string[]} componentFiles 关联组件文件列表
 * @returns {{ path: string, name: string, headings: string[], faqs: Array, feature_bullets: string[], descriptions: string[], raw_buttons: Array }}
 */
function extractPageSkeleton(filePath, routePath, pageName, rootDir = '', componentFiles = []) {
  const allFiles = [filePath, ...(componentFiles || [])].filter((f) => f && fs.existsSync(f));
  
  const allHeadings = [];
  const allFaqs = [];
  const allFeatureBullets = [];
  const allDescriptions = [];
  const allButtons = [];
  const seenButtonKeys = new Set();

  for (const targetFile of allFiles) {
    try {
      const rawCode = fs.readFileSync(targetFile, 'utf-8');
      const code = cleanCode(rawCode);
      const richContent = extractRichPageContent(code);
      const relFilePath = rootDir ? path.relative(rootDir, targetFile).replace(/\\/g, '/') : targetFile.replace(/\\/g, '/');
      const buttons = extractInteractiveElements(rawCode, relFilePath);

      for (const h of richContent.headings) {
        if (!allHeadings.includes(h)) allHeadings.push(h);
      }
      for (const f of richContent.faqs) {
        if (!allFaqs.some((existing) => existing.q === f.q)) allFaqs.push(f);
      }
      for (const b of richContent.feature_bullets) {
        if (!allFeatureBullets.includes(b)) allFeatureBullets.push(b);
      }
      for (const d of richContent.descriptions) {
        if (!allDescriptions.includes(d)) allDescriptions.push(d);
      }
      for (const btn of buttons) {
        const uniqueKey = `${btn.id}_${btn.text}_${btn.selector}`;
        if (!seenButtonKeys.has(uniqueKey)) {
          seenButtonKeys.add(uniqueKey);
          allButtons.push(btn);
        }
      }
    } catch (e) {}
  }

  // 双向混合补偿机制 (Hybrid Grounding & Zero-Blindspot Fallback):
  // 若当前页面或整体 AST 提取到的交互控件较少 (< 3 个)，自动将 README 结构化特征作为操作单元注入，彻底根治 0 控件！
  if (allButtons.length < 3 && rootDir) {
    const readmeFeatures = extractReadmeFeatures(rootDir);
    for (const rf of readmeFeatures) {
      const uniqueKey = `${rf.id}_${rf.text}`;
      if (!seenButtonKeys.has(uniqueKey)) {
        seenButtonKeys.add(uniqueKey);
        allButtons.push(rf);
      }
      if (allButtons.length >= 15) break;
    }
  }

  return {
    path: routePath,
    name: pageName,
    headings: allHeadings.slice(0, 12),
    faqs: allFaqs.slice(0, 10),
    feature_bullets: allFeatureBullets.slice(0, 15),
    descriptions: allDescriptions.slice(0, 8),
    raw_buttons: allButtons,
  };
}

/**
 * 汇总 5 层项目事实清单 (5-Layer Factsheet)
 * @param {string} rootDir 项目根目录
 * @returns {object}
 */
function extractProjectFactsheet(rootDir = process.cwd()) {
  const readme = extractReadmeSummary(rootDir);
  const readmeFeatures = extractReadmeFeatures(rootDir);
  const i18n = extractI18nDictionary(rootDir);
  const htmlHead = extractHtmlHeadSummary(rootDir);

  let pkg = {};
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (e) {}
  }

  return {
    name: pkg.name || path.basename(rootDir),
    description: pkg.description || readme.description || htmlHead.description || '',
    keywords: Array.isArray(pkg.keywords) ? pkg.keywords : [],
    dependencies: Object.assign({}, pkg.dependencies, pkg.devDependencies),
    readme,
    readmeFeatures,
    i18n,
    htmlHead,
  };
}

module.exports = {
  cleanCode,
  extractReadmeSummary,
  extractReadmeFeatures,
  extractI18nDictionary,
  extractHtmlHeadSummary,
  extractProjectFactsheet,
  extractRichPageContent,
  extractInteractiveElementsAST,
  extractHtmlOrTemplateElements,
  extractJsActionElements,
  extractInteractiveElements,
  extractPageSkeleton,
  generateIdFromTextOrClass,
};


