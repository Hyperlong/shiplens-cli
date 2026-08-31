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

const NATIVE_INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'select', 'details', 'summary', 'textarea', 'option']);
const CUSTOM_COMPONENT_PREFIXES = /^(c-|n-|el-|v-|ant-|van-|a-|t-|hopp|ui|custom|router-link|nuxtlink|localized)/i;
const CUSTOM_COMPONENT_NAME_KEYWORDS = /(?:button|btn|cta|submit|link|action|tab|item|menu|tool|card|switch|radio|checkbox|dropdown|select|picker|dialog|modal|icon|row|cell|chip|badge|avatar|nav)/i;

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
    const cleanText = text.replace(/\[State:[^\]]+\]/g, '').replace(/[\r\n\t]+/g, ' ').trim();
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
 * 遍历 AST 提取对象/数组配置字面量中的交互操作、工具箱定义、数据表格操作列与菜单定义 (Milestone 1: Schema Unrolling)
 * @param {object} ast Babel AST
 * @param {string} filePath 相对文件路径
 * @param {string} code 源代码
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean, is_schema_action?: boolean }>}
 */
function extractSchemaActionLiterals(ast, filePath = '', code = '') {
  if (!ast) return [];
  const actions = [];
  let actionIndex = 1;

  function processObjectAction(objNode, varName = '') {
    if (!t.isObjectExpression(objNode)) return;

    let label = '';
    let title = '';
    let name = '';
    let text = '';
    let key = '';
    let id = '';
    let action = '';
    let handler = '';
    let icon = '';
    let tooltip = '';
    let to = '';
    let pathProp = '';
    let href = '';
    let command = '';
    let shortcut = '';

    for (const prop of objNode.properties) {
      if (!t.isObjectProperty(prop)) continue;
      const keyName = t.isIdentifier(prop.key) ? prop.key.name : (t.isStringLiteral(prop.key) ? prop.key.value : '');
      if (!keyName) continue;
      const kLower = keyName.toLowerCase();
      const valNode = prop.value;

      let strVal = '';
      if (t.isStringLiteral(valNode)) strVal = valNode.value;
      else if (t.isTemplateLiteral(valNode)) strVal = valNode.quasis.map((q) => q.value.raw).join('');
      else if (t.isIdentifier(valNode)) strVal = valNode.name;
      else if (t.isNumericLiteral(valNode)) strVal = String(valNode.value);
      else if (t.isCallExpression(valNode) && valNode.arguments.length > 0) {
        const firstArg = valNode.arguments[0];
        if (t.isStringLiteral(firstArg)) {
          strVal = firstArg.value.replace(/^[^.]+\./, '').replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }

      if (kLower === 'label' || kLower === 'displayname' || kLower === 'labelzh' || kLower === 'labelen') label = strVal;
      else if (kLower === 'title' || kLower === 'header' || kLower === 'caption') title = strVal;
      else if (kLower === 'name') name = strVal;
      else if (kLower === 'text') text = strVal;
      else if (kLower === 'key') key = strVal;
      else if (kLower === 'id') id = strVal;
      else if (kLower === 'action' || kLower === 'actionname' || kLower === 'operation') action = strVal;
      else if (kLower === 'handler' || kLower === 'onclick' || kLower === 'onselect' || kLower === 'perform' || kLower === 'execute' || kLower === 'callback') {
        handler = strVal || (t.isFunction(valNode) ? 'inlineFunction' : '');
      }
      else if (kLower === 'icon' || kLower === 'iconname') icon = strVal;
      else if (kLower === 'tooltip' || kLower === 'arialabel' || kLower === 'description') tooltip = strVal;
      else if (kLower === 'to') to = strVal;
      else if (kLower === 'path' || kLower === 'route') pathProp = strVal;
      else if (kLower === 'href' || kLower === 'url') href = strVal;
      else if (kLower === 'command') command = strVal;
      else if (kLower === 'shortcut' || kLower === 'hotkey') shortcut = strVal;
    }

    const actionText = label || title || text || tooltip || name || key || action || command;
    if (!actionText || typeof actionText !== 'string' || actionText.length > 80 || actionText.length < 1) return;
    if (/^(string|number|boolean|object|array|any|default|true|false|null|undefined|auto)$/i.test(actionText)) return;

    const isActionArrayContext = /action|tool|btn|button|menu|tab|column|command|operation|step|filter|nav|item|shortcut|quick|link|version|mode|option/i.test(varName);
    const hasInteractiveProp = Boolean(action || handler || to || pathProp || href || command || shortcut || icon || (key && (label || title || text)));

    if (isActionArrayContext || hasInteractiveProp) {
      const stableKey = key || id || action || name || actionText;
      const stableId = generateIdFromTextOrClass(actionText, '', 'act_schema', actionIndex);
      const line = objNode.loc ? objNode.loc.start.line : 1;
      const sourceLoc = filePath ? `${filePath}:${line}` : `line ${line}`;

      let actionHint = '';
      if (to || pathProp || href) actionHint = `navigate to ${to || pathProp || href}`;
      else if (handler || action || command) actionHint = `execute ${handler || action || command}()`;
      else actionHint = `trigger schema action: ${actionText}`;

      const selector = stableKey ? `[data-action="${stableKey.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}"]` : `[data-schema-action="${actionIndex}"]`;

      actions.push({
        id: stableId,
        tag: 'schema-action',
        text: actionText,
        selector,
        action_hint: actionHint,
        source_loc: sourceLoc,
        is_custom_component: true,
        is_schema_action: true,
      });
      actionIndex += 1;
    }
  }

  traverse(ast, {
    VariableDeclarator(pathNode) {
      const varName = t.isIdentifier(pathNode.node.id) ? pathNode.node.id.name : '';
      const init = pathNode.node.init;
      if (init && t.isArrayExpression(init)) {
        for (const elem of init.elements) {
          if (elem && t.isObjectExpression(elem)) {
            processObjectAction(elem, varName);
          } else if (elem && t.isStringLiteral(elem)) {
            if (/version|option|type|mode|tab|button|tool|category|filter|status|genre/i.test(varName) && elem.value.length > 0 && elem.value.length < 40) {
              const optText = `${varName}: ${elem.value}`;
              const stableId = generateIdFromTextOrClass(optText, '', 'act_opt', actionIndex);
              const line = elem.loc ? elem.loc.start.line : 1;
              actions.push({
                id: stableId,
                tag: 'schema-option',
                text: optText,
                selector: `[data-option="${elem.value.toLowerCase()}"]`,
                action_hint: `Select option: ${elem.value}`,
                source_loc: filePath ? `${filePath}:${line}` : `line ${line}`,
                is_custom_component: true,
                is_schema_action: true,
              });
              actionIndex += 1;
            }
          }
        }
      } else if (init && t.isObjectExpression(init)) {
        if (/actions|tools|commands|menus|toolbar|options/i.test(varName)) {
          for (const prop of init.properties) {
            if (t.isObjectProperty(prop)) {
              if (t.isObjectExpression(prop.value)) {
                processObjectAction(prop.value, varName);
              } else if (t.isStringLiteral(prop.value)) {
                const optKey = t.isIdentifier(prop.key) ? prop.key.name : (t.isStringLiteral(prop.key) ? prop.key.value : '');
                if (optKey && optKey.length < 40) {
                  const optText = `${optKey}: ${prop.value.slice(0, 30)}`;
                  const stableId = generateIdFromTextOrClass(optKey, '', 'act_opt', actionIndex);
                  actions.push({
                    id: stableId,
                    tag: 'schema-option',
                    text: optKey,
                    selector: `[data-option="${optKey.toLowerCase()}"]`,
                    action_hint: `Select option: ${optKey}`,
                    source_loc: filePath ? `${filePath}` : undefined,
                    is_custom_component: true,
                    is_schema_action: true,
                  });
                  actionIndex += 1;
                }
              }
            }
          }
        }
      }
    },
    AssignmentExpression(pathNode) {
      let varName = '';
      if (t.isIdentifier(pathNode.node.left)) varName = pathNode.node.left.name;
      else if (t.isMemberExpression(pathNode.node.left) && t.isIdentifier(pathNode.node.left.property)) {
        varName = pathNode.node.left.property.name;
      }
      const right = pathNode.node.right;
      if (right && t.isArrayExpression(right)) {
        for (const elem of right.elements) {
          if (elem && t.isObjectExpression(elem)) {
            processObjectAction(elem, varName);
          }
        }
      }
    },
    ObjectProperty(pathNode) {
      const keyName = t.isIdentifier(pathNode.node.key) ? pathNode.node.key.name : (t.isStringLiteral(pathNode.node.key) ? pathNode.node.key.value : '');
      if (/actions|tools|columns|buttons|items|menu|toolbar|options|steps|commands|navItems/i.test(keyName)) {
        const val = pathNode.node.value;
        if (val && t.isArrayExpression(val)) {
          for (const elem of val.elements) {
            if (elem && t.isObjectExpression(elem)) {
              processObjectAction(elem, keyName);
            }
          }
        }
      }
    },
    CallExpression(pathNode) {
      const callee = pathNode.node.callee;
      let fnName = '';
      if (t.isIdentifier(callee)) fnName = callee.name;
      else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) fnName = callee.property.name;

      if (/registerAction|createAction|defineAction|defineCommand|registerCommand|defineTool|addTool|createColumn/i.test(fnName)) {
        for (const arg of pathNode.node.arguments) {
          if (t.isObjectExpression(arg)) {
            processObjectAction(arg, fnName);
          }
        }
      }
    }
  });

  const seen = new Set();
  return actions.filter((a) => {
    const k = `${a.id}_${a.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * 健壮解析 HTML / Vue Template / Blade / Swig 模板中的所有交互控件与自定义组件 (Milestone 2 通用感应 + Milestone 3 双态裂变)
 * @param {string} templateCode 模板代码
 * @param {string} filePath 相对文件路径
 * @param {boolean} isVueSfc 是否为 Vue 单文件组件模板
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean }>}
 */
function extractHtmlOrTemplateElements(templateCode, filePath = '', isVueSfc = false) {
  const elements = [];
  let elementIndex = 1;

  const POINTER_CLASS_PATTERN = /(cursor-pointer|cursor_pointer|clickable|action-item|nav-item|menu-item|btn|button|cta|item-clickable|pointer)/i;
  const EVENT_ATTR_REGEX = /(@click|v-on:click|@mousedown|@mouseup|@dblclick|@keydown|@keyup|@keypress|@touchstart|@touchend|@submit|v-on:submit|@change|v-on:change|@select|onclick|onmousedown|onmouseup|ondblclick|onkeydown|onkeyup|onkeypress|bindtap|catchtap|\(click\)|wire:click|x-on:click|hx-get|hx-post|data-action)/i;
  const ROLE_INTERACTIVE_REGEX = /role=["'](button|link|tab|menuitem|menuitemcheckbox|menuitemradio|checkbox|switch|option|treeitem|gridcell|radio|tablist|menu|toolbar|combobox|searchbox)["']/i;

  // 正则匹配所有标签开标签：<tag attr1="val" ... > 或自闭合 <tag ... />
  const tagRegex = /<([a-zA-Z0-9_\-:]+)([\s\S]*?)(\/?>)/g;
  let match;

  while ((match = tagRegex.exec(templateCode)) !== null) {
    const rawTag = match[1];
    const rawAttrs = match[2];
    const tagEnd = match[3];
    const lowerTag = rawTag.toLowerCase();

    // 过滤无意义的容器与元标签
    if (['script', 'style', 'head', 'meta'].includes(lowerTag)) {
      continue;
    }
    if (lowerTag === 'link' && !/@click|onclick|to=|href=/i.test(rawAttrs)) continue;

    const isNative = NATIVE_INTERACTIVE_TAGS.has(lowerTag);
    const isCustomPrefix = CUSTOM_COMPONENT_PREFIXES.test(rawTag);
    const isCustomKeyword = CUSTOM_COMPONENT_NAME_KEYWORDS.test(rawTag);
    const hasClickEvent = EVENT_ATTR_REGEX.test(rawAttrs);
    const hasInteractiveRole = ROLE_INTERACTIVE_REGEX.test(rawAttrs);
    const hasSubmitType = /type=["'](submit|button|reset)["']/i.test(rawAttrs);
    const hasHrefOrTo = /(?:href|to|:to)=["'][^"']+["']/i.test(rawAttrs);
    const hasClickClass = POINTER_CLASS_PATTERN.test(rawAttrs);

    // Universal Event Surface: 全元素通用感应
    if (!isNative && !isCustomPrefix && !isCustomKeyword && !hasClickEvent && !hasInteractiveRole && !hasSubmitType && !hasHrefOrTo && !hasClickClass) {
      continue;
    }

    // 提取属性
    const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
    const labelMatch = rawAttrs.match(/(?:data-shiplens-label|data-label|:label|label)=["']([^"']+)["']/i);
    const testIdMatch = rawAttrs.match(/(?:data-testid|data-test-id|testid)=["']([^"']+)["']/i);
    const classMatch = rawAttrs.match(/(?:class|className|:class)=["']([^"']+)["']/i);
    const valueMatch = rawAttrs.match(/(?:value|:value|placeholder|title|aria-label|alt)=["']([^"']+)["']/i);
    const toMatch = rawAttrs.match(/(?:to|:to|href)=["']([^"']+)["']/i);
    const clickHandlerMatch = rawAttrs.match(/(?:@click|v-on:click|onclick|onpress|@submit|wire:click)=["']?\{?([^"'>}]+)\}?["']?/i);

    const rawId = idMatch ? idMatch[1] : null;
    const explicitLabel = labelMatch ? labelMatch[1] : null;
    const testId = testIdMatch ? testIdMatch[1] : null;
    const classStr = classMatch ? cleanClassName(classMatch[1]) : '';
    const hrefOrTo = toMatch ? toMatch[1] : '';
    const clickHandler = clickHandlerMatch ? clickHandlerMatch[1].trim() : '';

    // 提取标签内容文案（若非自闭合）
    let innerBody = '';
    if (!tagEnd.startsWith('/>')) {
      const closeTag = `</${rawTag}>`;
      const closeIndex = templateCode.indexOf(closeTag, match.index + match[0].length);
      if (closeIndex !== -1 && closeIndex - match.index < 1500) {
        innerBody = templateCode.slice(match.index + match[0].length, closeIndex);
      }
    }

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

    // 计算行号
    const line = templateCode.slice(0, match.index).split('\n').length;
    const sourceLoc = filePath ? `${filePath}:${line}` : `line ${line}`;

    // 模板条件三元表达式双态裂变 (Milestone 3)
    const ternaryMatch = innerBody.match(/\{\{\s*([^?]+)\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\s*\}\}/);
    if (ternaryMatch) {
      const textA = ternaryMatch[2].trim();
      const textB = ternaryMatch[3].trim();

      const stableIdA = explicitLabel || rawId || testId || generateIdFromTextOrClass(textA, classStr, rawTag, elementIndex);
      elements.push({
        id: stableIdA,
        tag: lowerTag,
        text: `${textA} [State: Active/True]`,
        selector,
        ...(explicitLabel ? { label: explicitLabel } : {}),
        action_hint: actionHint || `trigger ${textA}`,
        ...(sourceLoc ? { source_loc: sourceLoc } : {}),
        ...(!isNative ? { is_custom_component: true } : {}),
      });
      elementIndex += 1;

      const stableIdB = explicitLabel ? `${explicitLabel}_alt` : (rawId ? `${rawId}_alt` : generateIdFromTextOrClass(textB, classStr, rawTag, elementIndex));
      elements.push({
        id: stableIdB,
        tag: lowerTag,
        text: `${textB} [State: Inactive/False]`,
        selector,
        ...(explicitLabel ? { label: explicitLabel } : {}),
        action_hint: actionHint || `trigger ${textB}`,
        ...(sourceLoc ? { source_loc: sourceLoc } : {}),
        ...(!isNative ? { is_custom_component: true } : {}),
      });
      elementIndex += 1;
    } else {
      const innerText = cleanTagContent(innerBody);
      const text = innerText || (valueMatch ? valueMatch[1].trim() : '') || explicitLabel || '';

      const stableId = explicitLabel
        || rawId
        || testId
        || generateIdFromTextOrClass(text, classStr, rawTag, elementIndex);

      elements.push({
        id: stableId,
        tag: lowerTag,
        text: text || '(图标/操作)',
        selector,
        ...(explicitLabel ? { label: explicitLabel } : {}),
        action_hint: actionHint || (text ? `trigger ${text}` : undefined),
        ...(sourceLoc ? { source_loc: sourceLoc } : {}),
        ...(!isNative ? { is_custom_component: true } : {}),
      });
      elementIndex += 1;
    }
  }

  const seen = new Set();
  return elements.filter((el) => {
    const k = `${el.id}_${el.text}_${el.selector}`;
    if (seen.has(k)) return false;
    seen.add(k);
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
    hasPointerClass: false,
    conditionalValue: null,
  };

  const EVENT_ATTR_PATTERN = /^(onclick|onmousedown|onmouseup|ondblclick|onkeydown|onkeyup|onkeypress|ontouchstart|ontouchend|onselect|onsubmit|onchange|oninput|oncontextmenu|ondragstart|ondrop|ontoggle|onpointerdown|onpointerup|@click|v-on:click|bindtap|catchtap|\(click\)|wire:click|x-on:click|hx-get|hx-post|data-action)$/i;
  const POINTER_CLASS_PATTERN = /(cursor-pointer|cursor_pointer|clickable|action-item|nav-item|menu-item|btn|button|cta|item-clickable|hover:cursor-pointer|pointer)/i;

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
      else if (attrNameLower === 'class' || attrNameLower === 'classname') {
        result.className = strVal;
        if (strVal && POINTER_CLASS_PATTERN.test(strVal)) {
          result.hasPointerClass = true;
        }
      }
      else if (attrNameLower === 'value' || attrNameLower === 'placeholder' || attrNameLower === 'title' || attrNameLower === 'aria-label' || attrNameLower === 'alt') {
        result.value = strVal;
        if (valNode && t.isJSXExpressionContainer(valNode) && t.isConditionalExpression(valNode.expression)) {
          const cExpr = valNode.expression;
          const cStr = t.isStringLiteral(cExpr.consequent) ? cExpr.consequent.value : '';
          const aStr = t.isStringLiteral(cExpr.alternate) ? cExpr.alternate.value : '';
          if (cStr && aStr) {
            result.conditionalValue = { consequent: cStr, alternate: aStr };
          }
        }
      }
      else if (attrNameLower === 'rel') result.rel = strVal;

      if (EVENT_ATTR_PATTERN.test(attrNameLower)) {
        result.hasClick = true;
        result.clickHandler = extractHandlerDescription(valNode);
      }
    }
  }

  return result;
}

/**
 * 递归提取 JSX 子节点的文案，并在遇到三元条件表达式 (ConditionalExpression) 时裂变生成双态变体 (Milestone 3: Conditional State Bifurcation)
 * @param {Array} children JSX 子节点
 * @returns {Array<{ text: string, state_variant?: 'consequent' | 'alternate' | null }>}
 */
function extractChildTextAndVariants(children) {
  let variants = [{ text: '', state_variant: null }];

  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ').trim();
      if (text) {
        variants = variants.map((v) => ({
          ...v,
          text: v.text ? `${v.text} ${text}` : text
        }));
      }
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;
      if (t.isStringLiteral(expr)) {
        const text = expr.value.trim();
        if (text) {
          variants = variants.map((v) => ({
            ...v,
            text: v.text ? `${v.text} ${text}` : text
          }));
        }
      } else if (t.isNumericLiteral(expr)) {
        const text = String(expr.value);
        variants = variants.map((v) => ({
          ...v,
          text: v.text ? `${v.text} ${text}` : text
        }));
      } else if (t.isTemplateLiteral(expr)) {
        const text = expr.quasis.map((q) => q.value.raw).join('').trim();
        if (text) {
          variants = variants.map((v) => ({
            ...v,
            text: v.text ? `${v.text} ${text}` : text
          }));
        }
      } else if (t.isConditionalExpression(expr)) {
        // 双态裂变分支
        const consequentStr = t.isStringLiteral(expr.consequent) ? expr.consequent.value.trim() 
          : (t.isTemplateLiteral(expr.consequent) ? expr.consequent.quasis.map(q => q.value.raw).join('').trim() : '');
        const alternateStr = t.isStringLiteral(expr.alternate) ? expr.alternate.value.trim() 
          : (t.isTemplateLiteral(expr.alternate) ? expr.alternate.quasis.map(q => q.value.raw).join('').trim() : '');

        if (consequentStr && alternateStr && consequentStr !== alternateStr) {
          const nextVariants = [];
          for (const v of variants) {
            nextVariants.push({
              text: v.text ? `${v.text} ${consequentStr}` : consequentStr,
              state_variant: 'consequent'
            });
            nextVariants.push({
              text: v.text ? `${v.text} ${alternateStr}` : alternateStr,
              state_variant: 'alternate'
            });
          }
          variants = nextVariants;
        } else if (consequentStr || alternateStr) {
          const text = consequentStr || alternateStr;
          variants = variants.map((v) => ({
            ...v,
            text: v.text ? `${v.text} ${text}` : text
          }));
        }
      } else if (t.isLogicalExpression(expr)) {
        const rightStr = t.isStringLiteral(expr.right) ? expr.right.value.trim() : '';
        if (rightStr) {
          variants = variants.map((v) => ({
            ...v,
            text: v.text ? `${v.text} ${rightStr}` : rightStr
          }));
        }
      }
    } else if (t.isJSXElement(child)) {
      const nestedVariants = extractChildTextAndVariants(child.children);
      if (nestedVariants.length > 1) {
        variants = nestedVariants;
      } else if (nestedVariants.length === 1 && nestedVariants[0].text) {
        variants = variants.map((v) => ({
          ...v,
          text: v.text ? `${v.text} ${nestedVariants[0].text}` : nestedVariants[0].text
        }));
      }
    }
  }

  return variants.filter((v) => v.text && v.text.trim().length > 0);
}

/**
 * 基于 Babel AST 遍历提取 JSX/TSX 页面内所有的交互按钮、链接、Schema 常量与提交控件 (Milestone 1, 2, 3)
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

  // 1. AST 配置数组与动作注册表常量展开 (Milestone 1)
  const schemaActions = extractSchemaActionLiterals(ast, filePath, code);
  elements.push(...schemaActions);

  // 2. JSX 元素遍历 (Milestone 2 全元素通用感应 + Milestone 3 双态裂变)
  traverse(ast, {
    JSXElement(pathNode) {
      const opening = pathNode.node.openingElement;
      const rawTagName = getTagName(opening.name);
      if (!rawTagName) return;

      const lowerTagName = rawTagName.toLowerCase();
      if (['script', 'style', 'head', 'meta'].includes(lowerTagName)) return;

      const isNative = NATIVE_INTERACTIVE_TAGS.has(lowerTagName);
      const isCustomPrefix = CUSTOM_COMPONENT_PREFIXES.test(rawTagName);
      const isCustomKeyword = CUSTOM_COMPONENT_NAME_KEYWORDS.test(rawTagName);

      const attrs = extractAttrs(opening.attributes);
      if (lowerTagName === 'link' && !attrs.hasClick && !attrs.to && (attrs.rel || !attrs.href || /^(stylesheet|icon|apple-touch-icon|mask-icon|manifest|preload)/i.test(attrs.rel || ''))) {
        return;
      }

      const isSubmit = attrs.type === 'submit' || attrs.type === 'button' || attrs.type === 'reset';
      const isInteractiveRole = Boolean(attrs.role && /^(button|link|tab|menuitem|menuitemcheckbox|menuitemradio|checkbox|switch|option|treeitem|gridcell|radio|tablist|menu|toolbar|combobox|searchbox)$/i.test(attrs.role));
      const hasNavTarget = Boolean(attrs.to || (attrs.href && !attrs.href.startsWith('#')));

      // 全元素通用事件感应与无障碍拦截 (Universal Event Surface)
      const isInteractiveSurface = isNative || isCustomPrefix || isCustomKeyword || attrs.hasClick || isSubmit || isInteractiveRole || hasNavTarget || attrs.hasPointerClass;

      if (!isInteractiveSurface) {
        return;
      }

      // 提取子文案与条件双态变体 (Conditional State Bifurcation)
      const variants = extractChildTextAndVariants(pathNode.node.children);

      // 如果子文案为空，检查属性文案或条件属性
      if (variants.length === 0) {
        if (attrs.conditionalValue) {
          variants.push({ text: attrs.conditionalValue.consequent, state_variant: 'consequent' });
          variants.push({ text: attrs.conditionalValue.alternate, state_variant: 'alternate' });
        } else {
          variants.push({ text: attrs.value || '', state_variant: null });
        }
      }

      const cleanClass = cleanClassName(attrs.className);
      const firstClass = cleanClass ? cleanClass.split(' ')[0] : '';
      const selector = attrs.id
        ? `#${attrs.id}`
        : firstClass
        ? `${lowerTagName}.${firstClass}`
        : `${lowerTagName}`;

      let sourceLoc = undefined;
      if (opening.loc) {
        const line = opening.loc.start.line;
        sourceLoc = filePath ? `${filePath}:${line}` : `line ${line}`;
      }

      for (const variant of variants) {
        let text = variant.text || (attrs.value ? attrs.value : '');
        if (variant.state_variant === 'consequent') {
          text = `${text} [State: Active/True]`;
        } else if (variant.state_variant === 'alternate') {
          text = `${text} [State: Inactive/False]`;
        }

        const stableId = attrs.shiplensLabel ||
          attrs.id ||
          attrs.testId ||
          generateIdFromTextOrClass(variant.text || text, attrs.className || '', rawTagName, elementIndex);

        let actionHint = '';
        if (attrs.href || attrs.to) actionHint = `navigate to ${attrs.href || attrs.to}`;
        else if (attrs.clickHandler) actionHint = `calls ${attrs.clickHandler}`;
        else if (isSubmit) actionHint = 'submit form';
        else if (variant.text) actionHint = `trigger ${variant.text}`;

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
      }
    },
  });

  const seenIds = new Set();
  return elements.filter((el) => {
    const k = `${el.id}_${el.text}_${el.selector}`;
    if (seenIds.has(k)) return false;
    seenIds.add(k);
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
  const keyMatches = code.matchAll(/(?:case\s+['"]([a-zA-Z0-9_\-]+)['"]|case\s+(\d+)|addEventListener\(['"](keydown|keyup|click|keypress|mousedown|mouseup)['"])/g);
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
    if (elements.length >= 25) break;
  }

  // 2. 提取核心方法声明与类/原型 API (函数、类方法、原型链、挂载方法、TS 接口方法)
  const fnMatches = code.matchAll(/(?:export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)|function\s+([A-Z][a-zA-Z0-9_]+)|class\s+([A-Z][a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\.prototype\.([a-zA-Z0-9_]+)\s*=|this\.([a-zA-Z0-9_]+)\s*=\s*(?:function|\()|(?:static\s+|async\s+)?([a-zA-Z0-9_]{3,35})\s*\([^)]*\)\s*\{|([a-zA-Z0-9_]{3,35})\s*\([^)]*\)\s*[:;])/g);
  for (const fm of fnMatches) {
    const fnName = fm[1] || fm[2] || fm[3] || fm[5] || fm[6] || fm[7] || fm[8];
    if (fnName && !/^(init|setup|render|constructor|get|set|if|for|while|switch|catch|function|return|import|export|require|typeof|instanceof|default|_)/i.test(fnName) && fnName.length >= 3 && fnName.length <= 40) {
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
        if (elements.length >= 80) break;
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
 * 提取页面内所有的交互按钮、链接、Schema 常量与提交控件（主入口：Vue SFC -> JSX AST -> Template Regex -> JS Action）
 * @param {string} code 代码
 * @param {string} filePath 相对文件路径
 * @returns {Array<{ id: string, tag: string, text: string, selector: string, label?: string, action_hint?: string, source_loc?: string, is_custom_component?: boolean }>}
 */
function extractInteractiveElements(code, filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  const elements = [];

  // 1. Vue 单文件组件 (.vue)
  if (ext === '.vue' || code.includes('<template>')) {
    const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
    const templateCode = templateMatch ? templateMatch[1] : code;
    const vueElements = extractHtmlOrTemplateElements(templateCode, filePath, true);
    elements.push(...vueElements);

    // 提取 Vue SFC 中 script / script setup 中的 Schema 常量
    const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      const scriptCode = scriptMatch[1];
      try {
        const scriptAst = parser.parse(scriptCode, {
          sourceType: 'unambiguous',
          plugins: ['typescript', 'decorators-legacy', 'jsx'],
          errorRecovery: true,
        });
        const schemaActions = extractSchemaActionLiterals(scriptAst, filePath, scriptCode);
        elements.push(...schemaActions);
      } catch (e) {}
    }

    if (elements.length > 0) {
      const seen = new Set();
      return elements.filter((el) => {
        const k = `${el.id}_${el.text}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
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
      const stat = fs.statSync(targetFile);
      if (stat.size > 800 * 1024) continue;
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
  extractSchemaActionLiterals,
  extractInteractiveElementsAST,
  extractHtmlOrTemplateElements,
  extractJsActionElements,
  extractInteractiveElements,
  extractPageSkeleton,
  generateIdFromTextOrClass,
};


