const path = require('path');
const fs = require('fs');

let taxonomyCache = null;
let indexCache = null;

function loadTaxonomy() {
  if (taxonomyCache) return taxonomyCache;
  const filePath = path.join(__dirname, 'assets', 'taxonomy.json');
  try {
    if (fs.existsSync(filePath)) {
      taxonomyCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      taxonomyCache = { genres: [] };
    }
  } catch (e) {
    taxonomyCache = { genres: [] };
  }
  return taxonomyCache;
}

function buildIndex() {
  if (indexCache) return indexCache;
  const data = loadTaxonomy();
  const genresMap = new Map();
  const subgenresMap = new Map();
  const tagsMap = new Map();

  for (const g of data.genres || []) {
    const genreObj = {
      id: g.id,
      name: g.name,
      type: g.type || 'App',
      subgenres: new Map(),
    };
    genresMap.set(g.id, genreObj);

    for (const sg of g.subgenres || []) {
      const subObj = {
        id: sg.id,
        name: sg.name,
        genre_id: g.id,
        genre_name: g.name,
        genre_type: g.type || 'App',
        tag_categories: sg.tag_categories || {},
      };
      genreObj.subgenres.set(sg.id, subObj);
      subgenresMap.set(sg.id, subObj);

      if (sg.tag_categories) {
        for (const [catKey, tagList] of Object.entries(sg.tag_categories)) {
          if (Array.isArray(tagList)) {
            for (const t of tagList) {
              tagsMap.set(t.tag_id, {
                tag_id: t.tag_id,
                name: t.name,
                category: catKey,
                subgenre_id: sg.id,
                subgenre_name: sg.name,
                genre_id: g.id,
                genre_name: g.name,
                genre_type: g.type || 'App',
              });
            }
          }
        }
      }
    }
  }

  indexCache = { genresMap, subgenresMap, tagsMap };
  return indexCache;
}

const CATEGORY_DISPLAY_NAMES = {
  core_features: 'Core Features',
  monetization: 'Monetization',
  social_engagement: 'Social & Growth',
  technical_platform: 'Technical Platform',
  content_theme: 'Content & Compliance',
};

/**
 * Automatically infer 4-level taxonomy and feature tags from project context
 */
function inferTaxonomy(projectContext = {}) {
  const { genresMap, subgenresMap, tagsMap } = buildIndex();
  const {
    name = '',
    description = '',
    keywords = [],
    dependencies = {},
    devDependencies = {},
    framework = '',
    readme = {},
    i18n = {},
    htmlHead = {},
  } = projectContext;

  const allDeps = Object.assign({}, dependencies, devDependencies);
  const depKeys = Object.keys(allDeps).map((k) => k.toLowerCase());
  
  const i18nText = (i18n.rawList || []).map((t) => `${t.key} ${t.val}`).join(' ');
  const readmeText = `${readme.title || ''} ${readme.description || ''}`;
  const htmlText = `${htmlHead.title || ''} ${htmlHead.description || ''}`;
  const combinedText = `${name} ${description} ${(keywords || []).join(' ')} ${framework} ${readmeText} ${i18nText} ${htmlText}`.toLowerCase();

  let matchedGenreId = 'utilities';
  let matchedSubgenreId = 'developer_tools';
  const matchedTags = new Set();

  // 1. Game & Gaming Companion / Simulation detection
  const isAnimalCrossingOrGameUtility =
    /\b(animal crossing|acnh|动森|动物森友会|stalk market|turnip-calc|turnip calculator|大头菜|stalks)\b/i.test(combinedText);

  const isGame =
    isAnimalCrossingOrGameUtility ||
    depKeys.some((d) => ['phaser', 'pixi.js', 'three', 'kaboom', 'melonjs'].includes(d)) ||
    /\b(game|gaming|arcade|rpg|puzzle|casual|roguelike|fps|chess|cards|tycoon|simulation|gamer|nintendo)\b/i.test(combinedText);

  if (isAnimalCrossingOrGameUtility) {
    matchedGenreId = 'game_simulation';
    matchedSubgenreId = 'farming_village_builder';
  } else if (isGame) {
    matchedGenreId = 'game_casual_puzzle';
    matchedSubgenreId = 'merge_mechanic_puzzle';
  } else {
    // App branch inference
    if (/\b(vpn|proxy|shadowsocks|v2ray|wireguard|clash)\b/.test(combinedText)) {
      matchedGenreId = 'utilities';
      matchedSubgenreId = 'net_vpn_proxy';
    } else if (/\b(clean|booster|battery|ram|storage|cache)\b/.test(combinedText)) {
      matchedGenreId = 'utilities';
      matchedSubgenreId = 'system_cleaner_optimizer';
    } else if (/\b(finance|financial|stock|crypto|accounting|tax|invoice|budget|banking|wealth|defi|trading)\b/.test(combinedText) && !/\b(turnip|stalk)\b/.test(combinedText)) {
      matchedGenreId = 'finance_fintech';
      if (/\b(stock|trading|invest)\b/.test(combinedText)) {
        matchedSubgenreId = 'stock_trading_investment';
      } else if (/\b(crypto|wallet|exchange|bitcoin|eth)\b/.test(combinedText)) {
        matchedSubgenreId = 'crypto_wallet_exchange';
      } else {
        matchedSubgenreId = 'personal_budgeting_accounting';
      }
    } else if (/\b(shop|store|ecommerce|cart|checkout|product|shopify|order|retail)\b/.test(combinedText)) {
      matchedGenreId = 'shopping_ecommerce';
      matchedSubgenreId = 'marketplace_general_retail';
    } else if (/\b(chat|message|social|community|forum|feed|comment|social_media|dating)\b/.test(combinedText)) {
      matchedGenreId = 'social';
      matchedSubgenreId = 'interest_community_forum';
    } else if (/\b(team|crm|sales|hrm|agile|collaboration|meeting|pipeline)\b/.test(combinedText)) {
      matchedGenreId = 'business';
      matchedSubgenreId = 'project_agile_management';
    } else if (/\b(task|todo|note|docs|editor|kanban|calendar|workflow|productivity|markdown|pomodoro)\b/.test(combinedText)) {
      matchedGenreId = 'productivity';
      matchedSubgenreId = 'todo_task_management';
    } else if (/\b(video|audio|music|media|player|streaming|podcast|stream|record|camera|photo)\b/.test(combinedText)) {
      matchedGenreId = 'photo_and_video';
      matchedSubgenreId = 'short_video_creation_editor';
    } else {
      matchedGenreId = 'utilities';
      matchedSubgenreId = 'browser_web_utility';
    }
  }

  // Ensure valid genre and subgenre
  if (!genresMap.has(matchedGenreId)) {
    matchedGenreId = genresMap.keys().next().value || 'utilities';
  }
  const currentGenreObj = genresMap.get(matchedGenreId);
  if (!currentGenreObj.subgenres.has(matchedSubgenreId)) {
    matchedSubgenreId = currentGenreObj.subgenres.keys().next().value || 'developer_tools';
  }

  const currentSubObj = currentGenreObj.subgenres.get(matchedSubgenreId) || subgenresMap.get(matchedSubgenreId);

  // 2. Pick feature tags from categories
  if (currentSubObj && currentSubObj.tag_categories) {
    const cats = currentSubObj.tag_categories;

    // A. Core Features (select 2~3)
    const coreList = cats.core_features || [];
    if (coreList.length > 0) {
      let added = 0;
      for (const tag of coreList) {
        const tagWords = tag.tag_id.split('_').concat(tag.name.toLowerCase().split(/\s+/));
        if (tagWords.some((w) => w.length > 3 && combinedText.includes(w))) {
          matchedTags.add(tag.tag_id);
          added++;
          if (added >= 3) break;
        }
      }
      if (added === 0) {
        for (let i = 0; i < Math.min(2, coreList.length); i++) {
          matchedTags.add(coreList[i].tag_id);
        }
      }
    }

    // B. Monetization (select 1)
    const monList = cats.monetization || [];
    if (monList.length > 0) {
      let monTag = null;
      if (depKeys.some((d) => d.includes('stripe') || d.includes('lemon') || d.includes('paddle') || d.includes('paypal'))) {
        monTag = monList.find((t) => t.tag_id.includes('sub') || t.tag_id.includes('vip') || t.name.toLowerCase().includes('subscription')) || monList[0];
      } else if (depKeys.some((d) => d.includes('admob') || d.includes('ads') || d.includes('google-ad'))) {
        monTag = monList.find((t) => t.tag_id.includes('ad') || t.name.toLowerCase().includes('ad')) || monList[0];
      } else {
        monTag = monList[0];
      }
      if (monTag) matchedTags.add(monTag.tag_id);
    }

    // C. Technical Platform (select 1)
    const techList = cats.technical_platform || [];
    if (techList.length > 0) {
      let techTag = techList[0];
      for (const t of techList) {
        const tWords = t.tag_id.split('_').concat(t.name.toLowerCase().split(/\s+/));
        if (tWords.some((w) => w.length > 3 && combinedText.includes(w))) {
          techTag = t;
          break;
        }
      }
      if (techTag) matchedTags.add(techTag.tag_id);
    }

    // D. Social Engagement (select 1)
    const socList = cats.social_engagement || [];
    if (socList.length > 0) {
      matchedTags.add(socList[0].tag_id);
    }
  }

  // Assemble tag details
  const tagDetails = [];
  for (const tagId of matchedTags) {
    const info = tagsMap.get(tagId);
    if (info) {
      tagDetails.push({
        tag_id: info.tag_id,
        name: info.name,
        category: info.category,
        category_name: CATEGORY_DISPLAY_NAMES[info.category] || info.category,
      });
    } else {
      tagDetails.push({
        tag_id: tagId,
        name: tagId.replace(/_/g, ' '),
        category: 'core_features',
        category_name: 'Core Features',
      });
    }
  }

  return {
    genre: {
      id: currentGenreObj?.id || matchedGenreId,
      name: currentGenreObj?.name || 'Utilities',
      type: currentGenreObj?.type || 'App',
    },
    subgenre: {
      id: currentSubObj?.id || matchedSubgenreId,
      name: currentSubObj?.name || 'Developer Tools',
    },
    feature_tags: tagDetails,
    feature_tag_ids: Array.from(matchedTags),
  };
}

/**
 * Format taxonomy summary into 4-Level structure
 */
function formatTaxonomySummary(taxonomy) {
  if (!taxonomy || !taxonomy.genre) return '';

  const genreStr = `${taxonomy.genre.name} (${taxonomy.genre.type})`;
  const subgenreStr = taxonomy.subgenre ? taxonomy.subgenre.name : '';

  const categorized = {};
  for (const t of taxonomy.feature_tags || []) {
    const cat = t.category || 'core_features';
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(`${t.tag_id} (${t.name})`);
  }

  const lines = [
    `  • Genre (L1): ${genreStr}`,
    `  • Sub-genre (L2): ${subgenreStr}`,
    `  • Feature Tags:`,
  ];

  for (const [catKey, items] of Object.entries(categorized)) {
    const catName = CATEGORY_DISPLAY_NAMES[catKey] || catKey;
    lines.push(`    - [${catName}]: ${items.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Resolve taxonomy from genreId, subgenreId, and tagIdList
 */
function resolveTaxonomyFromIDs(genreId, subgenreId, tagIdList = []) {
  const { genresMap, subgenresMap, tagsMap } = buildIndex();

  let genre = null;
  let subgenre = null;

  if (genreId && genresMap.has(genreId)) {
    genre = genresMap.get(genreId);
  }
  if (subgenreId && subgenresMap.has(subgenreId)) {
    subgenre = subgenresMap.get(subgenreId);
    if (!genre && subgenre.genre_id && genresMap.has(subgenre.genre_id)) {
      genre = genresMap.get(subgenre.genre_id);
    }
  }

  if (!genre) {
    genre = genresMap.get('utilities') || { id: 'utilities', name: 'Utilities', type: 'App' };
  }
  if (!subgenre) {
    subgenre = subgenresMap.get('developer_tools') || { id: 'developer_tools', name: 'Developer Tools' };
  }

  const feature_tags = [];
  for (const tid of tagIdList) {
    if (tagsMap.has(tid)) {
      const t = tagsMap.get(tid);
      feature_tags.push({
        tag_id: t.tag_id,
        name: t.name,
        category: t.category,
        category_name: CATEGORY_DISPLAY_NAMES[t.category] || t.category,
      });
    } else {
      feature_tags.push({
        tag_id: tid,
        name: tid.replace(/_/g, ' '),
        category: 'core_features',
        category_name: 'Core Features',
      });
    }
  }

  return {
    genre: {
      id: genre.id,
      name: genre.name,
      type: genre.type || 'App',
    },
    subgenre: {
      id: subgenre.id,
      name: subgenre.name,
    },
    feature_tags,
    feature_tag_ids: tagIdList,
  };
}

module.exports = {
  loadTaxonomy,
  buildIndex,
  inferTaxonomy,
  formatTaxonomySummary,
  resolveTaxonomyFromIDs,
  CATEGORY_DISPLAY_NAMES,
};
