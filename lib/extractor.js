const fs = require('fs');

/**
 * 清洗代码字符串，去除注释、import、CSS-in-JS 与复杂逻辑噪音
 * @param {string} rawCode 原始文件代码
 * @returns {string} 精简后的模板与文案字符串
 */
function cleanCode(rawCode) {
  return rawCode
    // 移除多行注释与 JSDoc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除单行注释
    .replace(/\/\/.*$/gm, '')
    // 移除 import 语句
    .replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '')
    // 移除 require 语句
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
    headings: headings.slice(0, 8),
    faqs: faqs.slice(0, 10),
    feature_bullets: featureBullets.slice(0, 12),
    descriptions: descriptions.slice(0, 6)
  };
}

/**
 * 提取页面内所有的交互按钮、链接和提交控件
 * 采用状态机/匹配法准确跳过 JSX 属性中的 arrow function `() =>` 和花括号
 * @param {string} code 清洗后的代码
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string }>}
 */
function extractInteractiveElements(code) {
  const elements = [];
  let elementIndex = 1;

  // 匹配所有 <button, <a, <Link, <input, <div, <span 开头的标签
  const tagStartRegex = /<([a-zA-Z0-9_-]+)\s+/g;
  let match;

  while ((match = tagStartRegex.exec(code)) !== null) {
    const tag = match[1];
    const targetTags = ['button', 'a', 'link', 'input', 'div', 'span'];
    if (!targetTags.includes(tag.toLowerCase())) {
      continue;
    }

    const startIndex = match.index;
    let index = startIndex + match[0].length;
    let inQuotes = null;
    let braceDepth = 0;
    let isSelfClosing = false;
    let tagEndIndex = -1;

    // 解析属性直到遇到真正的 '>'
    while (index < code.length) {
      const char = code[index];
      const prevChar = code[index - 1];

      if (inQuotes) {
        if (char === inQuotes && prevChar !== '\\') {
          inQuotes = null;
        }
      } else if (char === '"' || char === "'" || char === '`') {
        inQuotes = char;
      } else if (char === '{') {
        braceDepth += 1;
      } else if (char === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (char === '>' && braceDepth === 0) {
        tagEndIndex = index;
        if (code[index - 1] === '/') {
          isSelfClosing = true;
        }
        break;
      }
      index += 1;
    }

    if (tagEndIndex === -1) continue;

    const attrs = code.slice(startIndex + tag.length + 1, tagEndIndex);
    let innerContent = '';

    if (!isSelfClosing) {
      // 寻找对应的闭合标签 </tag>
      const closeTagStr = `</${tag}>`;
      const closeTagIndex = code.indexOf(closeTagStr, tagEndIndex + 1);
      if (closeTagIndex !== -1 && closeTagIndex - tagEndIndex < 2000) {
        innerContent = code.slice(tagEndIndex + 1, closeTagIndex);
      }
    }

    // 判断是否可交互
    const isExplicitButton = /^(button|a|link)$/i.test(tag);
    const hasClick = /onClick|@click|v-on:click|role=["']button["']/i.test(attrs);
    const isSubmit = /type=["']submit["']/i.test(attrs);

    if (!isExplicitButton && !hasClick && !isSubmit) {
      continue;
    }

    // 提取 id
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const rawId = idMatch ? idMatch[1] : null;

    // 提取 data-shiplens-label
    const labelMatch = attrs.match(/data-shiplens-label=["']([^"']+)["']/i);
    const explicitLabel = labelMatch ? labelMatch[1] : null;

    // 提取 class/className
    const classMatch = attrs.match(/(?:class|className)=["']([^"']+)["']/i);
    const classStr = classMatch ? cleanClassName(classMatch[1]) : '';

    // 提取文案
    const text = cleanTagContent(innerContent) || extractInputValue(attrs);

    // 提取 href / to / onClick 提示
    const hrefMatch = attrs.match(/(?:href|to)=["']([^"']+)["']/i);
    const href = hrefMatch ? hrefMatch[1] : '';

    const clickMatch = attrs.match(/(?:onClick|@click)=["']?\{?([^"'>}]+)\}?["']?/i);
    const clickHandler = clickMatch ? clickMatch[1].trim() : '';

    // 生成稳定 ID
    const stableId = explicitLabel 
      || rawId 
      || generateIdFromTextOrClass(text, classStr, tag, elementIndex);

    // 生成可读 CSS 选择器
    const selector = rawId 
      ? `#${rawId}` 
      : classStr 
      ? `${tag.toLowerCase()}.${classStr.split(' ')[0]}` 
      : `${tag.toLowerCase()}`;

    // 动作推断线索
    let actionHint = '';
    if (href) actionHint = `navigate to ${href}`;
    else if (clickHandler) actionHint = `calls ${clickHandler}`;
    else if (isSubmit) actionHint = 'submit form';

    elements.push({
      id: stableId,
      tag: tag.toLowerCase(),
      text: text || '(图标/无文案)',
      selector: selector,
      ...(explicitLabel ? { label: explicitLabel } : {}),
      ...(actionHint ? { action_hint: actionHint } : {})
    });

    elementIndex += 1;
  }

  // 去重保底（相同 id 保留第一个）
  const seenIds = new Set();
  return elements.filter(el => {
    if (seenIds.has(el.id)) return false;
    seenIds.add(el.id);
    return true;
  });
}

function cleanTagContent(content) {
  if (!content) return '';
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractInputValue(attrs) {
  const match = attrs.match(/value=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function cleanClassName(classStr) {
  if (!classStr) return '';
  return classStr
    .split(/\s+/)
    .filter(c => c && !/^(css-|_[a-z0-9]{5,}|[a-z0-9]{8,})/i.test(c))
    .slice(0, 2)
    .join(' ');
}

function generateIdFromTextOrClass(text, classStr, tag, index) {
  if (text && text.length >= 2 && text.length <= 30 && /^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(text)) {
    const slug = text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[\u4e00-\u9fa5]+/g, (match) => `btn_${encodeURIComponent(match).replace(/%/g, '').slice(0, 8)}`)
      .replace(/[^a-zA-Z0-9_]/g, '');
    if (slug) return `btn_${slug.slice(0, 20)}`;
  }

  if (classStr) {
    const firstClass = classStr.split(' ')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    if (firstClass) return `btn_${firstClass}`;
  }

  return `btn_${tag.toLowerCase()}_${index}`;
}

/**
 * 完整解析一个页面的结构与富文本骨架
 * @param {string} filePath 文件路径
 * @param {string} routePath 对应路由
 * @param {string} pageName 页面候选名称
 * @returns {{ path: string, name: string, headings: string[], faqs: Array, feature_bullets: string[], descriptions: string[], raw_buttons: Array }}
 */
function extractPageSkeleton(filePath, routePath, pageName) {
  if (!fs.existsSync(filePath)) {
    return { path: routePath, name: pageName, headings: [], faqs: [], feature_bullets: [], descriptions: [], raw_buttons: [] };
  }

  const rawCode = fs.readFileSync(filePath, 'utf-8');
  const code = cleanCode(rawCode);
  const richContent = extractRichPageContent(code);
  const rawButtons = extractInteractiveElements(code);

  return {
    path: routePath,
    name: pageName,
    ...richContent,
    raw_buttons: rawButtons
  };
}

module.exports = {
  cleanCode,
  extractRichPageContent,
  extractInteractiveElements,
  extractPageSkeleton
};
