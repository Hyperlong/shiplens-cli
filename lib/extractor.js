const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default || require('@babel/traverse');
const t = require('@babel/types');

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

const NATIVE_BUTTON_TAGS = new Set(['button', 'a', 'input']);
const CUSTOM_BUTTON_PATTERN = /^(?:.*Button|.*Btn|.*CTA|.*Submit|.*Link|Link|Button|CTA|Submit)$/i;

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
    if (t.isIdentifier(expr)) return expr.name;
    if (t.isCallExpression(expr)) {
      if (t.isIdentifier(expr.callee)) return `${expr.callee.name}()`;
      if (t.isMemberExpression(expr.callee) && t.isIdentifier(expr.callee.property)) {
        return `${expr.callee.property.name}()`;
      }
      return 'function()';
    }
    if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
      if (t.isCallExpression(expr.body)) {
        if (t.isIdentifier(expr.body.callee)) return `${expr.body.callee.name}()`;
        if (t.isMemberExpression(expr.body.callee) && t.isIdentifier(expr.body.callee.property)) {
          return `${expr.body.callee.property.name}()`;
        }
      }
      if (t.isBlockStatement(expr.body) && expr.body.body.length > 0) {
        const firstStmt = expr.body.body[0];
        if (t.isExpressionStatement(firstStmt) && t.isCallExpression(firstStmt.expression)) {
          const call = firstStmt.expression;
          if (t.isIdentifier(call.callee)) return `${call.callee.name}()`;
          if (t.isMemberExpression(call.callee) && t.isIdentifier(call.callee.property)) {
            return `${call.callee.property.name}()`;
          }
        }
      }
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

      if (attrNameLower === 'id') {
        result.id = strVal;
      } else if (attrNameLower === 'data-shiplens-label' || attrNameLower === 'data-label') {
        result.shiplensLabel = strVal;
      } else if (attrNameLower === 'data-testid' || attrNameLower === 'data-test-id' || attrNameLower === 'testid') {
        result.testId = strVal;
      } else if (attrNameLower === 'href') {
        result.href = strVal;
      } else if (attrNameLower === 'to') {
        result.to = strVal;
      } else if (attrNameLower === 'type') {
        result.type = strVal;
      } else if (attrNameLower === 'role') {
        result.role = strVal;
      } else if (attrNameLower === 'class' || attrNameLower === 'classname') {
        result.className = strVal;
      } else if (attrNameLower === 'value') {
        result.value = strVal;
      } else if (attrNameLower === 'rel') {
        result.rel = strVal;
      }

      if (['onclick', '@click', 'v-on:click', 'onpress', 'ontap', 'bindtap'].includes(attrNameLower)) {
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
        if (consequent && alternate) {
          parts.push(`${consequent} / ${alternate}`);
        } else if (consequent || alternate) {
          parts.push(consequent || alternate);
        } else {
          parts.push('{conditional}');
        }
      }
    } else if (t.isJSXElement(child)) {
      const nested = extractChildText(child.children);
      if (nested) parts.push(nested);
    }
  }

  return parts.join(' ').trim();
}

function inferActionHint(attrs) {
  const target = attrs.href || attrs.to;
  if (target) return `navigate to ${target}`;
  if (attrs.clickHandler) return `calls ${attrs.clickHandler}`;
  if (attrs.type === 'submit') return 'submit form';
  return '';
}

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
    .replace(/\s+/g, ' ')
    .trim();
}

function extractInputValue(attrs) {
  const match = attrs.match(/value=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
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
          .slice(0, 24);
        if (slug) return `btn_${slug}`;
      }
    }
  }

  if (classStr && typeof classStr === 'string') {
    const firstClass = classStr.split(' ')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    if (firstClass) return `btn_${firstClass.replace(/^btn_?/, '') ? firstClass : `btn_${firstClass}`}`;
  }

  return `btn_${(tag || 'element').toLowerCase()}_${index || 1}`;
}

/**
 * 基于 Babel AST 遍历提取页面内所有的交互按钮、链接和提交控件
 * @param {string} code 源代码
 * @param {string} filePath 相对文件路径（用于 source_loc）
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
      const isNative = NATIVE_BUTTON_TAGS.has(lowerTagName);
      const isCustom = CUSTOM_BUTTON_PATTERN.test(rawTagName);

      // 过滤 HTML head 中的 link 标签 (如 <link rel="stylesheet" />)
      const attrs = extractAttrs(opening.attributes);
      if (lowerTagName === 'link' && attrs.rel && !attrs.href && !attrs.to && !attrs.hasClick) {
        return;
      }

      const isSubmit = attrs.type === 'submit';
      const isButtonRole = attrs.role === 'button' || attrs.role === 'link';

      if (!isNative && !isCustom && !attrs.hasClick && !isSubmit && !isButtonRole) {
        return;
      }

      const childText = extractChildText(pathNode.node.children);
      const text = childText || (attrs.value ? attrs.value : '');

      const stableId =
        attrs.shiplensLabel ||
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

      const actionHint = inferActionHint(attrs);

      let sourceLoc = undefined;
      if (opening.loc) {
        const line = opening.loc.start.line;
        sourceLoc = filePath ? `${filePath}:${line}` : `line ${line}`;
      }

      elements.push({
        id: stableId,
        tag: lowerTagName,
        text: text || '(图标/无文案)',
        selector: selector,
        ...(attrs.shiplensLabel ? { label: attrs.shiplensLabel } : {}),
        ...(actionHint ? { action_hint: actionHint } : {}),
        ...(sourceLoc ? { source_loc: sourceLoc } : {}),
        ...(isCustom && !isNative ? { is_custom_component: true } : {}),
      });

      elementIndex += 1;
    },
  });

  // 去重保底（相同 id 保留第一个）
  const seenIds = new Set();
  return elements.filter((el) => {
    if (seenIds.has(el.id)) return false;
    seenIds.add(el.id);
    return true;
  });
}

/**
 * 正则状态机提取按钮（AST 解析异常时的平滑降级保底）
 * @param {string} code 清洗后的代码
 * @param {string} filePath 相对文件路径
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string }>}
 */
function extractInteractiveElementsRegex(code, filePath = '') {
  const elements = [];
  let elementIndex = 1;

  // 匹配所有 <button, <a, <Link, <input, <div, <span 开头的标签
  const tagStartRegex = /<([a-zA-Z0-9_\-]+)(?:\s+|>)/g;
  let match;

  while ((match = tagStartRegex.exec(code)) !== null) {
    const tag = match[1];
    const targetTags = ['button', 'a', 'link', 'input', 'div', 'span'];
    const isTargetTag = targetTags.includes(tag.toLowerCase()) || CUSTOM_BUTTON_PATTERN.test(tag);
    if (!isTargetTag) {
      continue;
    }

    const startIndex = match.index;
    let index = startIndex + tag.length + 1;
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
      const closeTagStr = `</${tag}>`;
      const closeTagIndex = code.indexOf(closeTagStr, tagEndIndex + 1);
      if (closeTagIndex !== -1 && closeTagIndex - tagEndIndex < 2000) {
        innerContent = code.slice(tagEndIndex + 1, closeTagIndex);
      }
    }

    const isExplicitButton = /^(button|a|link)$/i.test(tag) || CUSTOM_BUTTON_PATTERN.test(tag);
    const hasClick = /onClick|@click|v-on:click|onPress|role=["']button["']/i.test(attrs);
    const isSubmit = /type=["']submit["']/i.test(attrs);

    if (!isExplicitButton && !hasClick && !isSubmit) {
      continue;
    }

    // 过滤 HTML head 中的 link 标签
    if (tag.toLowerCase() === 'link' && /rel=["'](?:stylesheet|icon|preload|manifest)["']/i.test(attrs)) {
      continue;
    }

    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const rawId = idMatch ? idMatch[1] : null;

    const labelMatch = attrs.match(/data-shiplens-label=["']([^"']+)["']/i);
    const explicitLabel = labelMatch ? labelMatch[1] : null;

    const testIdMatch = attrs.match(/data-testid=["']([^"']+)["']/i);
    const testId = testIdMatch ? testIdMatch[1] : null;

    const classMatch = attrs.match(/(?:class|className)=["']([^"']+)["']/i);
    const classStr = classMatch ? cleanClassName(classMatch[1]) : '';

    const text = cleanTagContent(innerContent) || extractInputValue(attrs);

    const hrefMatch = attrs.match(/(?:href|to)=["']([^"']+)["']/i);
    const href = hrefMatch ? hrefMatch[1] : '';

    const clickMatch = attrs.match(/(?:onClick|@click|onPress)=["']?\{?([^"'>}]+)\}?["']?/i);
    const clickHandler = clickMatch ? clickMatch[1].trim() : '';

    const stableId = explicitLabel 
      || rawId 
      || testId
      || generateIdFromTextOrClass(text, classStr, tag, elementIndex);

    const selector = rawId 
      ? `#${rawId}` 
      : classStr 
      ? `${tag.toLowerCase()}.${classStr.split(' ')[0]}` 
      : `${tag.toLowerCase()}`;

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

  const seenIds = new Set();
  return elements.filter((el) => {
    if (seenIds.has(el.id)) return false;
    seenIds.add(el.id);
    return true;
  });
}

/**
 * 提取页面内所有的交互按钮、链接和提交控件（入口函数：优先 AST，降级正则）
 * @param {string} code 代码
 * @param {string} filePath 相对文件路径
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean }>}
 */
function extractInteractiveElements(code, filePath = '') {
  try {
    const astResult = extractInteractiveElementsAST(code, filePath);
    if (astResult !== null && astResult.length >= 0) {
      return astResult;
    }
  } catch (e) {
    // 降级兜底
  }
  return extractInteractiveElementsRegex(code, filePath);
}

/**
 * 完整解析一个页面的结构与富文本骨架
 * @param {string} filePath 文件绝对路径
 * @param {string} routePath 对应路由
 * @param {string} pageName 页面候选名称
 * @param {string} rootDir 项目根目录（用于计算相对 source_loc）
 * @returns {{ path: string, name: string, headings: string[], faqs: Array, feature_bullets: string[], descriptions: string[], raw_buttons: Array }}
 */
function extractPageSkeleton(filePath, routePath, pageName, rootDir = '') {
  if (!fs.existsSync(filePath)) {
    return { path: routePath, name: pageName, headings: [], faqs: [], feature_bullets: [], descriptions: [], raw_buttons: [] };
  }

  const rawCode = fs.readFileSync(filePath, 'utf-8');
  const code = cleanCode(rawCode);
  const richContent = extractRichPageContent(code);
  const relFilePath = rootDir ? path.relative(rootDir, filePath).replace(/\\/g, '/') : filePath.replace(/\\/g, '/');
  const rawButtons = extractInteractiveElements(rawCode, relFilePath);

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
  extractInteractiveElementsAST,
  extractInteractiveElementsRegex,
  extractInteractiveElements,
  extractPageSkeleton,
  generateIdFromTextOrClass
};

