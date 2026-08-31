const fs = require('fs');
const path = require('path');

/**
 * 递归扫描目录中的代码文件
 * @param {string} dir 目标目录
 * @param {string[]} extensions 支持的扩展名
 * @param {string[]} ignoreDirs 忽略的目录
 * @returns {string[]} 文件绝对路径列表
 */
function scanFiles(dir, extensions = ['.tsx', '.jsx', '.vue', '.html', '.svelte', '.js', '.ts'], ignoreDirs = ['node_modules', '.git', '.next', 'dist', 'build', 'out', '.agents']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.includes(entry.name)) {
        results.push(...scanFiles(fullPath, extensions, ignoreDirs));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * 自动探测项目类型并提取页面及核心业务组件列表
 * @param {string} rootDir 项目根目录
 * @returns {{ framework: string, pages: Array<{ path: string, filePath: string, name: string, is_component?: boolean, component_files?: string[] }> }}
 */
function detectProjectPages(rootDir) {
  const pages = [];
  let framework = 'custom';

  // 1. 检测 Next.js App Router (src/app 或 app)
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
          name: routePath === '/' ? 'Home (首页)' : routePath,
        });
      }
    }
  }

  // 2. 检测 Next.js / Nuxt Pages Router (src/pages 或 pages)
  if (pages.length === 0) {
    const pagesRouterDir = fs.existsSync(path.join(rootDir, 'src', 'pages')) 
      ? path.join(rootDir, 'src', 'pages') 
      : fs.existsSync(path.join(rootDir, 'pages')) 
      ? path.join(rootDir, 'pages') 
      : null;

    if (pagesRouterDir) {
      framework = 'pages-router';
      const allFiles = scanFiles(pagesRouterDir, ['.tsx', '.jsx', '.vue', '.js', '.ts']);
      for (const file of allFiles) {
        const rel = path.relative(pagesRouterDir, file);
        const nameWithoutExt = rel.replace(/\.[^/.]+$/, '').replace(/\\/g, '/');
        if (nameWithoutExt.startsWith('_') || nameWithoutExt.startsWith('api/')) continue;

        const routePath = nameWithoutExt === 'index' ? '/' : `/${nameWithoutExt.replace(/\/index$/, '')}`;
        pages.push({
          path: routePath,
          filePath: file,
          name: routePath === '/' ? 'Home (首页)' : routePath,
        });
      }
    }
  }

  // 3. 检测通用 SPA 项目 (React CRA, Vite, Vue, Svelte: src/ 下的所有业务组件与容器)
  const srcDir = path.join(rootDir, 'src');
  if (pages.length === 0 && fs.existsSync(srcDir)) {
    const allSrcFiles = scanFiles(srcDir, ['.tsx', '.jsx', '.vue', '.svelte', '.js', '.ts']);
    
    // 过滤排除纯配置、测试、serviceWorker、i18n 初始化与工具库
    const candidateComponents = allSrcFiles.filter((f) => {
      const base = path.basename(f);
      const rel = path.relative(srcDir, f).replace(/\\/g, '/');
      if (/(\.test|\.spec|\.d\.ts|setupTests|serviceWorker|reportWebVitals|i18n\.js|config)/i.test(base)) return false;
      if (rel.startsWith('utils/') || rel.startsWith('data/') || rel.startsWith('locales/') || rel.startsWith('fonts/') || rel.startsWith('images/')) return false;
      return true;
    });

    if (candidateComponents.length > 0) {
      framework = 'spa-react-vue';

      // 寻找显式路由视图（如 routes/, views/, pages/）
      const routeDirs = ['views', 'pages', 'routes'].map((d) => path.join(srcDir, d));
      const explicitRouteFiles = candidateComponents.filter((f) => routeDirs.some((rd) => f.startsWith(rd)));

      if (explicitRouteFiles.length > 0) {
        for (const file of explicitRouteFiles) {
          const base = path.basename(file, path.extname(file));
          const cleanName = base.toLowerCase().replace(/(page|view|screen)$/i, '');
          const routePath = cleanName === 'home' || cleanName === 'index' || cleanName === 'main' ? '/' : `/${cleanName}`;
          pages.push({
            path: routePath,
            filePath: file,
            name: base === 'index' || base === 'Home' ? 'Home (首页)' : base,
          });
        }
      } else {
        // 单页应用 (SPA)：以根路由 '/' 为主页面，汇总主组件 (App/Index) 及容器/业务组件 (containers, components)
        const mainEntry = candidateComponents.find((f) => /^(App|Index|Main)\.(tsx|jsx|js|ts)$/i.test(path.basename(f))) || candidateComponents[0];
        const secondaryComponents = candidateComponents.filter((f) => f !== mainEntry);

        pages.push({
          path: '/',
          filePath: mainEntry,
          name: 'Main App / Calculator View (主应用视图)',
          component_files: secondaryComponents,
        });
      }
    }
  }

  // 4. 静态 HTML 项目保底（仅在无 src 目录或纯静态站点时触发）
  if (pages.length === 0) {
    const htmlFiles = scanFiles(rootDir, ['.html'], ['node_modules', '.git', 'dist', 'build', 'public']);
    // 如果根目录没有 html，才看 public
    const finalHtmlFiles = htmlFiles.length > 0 ? htmlFiles : scanFiles(rootDir, ['.html'], ['node_modules', '.git', 'dist', 'build']);
    if (finalHtmlFiles.length > 0) {
      framework = 'static-html';
      for (const file of finalHtmlFiles) {
        const rel = path.relative(rootDir, file).replace(/\\/g, '/');
        const routePath = rel === 'index.html' || rel === 'public/index.html' ? '/' : `/${rel.replace(/\.html$/, '')}`;
        pages.push({
          path: routePath,
          filePath: file,
          name: path.basename(file),
        });
      }
    }
  }

  // 去重保底
  const uniqueMap = new Map();
  for (const p of pages) {
    if (!uniqueMap.has(p.path)) {
      uniqueMap.set(p.path, p);
    }
  }

  return {
    framework,
    pages: Array.from(uniqueMap.values()),
  };
}

module.exports = {
  scanFiles,
  detectProjectPages,
};
