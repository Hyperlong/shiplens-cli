const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'out', '.agents',
  '.cache', 'coverage', '.github', '.vscode', '.idea', 'vendor', '__pycache__'
];

const CODE_EXTENSIONS = [
  '.tsx', '.jsx', '.vue', '.html', '.svelte', '.js', '.ts',
  '.blade.php', '.php', '.swig', '.jinja', '.j2', '.twig', '.hbs', '.ejs', '.jsp'
];

/**
 * 递归扫描目录中的代码与模板文件
 * @param {string} dir 目标目录
 * @param {string[]} extensions 支持的扩展名
 * @param {string[]} ignoreDirs 忽略的目录
 * @param {number} maxDepth 最大遍历深度
 * @param {number} currentDepth 当前深度
 * @returns {string[]} 文件绝对路径列表
 */
function scanFiles(dir, extensions = CODE_EXTENSIONS, ignoreDirs = IGNORE_DIRS, maxDepth = 10, currentDepth = 0) {
  const results = [];
  if (!fs.existsSync(dir) || currentDepth > maxDepth) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreDirs.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanFiles(fullPath, extensions, ignoreDirs, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const lowerName = entry.name.toLowerCase();
        if (extensions.includes(ext) || (lowerName.endsWith('.blade.php') && extensions.includes('.blade.php'))) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {}
  return results;
}

/**
 * 格式化路由名称为易读的标题
 */
function formatViewName(rawName) {
  if (!rawName || rawName === '/' || rawName === 'index' || rawName === 'home') return 'Home (首页)';
  const clean = rawName.replace(/^[/_\\-]+/, '').replace(/[/_\\-]+$/g, '');
  return clean
    .split(/[/_\\-]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/**
 * 扫描特定项目目录中的页面与动态功能视图
 * @param {string} rootDir 项目根目录或子包根目录
 * @returns {{ framework: string, pages: Array<{ path: string, filePath: string, name: string, view_type?: string, component_files?: string[] }> }}
 */
function scanSinglePackagePages(rootDir) {
  const pages = [];
  let framework = 'custom';

  const appRouterDir = fs.existsSync(path.join(rootDir, 'src', 'app')) 
    ? path.join(rootDir, 'src', 'app') 
    : fs.existsSync(path.join(rootDir, 'app')) 
    ? path.join(rootDir, 'app') 
    : null;

  if (appRouterDir) {
    framework = 'nextjs-app-router';
    const allFiles = scanFiles(appRouterDir, ['.tsx', '.jsx', '.js', '.ts']);
    for (const file of allFiles) {
      const baseName = path.basename(file);
      if (/^page\.(tsx|jsx|js|ts)$/.test(baseName)) {
        const relDir = path.relative(appRouterDir, path.dirname(file));
        const routePath = relDir === '' ? '/' : `/${relDir.replace(/\\/g, '/').replace(/\(.*?\)\/?/g, '')}`;
        pages.push({
          path: routePath || '/',
          filePath: file,
          name: formatViewName(routePath),
          view_type: 'route_page',
        });
      }
    }
  }

  const pagesRouterDir = fs.existsSync(path.join(rootDir, 'src', 'pages')) 
    ? path.join(rootDir, 'src', 'pages') 
    : fs.existsSync(path.join(rootDir, 'pages')) 
    ? path.join(rootDir, 'pages') 
    : null;

  if (pagesRouterDir) {
    if (framework === 'custom') framework = 'pages-router';
    const allFiles = scanFiles(pagesRouterDir, ['.tsx', '.jsx', '.vue', '.svelte', '.js', '.ts']);
    for (const file of allFiles) {
      const rel = path.relative(pagesRouterDir, file);
      const nameWithoutExt = rel.replace(/\.[^/.]+$/, '').replace(/\\/g, '/');
      if (nameWithoutExt.startsWith('_') || nameWithoutExt.startsWith('api/')) continue;

      const routePath = nameWithoutExt === 'index' ? '/' : `/${nameWithoutExt.replace(/\/index$/, '')}`;
      pages.push({
        path: routePath,
        filePath: file,
        name: formatViewName(routePath),
        view_type: 'route_page',
      });
    }
  }

  const toolsDir = fs.existsSync(path.join(rootDir, 'src', 'tools')) 
    ? path.join(rootDir, 'src', 'tools') 
    : fs.existsSync(path.join(rootDir, 'tools')) 
    ? path.join(rootDir, 'tools') 
    : null;

  if (toolsDir) {
    try {
      const toolEntries = fs.readdirSync(toolsDir, { withFileTypes: true });
      for (const entry of toolEntries) {
        if (!entry.isDirectory() || IGNORE_DIRS.includes(entry.name)) continue;
        const toolDirPath = path.join(toolsDir, entry.name);
        const toolFiles = scanFiles(toolDirPath, ['.vue', '.tsx', '.jsx', '.ts', '.js']);
        if (toolFiles.length === 0) continue;

        const primaryFile = toolFiles.find((f) => /\.vue$/i.test(f) && !/helper|util|test|spec/i.test(f))
          || toolFiles.find((f) => /^(index|main)/i.test(path.basename(f)))
          || toolFiles[0];

        const secondaryFiles = toolFiles.filter((f) => f !== primaryFile);
        const toolRoute = `/tools/${entry.name}`;

        pages.push({
          path: toolRoute,
          filePath: primaryFile,
          name: formatViewName(`Tool: ${entry.name}`),
          view_type: 'dynamic_tool',
          component_files: secondaryFiles,
        });
      }
      if (framework === 'custom') framework = 'dynamic-tools-registry';
    } catch (e) {}
  }

  const modulesDir = fs.existsSync(path.join(rootDir, 'src', 'modules'))
    ? path.join(rootDir, 'src', 'modules')
    : fs.existsSync(path.join(rootDir, 'modules'))
    ? path.join(rootDir, 'modules')
    : null;

  if (modulesDir) {
    try {
      const moduleEntries = fs.readdirSync(modulesDir, { withFileTypes: true });
      for (const entry of moduleEntries) {
        if (!entry.isDirectory() || IGNORE_DIRS.includes(entry.name)) continue;
        const modPath = path.join(modulesDir, entry.name);
        const modFiles = scanFiles(modPath, ['.tsx', '.jsx', '.vue', '.ts', '.js']);
        if (modFiles.length === 0) continue;

        const primaryFile = modFiles.find((f) => /template|page|index|main|view/i.test(path.basename(f))) || modFiles[0];
        const secondaryFiles = modFiles.filter((f) => f !== primaryFile);

        pages.push({
          path: `/modules/${entry.name}`,
          filePath: primaryFile,
          name: formatViewName(`Module: ${entry.name}`),
          view_type: 'module_view',
          component_files: secondaryFiles,
        });
      }
    } catch (e) {}
  }

  const candidateViewDirs = ['views', 'screens', 'scenes', 'features', 'controllers', 'apps', 'components/views', 'components/services', 'components/widgets', 'widgets', 'extensions', 'plugins', 'tools', 'modules', 'components/tools', 'js/extensions']
    .flatMap((d) => [path.join(rootDir, 'src', d), path.join(rootDir, d)])
    .filter((d) => fs.existsSync(d));

  for (const vDir of candidateViewDirs) {
    const viewFiles = scanFiles(vDir, ['.tsx', '.jsx', '.vue', '.svelte', '.ts', '.js']);
    const allKnownFiles = new Set(pages.flatMap(p => [p.filePath, ...(p.component_files || [])]));
    for (const vFile of viewFiles) {
      if (allKnownFiles.has(vFile)) continue;
      const base = path.basename(vFile, path.extname(vFile));
      if (/(\.test|\.spec|\.d\.ts|setupTests|config)/i.test(base)) continue;
      const rel = path.relative(vDir, vFile).replace(/\.[^/.]+$/, '').replace(/\\/g, '/');
      const routePath = `/${rel.toLowerCase().replace(/\/index$/, '')}`;

      pages.push({
        path: routePath,
        filePath: vFile,
        name: formatViewName(rel),
        view_type: 'view_component',
      });
    }
  }

  const bladeViewsDir = path.join(rootDir, 'resources', 'views');
  if (fs.existsSync(bladeViewsDir)) {
    framework = 'laravel-blade';
    const bladeFiles = scanFiles(bladeViewsDir, ['.blade.php', '.php', '.html']);
    for (const file of bladeFiles) {
      const rel = path.relative(bladeViewsDir, file).replace(/\.blade\.php$/i, '').replace(/\.(php|html)$/i, '').replace(/\\/g, '/');
      if (rel.startsWith('layouts/') || rel.startsWith('components/') || rel.startsWith('vendor/')) continue;
      const routePath = rel === 'index' || rel === 'welcome' ? '/' : `/${rel}`;
      pages.push({
        path: routePath,
        filePath: file,
        name: formatViewName(rel),
        view_type: 'template_view',
      });
    }
  }

  const djangoTemplateDirs = [
    path.join(rootDir, 'templates'),
    path.join(rootDir, 'babybuddy', 'templates'),
    path.join(rootDir, 'core', 'templates'),
  ].filter((d) => fs.existsSync(d));

  if (djangoTemplateDirs.length > 0) {
    framework = 'django-jinja';
    for (const tDir of djangoTemplateDirs) {
      const tFiles = scanFiles(tDir, ['.html', '.jinja', '.j2']);
      for (const file of tFiles) {
        const rel = path.relative(tDir, file).replace(/\.(html|jinja|j2)$/i, '').replace(/\\/g, '/');
        if (rel.includes('base') || rel.includes('include') || rel.includes('_')) continue;
        pages.push({
          path: `/${rel.toLowerCase()}`,
          filePath: file,
          name: formatViewName(rel),
          view_type: 'template_view',
        });
      }
    }
  }

  const phpLayoutDir = path.join(rootDir, 'app', 'layout');
  const phpViewsDir = path.join(rootDir, 'app', 'views');
  if (fs.existsSync(phpLayoutDir) || fs.existsSync(phpViewsDir)) {
    framework = 'php-mvc';
    const phpDirs = [phpLayoutDir, phpViewsDir].filter((d) => fs.existsSync(d));
    for (const pDir of phpDirs) {
      const pFiles = scanFiles(pDir, ['.php', '.html', '.phtml']);
      for (const file of pFiles) {
        const rel = path.relative(pDir, file).replace(/\.(php|html|phtml)$/i, '').replace(/\\/g, '/');
        pages.push({
          path: `/${rel.toLowerCase()}`,
          filePath: file,
          name: formatViewName(rel),
          view_type: 'template_view',
        });
      }
    }
  }

  const hexoLayoutDir = path.join(rootDir, 'layout');
  if (fs.existsSync(hexoLayoutDir)) {
    framework = 'hexo-swig';
    const swigFiles = scanFiles(hexoLayoutDir, ['.swig', '.njk', '.html', '.ejs']);
    for (const file of swigFiles) {
      const rel = path.relative(hexoLayoutDir, file).replace(/\.[^/.]+$/, '').replace(/\\/g, '/');
      if (rel.startsWith('_')) continue;
      pages.push({
        path: rel === 'index' ? '/' : `/${rel}`,
        filePath: file,
        name: formatViewName(rel),
        view_type: 'template_view',
      });
    }
  }

  const webappDir = path.join(rootDir, 'freeciv-web', 'src', 'main', 'webapp');
  if (fs.existsSync(webappDir)) {
    framework = 'webapp-canvas';
    const webFiles = scanFiles(webappDir, ['.html', '.js', '.jsp']);
    const htmlEntry = webFiles.find((f) => /index\.html$/i.test(f)) || webFiles[0];
    const jsHelpers = webFiles.filter((f) => f !== htmlEntry);
    if (htmlEntry) {
      pages.push({
        path: '/',
        filePath: htmlEntry,
        name: 'Game Canvas & Map View',
        view_type: 'canvas_view',
        component_files: jsHelpers,
      });
    }
  }

  const srcDir = path.join(rootDir, 'src');
  if (pages.length === 0 && fs.existsSync(srcDir)) {
    framework = 'spa-react-vue';
    const allSrcFiles = scanFiles(srcDir, ['.tsx', '.jsx', '.vue', '.svelte', '.js', '.ts', '.html']);
    
    const candidateComponents = allSrcFiles.filter((f) => {
      const base = path.basename(f);
      const rel = path.relative(srcDir, f).replace(/\\/g, '/');
      if (/(\.test|\.spec|\.d\.ts|setupTests|serviceWorker|reportWebVitals|i18n\.js|config)/i.test(base)) return false;
      if (rel.startsWith('fonts/') || rel.startsWith('images/') || rel.startsWith('locales/')) return false;
      return true;
    });

    if (candidateComponents.length > 0) {
      const vueSfcFiles = candidateComponents.filter((f) => /\.vue$/i.test(f));
      if (vueSfcFiles.length > 3) {
        for (const vf of vueSfcFiles) {
          const base = path.basename(vf, '.vue');
          const rel = path.relative(srcDir, vf).replace(/\.vue$/i, '').replace(/\\/g, '/');
          pages.push({
            path: `/${rel.toLowerCase()}`,
            filePath: vf,
            name: formatViewName(base),
            view_type: 'sfc_view',
          });
        }
      } else {
        const mainEntry = candidateComponents.find((f) => /^(App|Index|Main|Leaflet)\.(tsx|jsx|js|ts|vue|html)$/i.test(path.basename(f))) || candidateComponents[0];
        const secondaryComponents = candidateComponents.filter((f) => f !== mainEntry);

        pages.push({
          path: '/',
          filePath: mainEntry,
          name: 'Main Application & Interactive Canvas View',
          view_type: 'spa_main',
          component_files: secondaryComponents,
        });
      }
    }
  }

  if (pages.length === 0) {
    const htmlFiles = scanFiles(rootDir, ['.html'], IGNORE_DIRS);
    if (htmlFiles.length > 0) {
      framework = 'static-html';
      const mainHtml = htmlFiles.find((f) => /index\.html$/i.test(f)) || htmlFiles[0];
      const jsFiles = scanFiles(rootDir, ['.js', '.ts'], IGNORE_DIRS).filter((f) => !f.includes('.min.js') && !f.includes('.test.'));

      pages.push({
        path: '/',
        filePath: mainHtml,
        name: 'Main HTML / Canvas View',
        view_type: 'static_html',
        component_files: jsFiles.filter((f) => f !== mainHtml),
      });

      // 其余独立的 HTML 页面
      for (const hf of htmlFiles) {
        if (hf === mainHtml) continue;
        const rel = path.relative(rootDir, hf).replace(/\\/g, '/');
        pages.push({
          path: `/${rel.replace(/\.html$/, '')}`,
          filePath: hf,
          name: formatViewName(rel),
          view_type: 'static_html',
          component_files: jsFiles.filter((f) => f !== hf),
        });
      }
    } else {
      // 纯 JS/TS 库（如 pokersolver, excalidraw dist, dwv dist, chess.js 等）
      let jsFiles = scanFiles(rootDir, ['.js', '.ts'], IGNORE_DIRS).filter((f) => !f.includes('.min.js') && !f.includes('.test.'));
      // 若常规目录无 JS，检查 dist 目录
      if (jsFiles.length === 0 && fs.existsSync(path.join(rootDir, 'dist'))) {
        jsFiles = scanFiles(path.join(rootDir, 'dist'), ['.js', '.ts'], ['.git']);
      }

      if (jsFiles.length > 0) {
        framework = 'js-library';
        const mainJs = jsFiles.find((f) => /^(index|main|app|pokersolver|chess|drawflow|dwv|js-algorithm)\.(js|ts)/i.test(path.basename(f))) || jsFiles[0];
        pages.push({
          path: '/',
          filePath: mainJs,
          name: 'Core Module & Interactive Controls View',
          view_type: 'library_entry',
          component_files: jsFiles.filter((f) => f !== mainJs),
        });
      } else {
        // 纯文档/配置保底（如仅有 README.md / package.json）
        const readmePath = ['README.md', 'readme.md', 'README.MD', 'readme.txt'].map((f) => path.join(rootDir, f)).find((f) => fs.existsSync(f));
        const pkgPath = path.join(rootDir, 'package.json');
        const fallbackFile = readmePath || (fs.existsSync(pkgPath) ? pkgPath : null);

        if (fallbackFile) {
          framework = 'standalone-tool';
          pages.push({
            path: '/',
            filePath: fallbackFile,
            name: 'Core Product & Operational Features View',
            view_type: 'factsheet_view',
            component_files: [],
          });
        }
      }
    }
  }

  return {
    framework,
    pages,
  };
}

/**
 * 挖掘项目静态路由配置表 (Vue Router, React Router, SvelteKit, TanStack) 与全局侧边栏/菜单定义 (Milestone 4: Route & Menu Mining)
 * @param {string} rootDir 项目根目录
 * @returns {Array<{ path: string, filePath: string, name: string, view_type: string, component_files?: string[] }>}
 */
function mineRouterAndMenuDefinitions(rootDir) {
  const minedPages = [];
  if (!fs.existsSync(rootDir)) return minedPages;

  let parser, traverse, t;
  try {
    parser = require('@babel/parser');
    traverse = require('@babel/traverse').default || require('@babel/traverse');
    t = require('@babel/types');
  } catch (e) {
    return minedPages;
  }

  function getTagNameLocal(nameNode) {
    if (!nameNode) return '';
    if (t.isJSXIdentifier(nameNode)) return nameNode.name;
    if (t.isJSXMemberExpression(nameNode)) return `${getTagNameLocal(nameNode.object)}.${nameNode.property.name}`;
    return '';
  }

  // 查找候选路由和菜单文件
  const candidatePatterns = [
    'src/router', 'src/routes', 'router', 'routes',
    'src/config', 'config', 'src/navigation', 'src/menu', 'src/sidebar'
  ].map((d) => path.join(rootDir, d)).filter((d) => fs.existsSync(d));

  const candidateFiles = [];
  for (const cDir of candidatePatterns) {
    const files = scanFiles(cDir, ['.ts', '.js', '.tsx', '.jsx', '.json', '.vue']);
    candidateFiles.push(...files);
  }

  // 单独检测根级与常见目录下的路由/入口文件
  const explicitCandidates = [
    'src/App.tsx', 'src/App.jsx', 'src/App.vue', 'src/main.tsx', 'src/main.js',
    'src/routes.ts', 'src/routes.js', 'src/router.ts', 'src/router.js',
    'src/router/index.ts', 'src/router/index.js', 'src/router/routes.ts',
    'sidebar.config.ts', 'menu.json', 'sidebars.json', 'src/menu.json'
  ].map((f) => path.join(rootDir, f)).filter((f) => fs.existsSync(f));

  candidateFiles.push(...explicitCandidates);

  const uniqueFiles = Array.from(new Set(candidateFiles));

  for (const file of uniqueFiles) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file).toLowerCase();

    // 1. JSON 菜单/侧边栏挖掘 (如 menu.json, sidebars.json)
    if (ext === '.json' && /menu|sidebar|nav/i.test(baseName)) {
      try {
        const jsonContent = JSON.parse(fs.readFileSync(file, 'utf8'));
        function traverseJsonMenu(obj) {
          if (!obj) return;
          if (Array.isArray(obj)) {
            for (const item of obj) traverseJsonMenu(item);
          } else if (typeof obj === 'object') {
            const pathVal = obj.path || obj.route || obj.to || obj.url || obj.link;
            const nameVal = obj.name || obj.title || obj.label || obj.text;
            if (pathVal && typeof pathVal === 'string' && pathVal.startsWith('/') && pathVal.length < 60) {
              minedPages.push({
                path: pathVal,
                filePath: file,
                name: formatViewName(nameVal || pathVal),
                view_type: 'menu_route',
              });
            }
            for (const val of Object.values(obj)) {
              if (typeof val === 'object') traverseJsonMenu(val);
            }
          }
        }
        traverseJsonMenu(jsonContent);
      } catch (e) {}
      continue;
    }

    // 2. JS / TS / JSX / TSX 路由表 AST 挖掘
    if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
      try {
        const fileContent = fs.readFileSync(file, 'utf8');
        const ast = parser.parse(fileContent, {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'typescript', 'decorators-legacy'],
          errorRecovery: true,
        });

        // 收集 import 路径映射
        const importMap = new Map();
        traverse(ast, {
          ImportDeclaration(pathNode) {
            const importSource = pathNode.node.source.value;
            for (const spec of pathNode.node.specifiers) {
              if (t.isImportDefaultSpecifier(spec) || t.isImportSpecifier(spec)) {
                importMap.set(spec.local.name, importSource);
              }
            }
          },
          // 挖掘 Vue Router / Config 路由对象 { path: '/foo', component: Foo, name: 'foo' }
          ObjectExpression(pathNode) {
            let pathVal = '';
            let nameVal = '';
            let componentName = '';
            let importSource = '';

            for (const prop of pathNode.node.properties) {
              if (!t.isObjectProperty(prop)) continue;
              const keyName = t.isIdentifier(prop.key) ? prop.key.name : (t.isStringLiteral(prop.key) ? prop.key.value : '');
              if (!keyName) continue;
              const kLower = keyName.toLowerCase();
              const valNode = prop.value;

              if (kLower === 'path' || kLower === 'route') {
                if (t.isStringLiteral(valNode)) pathVal = valNode.value;
                else if (t.isTemplateLiteral(valNode)) pathVal = valNode.quasis.map((q) => q.value.raw).join('');
              } else if (kLower === 'name' || kLower === 'title' || kLower === 'label') {
                if (t.isStringLiteral(valNode)) nameVal = valNode.value;
              } else if (kLower === 'component' || kLower === 'element') {
                if (t.isIdentifier(valNode)) {
                  componentName = valNode.name;
                } else if (t.isArrowFunctionExpression(valNode) || t.isFunctionExpression(valNode)) {
                  const bodyStr = fileContent.slice(valNode.start, valNode.end);
                  const impMatch = bodyStr.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
                  if (impMatch) importSource = impMatch[1];
                } else if (t.isJSXElement(valNode)) {
                  const tag = getTagNameLocal(valNode.openingElement.name);
                  if (tag) componentName = tag;
                }
              }
            }

            if (pathVal && pathVal.startsWith('/') && !pathVal.includes('*') && !pathVal.startsWith('/api') && pathVal.length < 80) {
              let resolvedFilePath = file;
              const targetImport = importSource || (componentName ? importMap.get(componentName) : null);
              if (targetImport && targetImport.startsWith('.')) {
                const dir = path.dirname(file);
                const exts = ['', '.vue', '.tsx', '.jsx', '.ts', '.js', '/index.vue', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
                for (const testExt of exts) {
                  const cand = path.resolve(dir, `${targetImport}${testExt}`);
                  if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
                    resolvedFilePath = cand;
                    break;
                  }
                }
              }

              minedPages.push({
                path: pathVal,
                filePath: resolvedFilePath,
                name: formatViewName(nameVal || pathVal),
                view_type: 'router_route',
              });
            }
          },
          // 挖掘 React Router JSX: <Route path="/dashboard" element={<Dashboard />} />
          JSXElement(pathNode) {
            const rawTag = getTagNameLocal(pathNode.node.openingElement.name);
            if (/^(Route|PrivateRoute|PublicRoute|AuthenticatedRoute)$/i.test(rawTag)) {
              let pathVal = '';
              let elementCompName = '';
              for (const attr of pathNode.node.openingElement.attributes) {
                if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
                  const aName = attr.name.name.toLowerCase();
                  if (aName === 'path') {
                    if (t.isStringLiteral(attr.value)) pathVal = attr.value.value;
                    else if (t.isJSXExpressionContainer(attr.value) && t.isStringLiteral(attr.value.expression)) pathVal = attr.value.expression.value;
                  } else if (aName === 'element' || aName === 'component') {
                    if (t.isJSXExpressionContainer(attr.value)) {
                      const expr = attr.value.expression;
                      if (t.isJSXElement(expr)) {
                        elementCompName = getTagNameLocal(expr.openingElement.name);
                      } else if (t.isIdentifier(expr)) {
                        elementCompName = expr.name;
                      }
                    }
                  }
                }
              }

              if (pathVal && pathVal.startsWith('/') && !pathVal.includes('*') && pathVal.length < 80) {
                let resolvedFilePath = file;
                const targetImport = elementCompName ? importMap.get(elementCompName) : null;
                if (targetImport && targetImport.startsWith('.')) {
                  const dir = path.dirname(file);
                  const exts = ['', '.tsx', '.jsx', '.ts', '.js', '/index.tsx', '/index.jsx', '/index.ts', '/index.js'];
                  for (const testExt of exts) {
                    const cand = path.resolve(dir, `${targetImport}${testExt}`);
                    if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
                      resolvedFilePath = cand;
                      break;
                    }
                  }
                }

                minedPages.push({
                  path: pathVal,
                  filePath: resolvedFilePath,
                  name: formatViewName(pathVal),
                  view_type: 'router_route',
                });
              }
            }
          }
        });
      } catch (e) {}
    }
  }

  const seenRoutes = new Set();
  return minedPages.filter((p) => {
    if (seenRoutes.has(p.path)) return false;
    seenRoutes.add(p.path);
    return true;
  });
}

/**
 * 自动探测项目类型并提取页面及核心业务组件列表（支持 Monorepo 穿透与静态路由/菜单挖掘）
 * @param {string} rootDir 项目根目录
 * @returns {{ framework: string, pages: Array<{ path: string, filePath: string, name: string, is_component?: boolean, component_files?: string[] }> }}
 */
function detectProjectPages(rootDir) {
  const allPages = [];
  let primaryFramework = 'custom';

  // 1. 扫描根目录
  const rootScan = scanSinglePackagePages(rootDir);
  if (rootScan.pages.length > 0) {
    allPages.push(...rootScan.pages);
    primaryFramework = rootScan.framework;
  }

  // 2. 探测 Monorepo 子包 (packages/*, apps/*, projects/*, examples/*, demo/*)
  const monorepoContainerDirs = ['packages', 'apps', 'projects', 'examples', 'demo', 'demos', 'samples'].map((d) => path.join(rootDir, d));
  for (const mDir of monorepoContainerDirs) {
    if (fs.existsSync(mDir)) {
      try {
        const subPackages = fs.readdirSync(mDir, { withFileTypes: true });
        for (const sub of subPackages) {
          if (!sub.isDirectory() || IGNORE_DIRS.includes(sub.name)) continue;
          const subPkgDir = path.join(mDir, sub.name);
          const subScan = scanSinglePackagePages(subPkgDir);
          
          if (subScan.pages.length > 0) {
            if (primaryFramework === 'custom' || primaryFramework === 'static-html' || primaryFramework === 'js-library') {
              primaryFramework = subScan.framework;
            }
            for (const sp of subScan.pages) {
              const scopedPath = sp.path === '/' ? `/${sub.name}` : `/${sub.name}${sp.path}`;
              allPages.push({
                ...sp,
                path: scopedPath,
                name: `[${sub.name}] ${sp.name}`,
              });
            }
          }

          // 子包路由挖掘
          const subMinedRoutes = mineRouterAndMenuDefinitions(subPkgDir);
          for (const smr of subMinedRoutes) {
            const scopedPath = smr.path === '/' ? `/${sub.name}` : `/${sub.name}${smr.path}`;
            allPages.push({
              ...smr,
              path: scopedPath,
              name: `[${sub.name}] ${smr.name}`,
            });
          }
        }
      } catch (e) {}
    }
  }

  // 3. 根目录静态路由表与全局菜单深度挖掘 (Route & Menu Mining)
  const minedRoutes = mineRouterAndMenuDefinitions(rootDir);
  for (const mr of minedRoutes) {
    const existingIndex = allPages.findIndex((p) => p.path === mr.path);
    if (existingIndex === -1) {
      allPages.push(mr);
    } else if (allPages[existingIndex].filePath === rootDir || allPages[existingIndex].view_type === 'factsheet_view') {
      allPages[existingIndex] = mr;
    }
  }

  // 去重保底（优先保留拥有更多关联组件或更具体路径的视图）
  const uniqueMap = new Map();
  for (const p of allPages) {
    if (!uniqueMap.has(p.path)) {
      uniqueMap.set(p.path, p);
    } else {
      const existing = uniqueMap.get(p.path);
      const existingComps = (existing.component_files || []).length;
      const newComps = (p.component_files || []).length;
      if (newComps > existingComps) {
        uniqueMap.set(p.path, p);
      }
    }
  }

  return {
    framework: primaryFramework,
    pages: Array.from(uniqueMap.values()),
  };
}

module.exports = {
  scanFiles,
  mineRouterAndMenuDefinitions,
  detectProjectPages,
  formatViewName,
};

