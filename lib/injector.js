const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const FRAMEWORKS = {
  NEXT_APP: 'nextjs-app',
  NEXT_PAGES: 'nextjs-pages',
  CRA: 'cra',
  VITE: 'vite',
  VUE: 'vue',
  HTML: 'html',
  UNKNOWN: 'unknown',
};

function detectPackageManager(dir = process.cwd()) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'bun.lockb')) || fs.existsSync(path.join(dir, 'bun.lock'))) return 'bun';
  return 'npm';
}

const { inferTaxonomy } = require('./taxonomy');
const { extractProjectFactsheet } = require('./extractor');

function detectProject(dir = process.cwd()) {
  const factsheet = extractProjectFactsheet(dir);

  const result = {
    framework: FRAMEWORKS.UNKNOWN,
    package_manager: detectPackageManager(dir),
    project_name: factsheet.name || path.basename(dir),
    industry: 'saas',
    description: factsheet.description || '',
    keywords: factsheet.keywords || [],
    dependencies: {},
    devDependencies: {},
    taxonomy: null,
    factsheet,
  };

  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name) result.project_name = pkg.name;
      if (pkg.description) result.description = pkg.description;
      if (Array.isArray(pkg.keywords)) result.keywords = pkg.keywords;
      if (pkg.dependencies) result.dependencies = pkg.dependencies;
      if (pkg.devDependencies) result.devDependencies = pkg.devDependencies;

      const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      if (deps['next']) {
        if (
          fs.existsSync(path.join(dir, 'src/app/layout.tsx')) ||
          fs.existsSync(path.join(dir, 'app/layout.tsx')) ||
          fs.existsSync(path.join(dir, 'src/app/layout.js')) ||
          fs.existsSync(path.join(dir, 'app/layout.js')) ||
          fs.existsSync(path.join(dir, 'src/app/layout.jsx')) ||
          fs.existsSync(path.join(dir, 'app/layout.jsx'))
        ) {
          result.framework = FRAMEWORKS.NEXT_APP;
        } else {
          result.framework = FRAMEWORKS.NEXT_PAGES;
        }
      } else if (deps['react-scripts'] || deps['react-app-rewired'] || deps['craco'] || deps['@craco/craco']) {
        result.framework = FRAMEWORKS.CRA;
      } else if (deps['vue'] || deps['nuxt']) {
        result.framework = FRAMEWORKS.VUE;
      } else if (deps['vite'] || deps['react'] || deps['svelte']) {
        result.framework = FRAMEWORKS.VITE;
      }
    } catch (e) {}
  }

  if (result.framework === FRAMEWORKS.UNKNOWN) {
    if (
      fs.existsSync(path.join(dir, 'src/app/layout.tsx')) ||
      fs.existsSync(path.join(dir, 'app/layout.tsx')) ||
      fs.existsSync(path.join(dir, 'src/app/layout.js')) ||
      fs.existsSync(path.join(dir, 'app/layout.js'))
    ) {
      result.framework = FRAMEWORKS.NEXT_APP;
    } else if (
      fs.existsSync(path.join(dir, 'src/pages/_app.tsx')) ||
      fs.existsSync(path.join(dir, 'pages/_app.tsx')) ||
      fs.existsSync(path.join(dir, 'src/pages/_app.js')) ||
      fs.existsSync(path.join(dir, 'pages/_app.js'))
    ) {
      result.framework = FRAMEWORKS.NEXT_PAGES;
    } else if (
      fs.existsSync(path.join(dir, 'vite.config.ts')) ||
      fs.existsSync(path.join(dir, 'vite.config.js')) ||
      fs.existsSync(path.join(dir, 'src/main.tsx')) ||
      fs.existsSync(path.join(dir, 'src/main.ts'))
    ) {
      result.framework = FRAMEWORKS.VITE;
    } else if (fs.existsSync(path.join(dir, 'index.html')) || fs.existsSync(path.join(dir, 'public/index.html'))) {
      result.framework = FRAMEWORKS.HTML;
    }
  }

  // Extract description fallback from factsheet if missing
  if (!result.description) {
    result.description = factsheet.readme.description || factsheet.htmlHead.description || '';
  }

  // 4-level taxonomy inference (powered by 5-layer factsheet)
  const taxonomy = inferTaxonomy({
    name: result.project_name,
    description: result.description,
    keywords: result.keywords,
    dependencies: result.dependencies,
    devDependencies: result.devDependencies,
    framework: result.framework,
    readme: factsheet.readme,
    i18n: factsheet.i18n,
    htmlHead: factsheet.htmlHead,
  });

  result.taxonomy = taxonomy;
  result.industry = taxonomy.subgenre.id || taxonomy.genre.id || 'saas';

  return result;
}

function injectNextApp(dir, appId, apiUrl) {
  const candidates = [
    'src/app/layout.tsx', 'app/layout.tsx',
    'src/app/layout.jsx', 'app/layout.jsx',
    'src/app/layout.js', 'app/layout.js',
  ];

  const apiOpt = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? `, apiUrl: '${apiUrl}'` : '';

  let targetPath = '';
  let relPath = '';
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      targetPath = p;
      relPath = cand;
      break;
    }
  }

  if (!targetPath) {
    const compDir = fs.existsSync(path.join(dir, 'src')) ? path.join(dir, 'src/components') : path.join(dir, 'components');
    fs.mkdirSync(compDir, { recursive: true });
    const compPath = path.join(compDir, 'ShiplensTracker.tsx');
    const compContent = `'use client';\n\nimport { useEffect } from 'react';\nimport { initShiplens } from '@shiplens/sdk';\n\nexport function ShiplensTracker() {\n  useEffect(() => {\n    initShiplens({ appId: '${appId}'${apiOpt} });\n  }, []);\n  return null;\n}\n`;
    fs.writeFileSync(compPath, compContent, 'utf8');
    return path.relative(dir, compPath).replace(/\\/g, '/');
  }

  let content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes('@shiplens/sdk') || content.includes('initShiplens') || content.includes(appId)) {
    return relPath;
  }

  if (content.includes("'use client'") || content.includes('"use client"')) {
    const newContent = `import { initShiplens } from '@shiplens/sdk';\n\nif (typeof window !== 'undefined') {\n  initShiplens({ appId: '${appId}'${apiOpt} });\n}\n` + content;
    fs.writeFileSync(targetPath, newContent, 'utf8');
    return relPath;
  }

  const compDir = path.dirname(targetPath);
  const ext = targetPath.endsWith('.js') || targetPath.endsWith('.jsx') ? '.jsx' : '.tsx';
  const trackerFile = path.join(compDir, `ShiplensTracker${ext}`);
  const trackerContent = `'use client';\n\nimport { useEffect } from 'react';\nimport { initShiplens } from '@shiplens/sdk';\n\nexport function ShiplensTracker() {\n  useEffect(() => {\n    initShiplens({ appId: '${appId}'${apiOpt} });\n  }, []);\n  return null;\n}\n`;
  fs.writeFileSync(trackerFile, trackerContent, 'utf8');

  if (!content.includes('ShiplensTracker')) {
    content = `import { ShiplensTracker } from './ShiplensTracker';\n` + content;
    if (content.includes('{children}')) {
      content = content.replace('{children}', '{children}\n        <ShiplensTracker />');
    }
    fs.writeFileSync(targetPath, content, 'utf8');
  }

  return path.relative(dir, trackerFile).replace(/\\/g, '/');
}

function injectNextPages(dir, appId, apiUrl) {
  const apiOpt = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? `, apiUrl: '${apiUrl}'` : '';
  const candidates = [
    'src/pages/_app.tsx', 'pages/_app.tsx',
    'src/pages/_app.jsx', 'pages/_app.jsx',
    'src/pages/_app.js', 'pages/_app.js',
  ];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('@shiplens/sdk') || content.includes('initShiplens')) {
        return cand;
      }
      const injection = `import { useEffect } from 'react';\nimport { initShiplens } from '@shiplens/sdk';\n\nif (typeof window !== 'undefined') {\n  initShiplens({ appId: '${appId}'${apiOpt} });\n}\n`;
      fs.writeFileSync(p, injection + '\n' + content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId, apiUrl);
}

function injectVite(dir, appId, apiUrl) {
  const apiOpt = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? `, apiUrl: '${apiUrl}'` : '';
  const candidates = [
    'src/main.tsx', 'src/main.ts',
    'src/main.jsx', 'src/main.js',
    'src/index.tsx', 'src/index.ts',
    'src/index.jsx', 'src/index.js',
  ];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('@shiplens/sdk') || content.includes('initShiplens')) {
        return cand;
      }
      const injection = `import { initShiplens } from '@shiplens/sdk';\n\ninitShiplens({ appId: '${appId}'${apiOpt} });\n`;
      fs.writeFileSync(p, injection + '\n' + content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId, apiUrl);
}

function injectVue(dir, appId, apiUrl) {
  const apiOpt = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? `, apiUrl: '${apiUrl}'` : '';
  const candidates = ['src/main.ts', 'src/main.js', 'src/App.vue'];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('@shiplens/sdk') || content.includes('initShiplens')) {
        return cand;
      }
      if (cand.endsWith('.vue') && content.includes('<script setup')) {
        const newScript = `<script setup>\nimport { onMounted } from 'vue';\nimport { initShiplens } from '@shiplens/sdk';\n\nonMounted(() => {\n  initShiplens({ appId: '${appId}'${apiOpt} });\n});\n`;
        content = content.replace('<script setup>', newScript);
        fs.writeFileSync(p, content, 'utf8');
        return cand;
      }
      const injection = `import { initShiplens } from '@shiplens/sdk';\n\ninitShiplens({ appId: '${appId}'${apiOpt} });\n`;
      fs.writeFileSync(p, injection + '\n' + content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId, apiUrl);
}

function injectHTML(dir, appId, apiUrl) {
  const apiAttr = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? ` data-api-url="${apiUrl}"` : '';
  const candidates = ['index.html', 'public/index.html', 'src/index.html'];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('cdn.shiplens.dev/sdk.js') || content.includes(appId)) {
        return cand;
      }
      const scriptTag = `    <script src="https://cdn.shiplens.dev/sdk.js" data-app-id="${appId}"${apiAttr} defer></script>\n`;
      if (content.includes('</head>')) {
        content = content.replace('</head>', `${scriptTag}  </head>`);
      } else if (content.includes('</body>')) {
        content = content.replace('</body>', `${scriptTag}  </body>`);
      } else {
        content += '\n' + scriptTag;
      }
      fs.writeFileSync(p, content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId, apiUrl);
}

function injectCRA(dir, appId, apiUrl) {
  const apiOpt = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? `, apiUrl: '${apiUrl}'` : '';
  const candidates = [
    'src/index.tsx', 'src/index.ts',
    'src/index.jsx', 'src/index.js',
  ];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('@shiplens/sdk') || content.includes('initShiplens') || content.includes(appId)) {
        return cand;
      }
      const injection = `\n// Shiplens SDK - User Analytics\nconst { initShiplens } = require('@shiplens/sdk');\ninitShiplens({ appId: '${appId}'${apiOpt} });\n`;
      fs.writeFileSync(p, content + injection, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId, apiUrl);
}

function injectFallback(dir, appId, apiUrl) {
  const apiOpt = apiUrl && apiUrl !== 'https://api.shiplens.dev' ? `\n      apiUrl: '${apiUrl}',` : '';
  const configFile = path.join(dir, 'shiplens.config.ts');
  const content = `import { initShiplens } from '@shiplens/sdk';\n\nexport function setupShiplens() {\n  if (typeof window !== 'undefined') {\n    initShiplens({\n      appId: '${appId}',${apiOpt}\n    });\n  }\n}\n`;
  fs.writeFileSync(configFile, content, 'utf8');
  return 'shiplens.config.ts';
}

function injectSDK(dir, framework, appId, apiUrl) {
  switch (framework) {
    case FRAMEWORKS.NEXT_APP:
      return injectNextApp(dir, appId, apiUrl);
    case FRAMEWORKS.NEXT_PAGES:
      return injectNextPages(dir, appId, apiUrl);
    case FRAMEWORKS.CRA:
      return injectCRA(dir, appId, apiUrl);
    case FRAMEWORKS.VUE:
      return injectVue(dir, appId, apiUrl);
    case FRAMEWORKS.VITE:
      return injectVite(dir, appId, apiUrl);
    case FRAMEWORKS.HTML:
      return injectHTML(dir, appId, apiUrl);
    default:
      if (
        fs.existsSync(path.join(dir, 'src/app/layout.tsx')) ||
        fs.existsSync(path.join(dir, 'app/layout.tsx')) ||
        fs.existsSync(path.join(dir, 'src/app/layout.js')) ||
        fs.existsSync(path.join(dir, 'app/layout.js')) ||
        fs.existsSync(path.join(dir, 'src/app/layout.jsx')) ||
        fs.existsSync(path.join(dir, 'app/layout.jsx'))
      ) {
        return injectNextApp(dir, appId, apiUrl);
      }
      if (
        fs.existsSync(path.join(dir, 'src/pages/_app.tsx')) ||
        fs.existsSync(path.join(dir, 'pages/_app.tsx')) ||
        fs.existsSync(path.join(dir, 'src/pages/_app.jsx')) ||
        fs.existsSync(path.join(dir, 'pages/_app.jsx')) ||
        fs.existsSync(path.join(dir, 'src/pages/_app.js')) ||
        fs.existsSync(path.join(dir, 'pages/_app.js'))
      ) {
        return injectNextPages(dir, appId, apiUrl);
      }
      if (
        fs.existsSync(path.join(dir, 'src/index.tsx')) ||
        fs.existsSync(path.join(dir, 'src/index.ts')) ||
        fs.existsSync(path.join(dir, 'src/index.jsx')) ||
        fs.existsSync(path.join(dir, 'src/index.js'))
      ) {
        return injectCRA(dir, appId, apiUrl);
      }
      if (
        fs.existsSync(path.join(dir, 'src/main.tsx')) ||
        fs.existsSync(path.join(dir, 'src/main.ts')) ||
        fs.existsSync(path.join(dir, 'src/main.jsx')) ||
        fs.existsSync(path.join(dir, 'src/main.js')) ||
        fs.existsSync(path.join(dir, 'src/App.vue'))
      ) {
        return injectVite(dir, appId, apiUrl);
      }
      if (fs.existsSync(path.join(dir, 'index.html')) || fs.existsSync(path.join(dir, 'public/index.html')) || fs.existsSync(path.join(dir, 'src/index.html'))) {
        return injectHTML(dir, appId, apiUrl);
      }
      return injectFallback(dir, appId, apiUrl);
  }
}

function killProcess(child) {
  if (!child || child.killed) return;
  try {
    if (process.platform === 'win32' && child.pid) {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } catch (e) {
        try { child.kill('SIGKILL'); } catch (err) {}
      }
    } else {
      try { child.kill('SIGTERM'); } catch (e) {}
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (e) {}
      }, 500);
    }
  } catch (e) {
    try { child.kill(); } catch (err) {}
  }
}

async function installSDKDependency(dir, pkgManager = 'npm') {
  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.cmd' : '';

  const sources = [
    {
      id: 'npmjs',
      name: 'npm registry',
      getCommand: (pm) => {
        if (pm === 'pnpm') return `pnpm${ext} add @shiplens/sdk`;
        if (pm === 'yarn') return `yarn${ext} add @shiplens/sdk`;
        if (pm === 'bun') return `bun${ext} add @shiplens/sdk`;
        return `npm${ext} install @shiplens/sdk --legacy-peer-deps --no-audit --no-fund`;
      },
    },
    {
      id: 'npmmirror',
      name: 'Alibaba Cloud mirror (npmmirror)',
      getCommand: (pm) => {
        const mirror = '--registry=https://registry.npmmirror.com';
        if (pm === 'pnpm') return `pnpm${ext} add @shiplens/sdk ${mirror}`;
        if (pm === 'yarn') return `yarn${ext} add @shiplens/sdk ${mirror}`;
        if (pm === 'bun') return `bun${ext} add @shiplens/sdk ${mirror}`;
        return `npm${ext} install @shiplens/sdk ${mirror} --legacy-peer-deps --no-audit --no-fund`;
      },
    },
    {
      id: 'github',
      name: 'GitHub mirror',
      getCommand: (pm) => {
        const repoUrl = 'https://github.com/Hyperlong/shiplens-sdk.git';
        if (pm === 'pnpm') return `pnpm${ext} add ${repoUrl}`;
        if (pm === 'yarn') return `yarn${ext} add ${repoUrl}`;
        if (pm === 'bun') return `bun${ext} add ${repoUrl}`;
        return `npm${ext} install ${repoUrl} --legacy-peer-deps --no-audit --no-fund`;
      },
    },
    {
      id: 'cdn',
      name: 'Shiplens CDN mirror',
      getCommand: (pm) => {
        const cdnUrl = 'https://cdn.shiplens.dev/packages/shiplens-sdk.tgz';
        if (pm === 'pnpm') return `pnpm${ext} add ${cdnUrl}`;
        if (pm === 'yarn') return `yarn${ext} add ${cdnUrl}`;
        if (pm === 'bun') return `bun${ext} add ${cdnUrl}`;
        return `npm${ext} install ${cdnUrl} --legacy-peer-deps --no-audit --no-fund`;
      },
    },
  ];

  const TIER1_DELAY_MS = 5 * 1000; // 5s (fast-forward backup mirrors on high latency)
  const TOTAL_TIMEOUT_MS = 5 * 60 * 1000; // 5min

  return new Promise((resolve) => {
    let isDone = false;
    const activeChildren = new Set();
    let tier2Timer = null;
    let totalTimer = null;
    let startedCount = 0;
    let finishedFailureCount = 0;

    const cleanupAndFinish = (result) => {
      if (isDone) return;
      isDone = true;
      if (tier2Timer) clearTimeout(tier2Timer);
      if (totalTimer) clearTimeout(totalTimer);
      for (const child of activeChildren) {
        killProcess(child);
      }
      activeChildren.clear();
      resolve(result);
    };

    const runSource = (source) => {
      if (isDone) return;
      startedCount++;
      const cmd = source.getCommand(pkgManager);
      let child;
      try {
        child = spawn(cmd, { cwd: dir, shell: true, stdio: 'ignore' });
      } catch (e) {
        finishedFailureCount++;
        checkAllFailed();
        return;
      }

      activeChildren.add(child);

      const onExit = (code) => {
        activeChildren.delete(child);
        if (isDone) return;
        if (code === 0) {
          cleanupAndFinish({
            success: true,
            manager: pkgManager,
            source: source.name,
          });
        } else {
          finishedFailureCount++;
          if (source.id === 'npmjs' && tier2Timer) {
            clearTimeout(tier2Timer);
            tier2Timer = null;
            startBackupSources();
          }
          checkAllFailed();
        }
      };

      child.on('close', onExit);
      child.on('error', () => onExit(1));
    };

    const startBackupSources = () => {
      if (isDone) return;
      if (tier2Timer) {
        clearTimeout(tier2Timer);
        tier2Timer = null;
      }
      for (let i = 1; i < sources.length; i++) {
        runSource(sources[i]);
      }
    };

    const checkAllFailed = () => {
      if (isDone) return;
      if (startedCount === sources.length && finishedFailureCount === sources.length) {
        cleanupAndFinish({
          success: false,
          manager: pkgManager,
          error: 'All 4 download sources failed or timed out',
        });
      }
    };

    // t = 0s: Start Tier 1 (npmjs)
    runSource(sources[0]);

    // t = 20s: If still running, keep npmjs alive and start npmmirror + GitHub + CDN
    tier2Timer = setTimeout(() => {
      startBackupSources();
    }, TIER1_DELAY_MS);

    // t = 5min: Total timeout across all sources
    totalTimer = setTimeout(() => {
      cleanupAndFinish({
        success: false,
        manager: pkgManager,
        error: 'SDK installation timed out after 5 minutes across all download sources',
      });
    }, TOTAL_TIMEOUT_MS);
  });
}

function getGitEmail() {
  try {
    return execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function ensureGitignore(dir = process.cwd()) {
  const ignorePath = path.join(dir, '.gitignore');
  try {
    const ignored = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
    const lines = ignored.split(/\r?\n/).map((l) => l.trim());
    const hasRule = lines.some((l) => l === 'shiplens.env*' || l === 'shiplens.env' || l === '*.env' || l === '.env*');
    if (!hasRule) {
      fs.appendFileSync(ignorePath, `${ignored && !ignored.endsWith('\n') ? '\n' : ''}# Shiplens credentials\nshiplens.env*\n`);
    }
  } catch (e) {}
}

function injectSkill(dir = process.cwd()) {
  const { SKILL_CONTENT } = require('./assets/skill');
  
  // Auto-maintain .gitignore rule for credentials
  ensureGitignore(dir);

  // 1. Generate generic Agent Skill (.agents/skills/shiplens/SKILL.md)
  const agentSkillDir = path.join(dir, '.agents', 'skills', 'shiplens');
  try {
    fs.mkdirSync(agentSkillDir, { recursive: true });
    fs.writeFileSync(path.join(agentSkillDir, 'SKILL.md'), SKILL_CONTENT, 'utf8');
  } catch (e) {}

  // 2. Generate Cursor rule (.cursor/rules/shiplens.mdc)
  const cursorRulesDir = path.join(dir, '.cursor', 'rules');
  try {
    fs.mkdirSync(cursorRulesDir, { recursive: true });
    fs.writeFileSync(path.join(cursorRulesDir, 'shiplens.mdc'), SKILL_CONTENT, 'utf8');
  } catch (e) {}

  return '.agents/skills/shiplens/SKILL.md';
}

function detectExistingApp(dir = process.cwd()) {
  // 1. Check local .shiplens.json state machine
  const cfgPath = path.join(dir, '.shiplens.json');
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg && cfg.app_id) {
        return {
          has_existing: true,
          app_id: cfg.app_id,
          source_file: '.shiplens.json',
          project_name: cfg.project_name || '',
          industry: cfg.industry || '',
        };
      }
    } catch (e) {}
  }

  // 2. Check code files for existing instrumentation
  const checkFiles = [
    'src/app/layout.tsx', 'app/layout.tsx',
    'src/app/layout.jsx', 'app/layout.jsx',
    'src/app/layout.js', 'app/layout.js',
    'src/pages/_app.tsx', 'pages/_app.tsx',
    'src/pages/_app.jsx', 'pages/_app.jsx',
    'src/pages/_app.js', 'pages/_app.js',
    'src/main.tsx', 'src/main.ts',
    'src/main.jsx', 'src/main.js',
    'src/index.tsx', 'src/index.ts',
    'src/index.jsx', 'src/index.js',
    'src/App.vue', 'src/App.tsx', 'src/App.jsx',
    'index.html', 'public/index.html', 'src/index.html',
    'shiplens.config.ts', 'shiplens.config.js',
    'src/components/ShiplensTracker.tsx', 'components/ShiplensTracker.tsx',
    'src/components/ShiplensTracker.jsx', 'components/ShiplensTracker.jsx',
  ];

  for (const rel of checkFiles) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        const matchAppId = content.match(/appId\s*:\s*['"]([^'"]+)['"]/);
        if (matchAppId && matchAppId[1]) {
          return {
            has_existing: true,
            app_id: matchAppId[1],
            source_file: rel,
          };
        }
        const matchDataAppId = content.match(/data-app-id\s*=\s*['"]([^'"]+)['"]/);
        if (matchDataAppId && matchDataAppId[1]) {
          return {
            has_existing: true,
            app_id: matchDataAppId[1],
            source_file: rel,
          };
        }
        if (content.includes('@shiplens/sdk') || content.includes('cdn.shiplens.dev/sdk.js') || content.includes('initShiplens')) {
          return {
            has_existing: true,
            app_id: 'unknown_local_id',
            source_file: rel,
          };
        }
      } catch (e) {}
    }
  }

  // 3. Check package.json dependencies
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      if (deps['@shiplens/sdk']) {
        return {
          has_existing: true,
          app_id: 'configured_in_sdk',
          source_file: 'package.json',
        };
      }
    } catch (e) {}
  }

  return { has_existing: false };
}

module.exports = {
  FRAMEWORKS,
  detectPackageManager,
  detectProject,
  detectExistingApp,
  injectSDK,
  injectSkill,
  ensureGitignore,
  installSDKDependency,
  getGitEmail,
};
