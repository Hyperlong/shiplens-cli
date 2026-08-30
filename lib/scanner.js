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
 * 自动探测项目类型并提取页面路由列表
 * @param {string} rootDir 项目根目录
 * @returns {{ framework: string, pages: Array<{ path: string, filePath: string, name: string }> }}
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
          name: routePath === '/' ? 'Home (首页)' : routePath
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
          name: routePath === '/' ? 'Home (首页)' : routePath
        });
      }
    }
  }

  // 3. 检测通用 Vite / React / Vue (src/views, src/routes, src/pages, 或扫描全部 .vue/.tsx 组件)
  if (pages.length === 0) {
    const candidateDirs = ['src/views', 'src/pages', 'src/routes', 'src/components', 'src'].map(d => path.join(rootDir, d));
    for (const cDir of candidateDirs) {
      if (fs.existsSync(cDir)) {
        const files = scanFiles(cDir, ['.tsx', '.jsx', '.vue', '.html', '.svelte']);
        for (const file of files) {
          const base = path.basename(file, path.extname(file));
          // 过滤通用辅助或原子组件 (如 Button, Icon, Header)
          if (/^(Page|View|Screen|Home|Pricing|Login|Dashboard|Checkout|Register|Setting|About)/i.test(base)) {
            const cleanName = base.toLowerCase().replace(/(page|view|screen)$/i, '');
            const routePath = cleanName === 'home' || cleanName === 'index' ? '/' : `/${cleanName}`;
            pages.push({
              path: routePath,
              filePath: file,
              name: base
            });
          }
        }
        if (pages.length > 0) {
          framework = 'vite-react-vue';
          break;
        }
      }
    }
  }

  // 4. 静态 HTML 项目保底
  if (pages.length === 0) {
    const htmlFiles = scanFiles(rootDir, ['.html'], ['node_modules', '.git', 'dist']);
    if (htmlFiles.length > 0) {
      framework = 'static-html';
      for (const file of htmlFiles) {
        const rel = path.relative(rootDir, file).replace(/\\/g, '/');
        const routePath = rel === 'index.html' ? '/' : `/${rel.replace(/\.html$/, '')}`;
        pages.push({
          path: routePath,
          filePath: file,
          name: path.basename(file)
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
    pages: Array.from(uniqueMap.values())
  };
}

module.exports = {
  scanFiles,
  detectProjectPages
};
