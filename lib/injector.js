const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRAMEWORKS = {
  NEXT_APP: 'nextjs-app',
  NEXT_PAGES: 'nextjs-pages',
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

function detectProject(dir = process.cwd()) {
  const result = {
    framework: FRAMEWORKS.UNKNOWN,
    package_manager: detectPackageManager(dir),
    project_name: path.basename(dir),
    industry: 'saas',
    description: '',
    keywords: [],
    dependencies: {},
    devDependencies: {},
    taxonomy: null,
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

  // Extract description fallback from README if missing
  if (!result.description) {
    const readmeCandidates = ['README.md', 'readme.md', 'README.MD'];
    for (const r of readmeCandidates) {
      const p = path.join(dir, r);
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('!'));
          if (lines.length > 0) {
            result.description = lines[0].slice(0, 200);
            break;
          }
        } catch (e) {}
      }
    }
  }

  // 4-level taxonomy inference
  const taxonomy = inferTaxonomy({
    name: result.project_name,
    description: result.description,
    keywords: result.keywords,
    dependencies: result.dependencies,
    devDependencies: result.devDependencies,
    framework: result.framework,
  });

  result.taxonomy = taxonomy;
  result.industry = taxonomy.subgenre.id || taxonomy.genre.id || 'saas';

  return result;
}

function injectNextApp(dir, appId) {
  const candidates = [
    'src/app/layout.tsx', 'app/layout.tsx',
    'src/app/layout.jsx', 'app/layout.jsx',
    'src/app/layout.js', 'app/layout.js',
  ];

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
    const compContent = `'use client';\n\nimport { useEffect } from 'react';\nimport { initShiplens } from '@shiplens/sdk';\n\nexport function ShiplensTracker() {\n  useEffect(() => {\n    initShiplens({ appId: '${appId}' });\n  }, []);\n  return null;\n}\n`;
    fs.writeFileSync(compPath, compContent, 'utf8');
    return path.relative(dir, compPath).replace(/\\/g, '/');
  }

  let content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes('@shiplens/sdk') || content.includes('initShiplens') || content.includes(appId)) {
    return relPath;
  }

  if (content.includes("'use client'") || content.includes('"use client"')) {
    const newContent = `import { initShiplens } from '@shiplens/sdk';\n\nif (typeof window !== 'undefined') {\n  initShiplens({ appId: '${appId}' });\n}\n` + content;
    fs.writeFileSync(targetPath, newContent, 'utf8');
    return relPath;
  }

  const compDir = path.dirname(targetPath);
  const ext = targetPath.endsWith('.js') || targetPath.endsWith('.jsx') ? '.jsx' : '.tsx';
  const trackerFile = path.join(compDir, `ShiplensTracker${ext}`);
  const trackerContent = `'use client';\n\nimport { useEffect } from 'react';\nimport { initShiplens } from '@shiplens/sdk';\n\nexport function ShiplensTracker() {\n  useEffect(() => {\n    initShiplens({ appId: '${appId}' });\n  }, []);\n  return null;\n}\n`;
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

function injectNextPages(dir, appId) {
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
      const injection = `import { useEffect } from 'react';\nimport { initShiplens } from '@shiplens/sdk';\n\nif (typeof window !== 'undefined') {\n  initShiplens({ appId: '${appId}' });\n}\n`;
      fs.writeFileSync(p, injection + '\n' + content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId);
}

function injectVite(dir, appId) {
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
      const injection = `import { initShiplens } from '@shiplens/sdk';\n\ninitShiplens({ appId: '${appId}' });\n`;
      fs.writeFileSync(p, injection + '\n' + content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId);
}

function injectVue(dir, appId) {
  const candidates = ['src/main.ts', 'src/main.js', 'src/App.vue'];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('@shiplens/sdk') || content.includes('initShiplens')) {
        return cand;
      }
      if (cand.endsWith('.vue') && content.includes('<script setup')) {
        const newScript = `<script setup>\nimport { onMounted } from 'vue';\nimport { initShiplens } from '@shiplens/sdk';\n\nonMounted(() => {\n  initShiplens({ appId: '${appId}' });\n});\n`;
        content = content.replace('<script setup>', newScript);
        fs.writeFileSync(p, content, 'utf8');
        return cand;
      }
      const injection = `import { initShiplens } from '@shiplens/sdk';\n\ninitShiplens({ appId: '${appId}' });\n`;
      fs.writeFileSync(p, injection + '\n' + content, 'utf8');
      return cand;
    }
  }
  return injectFallback(dir, appId);
}

function injectHTML(dir, appId) {
  const candidates = ['index.html', 'public/index.html', 'src/index.html'];
  for (const cand of candidates) {
    const p = path.join(dir, cand);
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('cdn.shiplens.dev/sdk.js') || content.includes(appId)) {
        return cand;
      }
      const scriptTag = `    <script src="https://cdn.shiplens.dev/sdk.js" data-app-id="${appId}" defer></script>\n`;
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
  return injectFallback(dir, appId);
}

function injectFallback(dir, appId) {
  const configFile = path.join(dir, 'shiplens.config.ts');
  const content = `import { initShiplens } from '@shiplens/sdk';\n\nexport function setupShiplens() {\n  if (typeof window !== 'undefined') {\n    initShiplens({\n      appId: '${appId}',\n    });\n  }\n}\n`;
  fs.writeFileSync(configFile, content, 'utf8');
  return 'shiplens.config.ts';
}

function injectSDK(dir, framework, appId) {
  switch (framework) {
    case FRAMEWORKS.NEXT_APP:
      return injectNextApp(dir, appId);
    case FRAMEWORKS.NEXT_PAGES:
      return injectNextPages(dir, appId);
    case FRAMEWORKS.VUE:
      return injectVue(dir, appId);
    case FRAMEWORKS.VITE:
      return injectVite(dir, appId);
    case FRAMEWORKS.HTML:
      return injectHTML(dir, appId);
    default:
      try { return injectNextApp(dir, appId); } catch (e) {}
      try { return injectVite(dir, appId); } catch (e) {}
      try { return injectHTML(dir, appId); } catch (e) {}
      return injectFallback(dir, appId);
  }
}

function installSDKDependency(dir, pkgManager = 'npm') {
  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.cmd' : '';
  
  // 1. Define 4-Tier Download Sources with 5s timeout & 2 retries per tier
  // Tier 1: NPM official/default registry
  // Tier 2: Alibaba Cloud / Taobao npm mirror (https://registry.npmmirror.com)
  // Tier 3: GitHub repository mirror
  // Tier 4: Shiplens official CDN mirror
  const sources = [
    {
      name: 'npm registry',
      getCommand: (pm) => {
        if (pm === 'pnpm') return `pnpm${ext} add @shiplens/sdk`;
        if (pm === 'yarn') return `yarn${ext} add @shiplens/sdk`;
        if (pm === 'bun') return `bun${ext} add @shiplens/sdk`;
        return `npm${ext} install @shiplens/sdk --legacy-peer-deps --no-audit --no-fund`;
      },
    },
    {
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

  let lastError = null;
  const RETRIES_PER_TIER = 2;
  const TIMEOUT_MS = 5000; // 5 seconds per attempt

  for (const source of sources) {
    const cmd = source.getCommand(pkgManager);
    
    // Attempt with primary package manager (up to 2 retries, 5s timeout each)
    for (let attempt = 1; attempt <= RETRIES_PER_TIER; attempt++) {
      try {
        execSync(cmd, { cwd: dir, stdio: 'ignore', timeout: TIMEOUT_MS });
        return { success: true, manager: pkgManager, source: source.name, attempt };
      } catch (err) {
        lastError = err;
      }
    }

    // If primary package manager failed and isn't npm, attempt npm fallback on this source (up to 2 retries, 5s timeout each)
    if (pkgManager !== 'npm') {
      const npmCmd = source.getCommand('npm');
      for (let attempt = 1; attempt <= RETRIES_PER_TIER; attempt++) {
        try {
          execSync(npmCmd, { cwd: dir, stdio: 'ignore', timeout: TIMEOUT_MS });
          return { success: true, manager: 'npm (fallback)', source: source.name, attempt };
        } catch (npmErr) {
          lastError = npmErr;
        }
      }
    }
  }

  return {
    success: false,
    manager: pkgManager,
    error: lastError ? lastError.message : 'All 4 download sources timed out or failed (5s x 2 retries each)',
  };
}

function getGitEmail() {
  try {
    return execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function injectSkill(dir = process.cwd()) {
  const { SKILL_CONTENT } = require('./assets/skill');
  
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

function autoGitCommit(dir = process.cwd(), message = 'feat: Integrate Shiplens SDK and generate configuration & dashboards') {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: dir, stdio: 'ignore' });
    const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf8' }).trim();
    if (status) {
      execSync('git add .', { cwd: dir, stdio: 'ignore' });
      execSync(`git commit -m "${message}"`, { cwd: dir, stdio: 'ignore' });
      const hash = execSync('git rev-parse --short HEAD', { cwd: dir, encoding: 'utf8' }).trim();
      return { committed: true, hash, message };
    }
  } catch (e) {
    return { committed: false, error: e.message };
  }
  return { committed: false, reason: 'no_changes' };
}

module.exports = {
  FRAMEWORKS,
  detectPackageManager,
  detectProject,
  detectExistingApp,
  injectSDK,
  injectSkill,
  installSDKDependency,
  getGitEmail,
  autoGitCommit,
};
