const path = require('path');
const fs = require('fs');

let taxonomyCache = null;
let indexCache = null;

function loadTaxonomy() {
  if (taxonomyCache) return taxonomyCache;

  // 1. Try local CLI assets/taxonomy.json
  const assetPath = path.join(__dirname, 'assets', 'taxonomy.json');
  // 2. Try root workspace Taxonomy.json / 产品品类分类表/Taxonomy.json
  const rootPath = path.resolve(__dirname, '..', '..', '..', 'Taxonomy.json');
  const catPath = path.resolve(__dirname, '..', '..', '..', '产品品类分类表', 'Taxonomy.json');

  const candidates = [assetPath, catPath, rootPath];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (parsed.genres && parsed.genres.length >= 19) {
          taxonomyCache = parsed;
          return taxonomyCache;
        }
      } catch (e) {}
    }
  }

  taxonomyCache = taxonomyCache || { genres: [] };
  return taxonomyCache;
}

function buildIndex() {
  if (indexCache) return indexCache;
  const data = loadTaxonomy();
  const genresMap = new Map();
  const subgenresMap = new Map();
  const tagsMap = new Map();
  const subgenreTagsMap = new Map(); // subgenre_id -> Set<tag_id>

  for (const g of data.genres || []) {
    const genreObj = {
      id: g.id,
      name: g.name,
      name_zh: g.name_zh || g.name,
      type: g.type || 'App',
      subgenres: new Map(),
    };
    genresMap.set(g.id, genreObj);

    for (const sg of g.subgenres || []) {
      const subObj = {
        id: sg.id,
        name: sg.name,
        name_zh: sg.name_zh || sg.name,
        genre_id: g.id,
        genre_name: g.name,
        genre_type: g.type || 'App',
        tag_categories: sg.tag_categories || {},
      };
      genreObj.subgenres.set(sg.id, subObj);
      subgenresMap.set(sg.id, subObj);

      const sTags = new Set();
      if (sg.tag_categories) {
        for (const [catKey, tagList] of Object.entries(sg.tag_categories)) {
          if (Array.isArray(tagList)) {
            for (const t of tagList) {
              const tagId = typeof t === 'string' ? t : t.tag_id;
              const tagName = typeof t === 'string' ? t.replace(/_/g, ' ') : (t.name || tagId);
              sTags.add(tagId);
              tagsMap.set(tagId, {
                tag_id: tagId,
                name: tagName,
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
      subgenreTagsMap.set(sg.id, sTags);
    }
  }

  indexCache = { genresMap, subgenresMap, tagsMap, subgenreTagsMap };
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
 * 校验指定分类和标签是否完全符合内置的四级分类表（反幻觉校验引擎）
 */
function validateTaxonomy(genreId, subgenreId, tagIds = []) {
  const { genresMap, subgenresMap, subgenreTagsMap } = buildIndex();
  const errors = [];

  if (!genreId || !genresMap.has(genreId)) {
    errors.push(`Invalid genre_id: '${genreId}'. Expected one of: ${Array.from(genresMap.keys()).join(', ')}`);
  }

  let validSubgenre = false;
  if (!subgenreId || !subgenresMap.has(subgenreId)) {
    errors.push(`Invalid subgenre_id: '${subgenreId}'`);
  } else {
    const genreObj = genresMap.get(genreId);
    if (genreObj && !genreObj.subgenres.has(subgenreId)) {
      errors.push(`Subgenre '${subgenreId}' does not belong to Genre '${genreId}'. Belongs to '${subgenresMap.get(subgenreId)?.genre_id}'`);
    } else {
      validSubgenre = true;
    }
  }

  const validTagIds = [];
  const allowedTags = validSubgenre ? (subgenreTagsMap.get(subgenreId) || new Set()) : new Set();
  for (const tid of tagIds) {
    if (allowedTags.has(tid)) {
      validTagIds.push(tid);
    } else {
      errors.push(`Tag '${tid}' does not exist in subgenre '${subgenreId}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validTagIds,
  };
}

/**
 * 19 权威品类特征识别规则定义
 */
const GENRE_RULES = [
  // 1. game_strategy
  {
    genre_id: 'game_strategy',
    default_subgenre: '4x_march_battle_slg',
    test: (text, deps) => {
      if (/\b(freeciv|civilization|4x|slg|turn-based strategy|tbs|empire builder|hex map|march battle|march-battle)\b/i.test(text)) {
        return { match: true, subgenre: '4x_march_battle_slg', score: 100 };
      }
      if (/\b(tower defense|tower-defense|td game|塔防|hero placement)\b/i.test(text)) {
        return { match: true, subgenre: 'tower_defense_tactical', score: 95 };
      }
      if (/\b(auto chess|autochess|auto-battler|自走棋|squad battler)\b/i.test(text)) {
        return { match: true, subgenre: 'auto_chess_battler', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 2. game_rpg
  {
    genre_id: 'game_rpg',
    default_subgenre: 'anime_gacha_open_world',
    test: (text, deps) => {
      if (/\b(gacha|genshin|star rail|anime rpg|二次元|抽卡|open-world rpg)\b/i.test(text)) {
        return { match: true, subgenre: 'anime_gacha_open_world', score: 100 };
      }
      if (/\b(idle rpg|afk rpg|hero collector|放置rpg|挂机卡牌)\b/i.test(text)) {
        return { match: true, subgenre: 'idle_afk_hero_collector', score: 95 };
      }
      if (/\b(browserquest|mmo rpg|mmorpg|guild battle|guild raid|multiplayer rpg)\b/i.test(text)) {
        return { match: true, subgenre: 'mmorpg_guild_sandbox', score: 90 };
      }
      if (/\b(hack and slash|arpg|action rpg|dungeon crawler|roguelike|割草)\b/i.test(text)) {
        return { match: true, subgenre: 'arpg_hack_and_slash', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 3. game_action_shooter
  {
    genre_id: 'game_action_shooter',
    default_subgenre: 'battle_royale_survival',
    test: (text, deps) => {
      if (/\b(battle royale|pubg|fortnite|apex|吃鸡|tactical survival)\b/i.test(text)) {
        return { match: true, subgenre: 'battle_royale_survival', score: 100 };
      }
      if (/\b(fps|tps|first-person shooter|third-person shooter|gun game|射击游戏)\b/i.test(text)) {
        return { match: true, subgenre: 'battle_royale_survival', score: 90 };
      }
      if (/\b(moba|dota|league of legends|5v5|esports|competitive esports|推塔)\b/i.test(text)) {
        return { match: true, subgenre: 'moba_competitive_esports', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 4. game_casual_puzzle
  {
    genre_id: 'game_casual_puzzle',
    default_subgenre: 'match_3_meta_renovation',
    test: (text, deps) => {
      if (/\b(match-3|match 3|match three|tile match|三消|消除|renovation)\b/i.test(text)) {
        return { match: true, subgenre: 'match_3_meta_renovation', score: 100 };
      }
      if (/\b(2048|merge|merge-2|merge-3|puzzle|sliding puzzle|合成解谜)\b/i.test(text)) {
        return { match: true, subgenre: 'merge_mechanic_puzzle', score: 95 };
      }
      return { match: false, score: 0 };
    }
  },
  // 5. game_simulation
  {
    genre_id: 'game_simulation',
    default_subgenre: 'farming_village_builder',
    test: (text, deps) => {
      if (/\b(animal crossing|acnh|动森|动物森友会|stalk market|turnip-calc|turnip calculator|大头菜|stalks|farming|village builder|town builder|simulation tycoon|模拟经营)\b/i.test(text)) {
        return { match: true, subgenre: 'farming_village_builder', score: 100 };
      }
      return { match: false, score: 0 };
    }
  },
  // 6. game_casino_card
  {
    genre_id: 'game_casino_card',
    default_subgenre: 'social_slots_progressive',
    test: (text, deps) => {
      if (/\b(slots|casino|vegas|poker|blackjack|baccarat|roulette|老虎机|德州扑克)\b/i.test(text)) {
        return { match: true, subgenre: 'social_slots_progressive', score: 100 };
      }
      return { match: false, score: 0 };
    }
  },
  // 7. game_hybrid_casual
  {
    genre_id: 'game_hybrid_casual',
    default_subgenre: 'io_crowd_survival_roguelike',
    test: (text, deps) => {
      if (/\b(runner|endless runner|subway runner|crowd survival|io arena|\.io|vampire survivor|survivor|肉鸽割草|跑酷)\b/i.test(text)) {
        return { match: true, subgenre: 'io_crowd_survival_roguelike', score: 95 };
      }
      return { match: false, score: 0 };
    }
  },
  // 8. finance_fintech
  {
    genre_id: 'finance_fintech',
    default_subgenre: 'personal_budgeting_accounting',
    test: (text, deps) => {
      if (/\b(budget|expense|accounting|ledger|记账|账本|资产管理|personal finance|currency converter|汇率)\b/i.test(text)) {
        return { match: true, subgenre: 'personal_budgeting_accounting', score: 100 };
      }
      if (/\b(crypto|web3|wallet|defi|ethereum|bitcoin|dex|blockchain|加密钱包)\b/i.test(text)) {
        return { match: true, subgenre: 'crypto_wallet_exchange', score: 95 };
      }
      if (/\b(stock|trading|wealth|investment|portfolio|nasdaq|证券|股票|基金)\b/i.test(text)) {
        return { match: true, subgenre: 'stock_trading_investment', score: 90 };
      }
      if (/\b(mobile wallet|qr payment|payment gateway|stripe|paypal|聚合支付|扫码支付)\b/i.test(text)) {
        return { match: true, subgenre: 'mobile_wallet_qr_payment', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 9. photo_and_video
  {
    genre_id: 'photo_and_video',
    default_subgenre: 'short_video_creation_editor',
    test: (text, deps) => {
      if (/\b(video editor|video maker|short video|capcut|剪辑|vlog|timeline editor)\b/i.test(text)) {
        return { match: true, subgenre: 'short_video_creation_editor', score: 100 };
      }
      if (/\b(beauty camera|selfie|portrait|retouch|美颜|自拍|滤镜相机)\b/i.test(text)) {
        return { match: true, subgenre: 'portrait_beauty_selfie_camera', score: 95 };
      }
      if (/\b(photo editor|raw grading|color grading|lightroom|photoshop|修图)\b/i.test(text)) {
        return { match: true, subgenre: 'pro_photo_editor_raw_grading', score: 90 };
      }
      if (/\b(generative ai|ai art|ai avatar|avatar generator|stable diffusion|midjourney)\b/i.test(text)) {
        return { match: true, subgenre: 'ai_generative_art_avatar', score: 90 };
      }
      if (/\b(vintage film|retro camera|dazz|dispo|胶片相机)\b/i.test(text)) {
        return { match: true, subgenre: 'vintage_film_retro_camera', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 10. entertainment
  {
    genre_id: 'entertainment',
    default_subgenre: 'ott_svod_streaming',
    test: (text, deps) => {
      if (/\b(ott|svod|streaming|video stream|movie|tv show|netflix|影视|流媒体播放)\b/i.test(text)) {
        return { match: true, subgenre: 'ott_svod_streaming', score: 100 };
      }
      if (/\b(live streaming|ugc broadcast|twitch|live video|直播平台)\b/i.test(text)) {
        return { match: true, subgenre: 'live_streaming_ugc', score: 95 };
      }
      if (/\b(short drama|vertical reel|reelshort|微短剧|短剧)\b/i.test(text)) {
        return { match: true, subgenre: 'short_drama_reel_streaming', score: 95 };
      }
      if (/\b(manga|comic|anime|webtoon|novel reader|漫画|网文|小说阅读)\b/i.test(text)) {
        return { match: true, subgenre: 'anime_comic_manga_reader', score: 90 };
      }
      if (/\b(podcast|audiobook|audio stream|fm radio|播客|有声书)\b/i.test(text)) {
        return { match: true, subgenre: 'audiobook_podcast_streaming', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 11. shopping_ecommerce
  {
    genre_id: 'shopping_ecommerce',
    default_subgenre: 'marketplace_general_retail',
    test: (text, deps) => {
      if (/\b(ecommerce|e-commerce|marketplace|shopping cart|shopify|medusa|retail|电商|商城)\b/i.test(text)) {
        return { match: true, subgenre: 'marketplace_general_retail', score: 100 };
      }
      if (/\b(fashion|luxury|apparel|clothing|boutique|服饰|奢品)\b/i.test(text)) {
        return { match: true, subgenre: 'vertical_fashion_luxury', score: 95 };
      }
      if (/\b(live shopping|social commerce|tiktok shop|直播带货)\b/i.test(text)) {
        return { match: true, subgenre: 'live_shopping_social_commerce', score: 90 };
      }
      if (/\b(secondhand|resale|c2c marketplace|thrift|fleamarket|二手交易|闲置)\b/i.test(text)) {
        return { match: true, subgenre: 'secondhand_c2c_marketplace', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 12. health_and_fitness
  {
    genre_id: 'health_and_fitness',
    default_subgenre: 'running_gps_cycling_tracker',
    test: (text, deps) => {
      if (/\b(running|gps tracker|cycling|strava|workout|fitness|跑步|骑行|健身)\b/i.test(text)) {
        return { match: true, subgenre: 'running_gps_cycling_tracker', score: 100 };
      }
      if (/\b(calorie|diet|macro tracker|fasting|nutrition|饮食记录|卡路里|轻断食)\b/i.test(text)) {
        return { match: true, subgenre: 'calorie_diet_macro_tracker', score: 95 };
      }
      return { match: false, score: 0 };
    }
  },
  // 13. travel_and_navigation
  {
    genre_id: 'travel_and_navigation',
    default_subgenre: 'flight_hotel_ota_booking',
    test: (text, deps) => {
      if (/\b(flight|hotel|ota|booking|travel reservation|trip|机票|酒店|旅行预订)\b/i.test(text)) {
        return { match: true, subgenre: 'flight_hotel_ota_booking', score: 100 };
      }
      if (/\b(ride hailing|taxi|uber|lyft|dispatch|打车|网约车)\b/i.test(text)) {
        return { match: true, subgenre: 'ride_hailing_taxi', score: 95 };
      }
      return { match: false, score: 0 };
    }
  },
  // 14. food_and_drink
  {
    genre_id: 'food_and_drink',
    default_subgenre: 'food_delivery_on_demand',
    test: (text, deps) => {
      if (/\b(food delivery|restaurant pickup|takeout|ordering|meal delivery|外卖|点餐)\b/i.test(text)) {
        return { match: true, subgenre: 'food_delivery_on_demand', score: 100 };
      }
      return { match: false, score: 0 };
    }
  },
  // 15. education_and_learning
  {
    genre_id: 'education_and_learning',
    default_subgenre: 'language_learning_gamified',
    test: (text, deps) => {
      if (/\b(language learning|flashcards|duolingo|vocabulary|anki|背单词|语言学习)\b/i.test(text)) {
        return { match: true, subgenre: 'language_learning_gamified', score: 100 };
      }
      return { match: false, score: 0 };
    }
  },
  // 16. social
  {
    genre_id: 'social',
    default_subgenre: 'interest_community_forum',
    test: (text, deps) => {
      if (/\b(dating|matchmaking|tinder|bumble|相亲|交友约会)\b/i.test(text)) {
        return { match: true, subgenre: 'dating_matchmaking', score: 100 };
      }
      if (/\b(community|forum|threads|reddit|discussion board|兴趣社区|论坛)\b/i.test(text)) {
        return { match: true, subgenre: 'interest_community_forum', score: 95 };
      }
      if (/\b(audio room|voice chat|clubhouse|语聊房|连麦)\b/i.test(text)) {
        return { match: true, subgenre: 'live_audio_voice_chat', score: 90 };
      }
      if (/\b(avatar|virtual space|metaverse|虚拟形象|元宇宙)\b/i.test(text)) {
        return { match: true, subgenre: 'avatar_virtual_metaverse', score: 90 };
      }
      if (/\b(ephemeral messaging|snapchat|private chat|阅后即焚|私密通讯)\b/i.test(text)) {
        return { match: true, subgenre: 'ephemeral_instant_messaging', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 17. business
  {
    genre_id: 'business',
    default_subgenre: 'project_agile_management',
    test: (text, deps) => {
      if (/\b(twenty|crm|sales pipeline|lead management|deal tracking|客户关系)\b/i.test(text)) {
        return { match: true, subgenre: 'crm_sales_pipeline', score: 100 };
      }
      if (/\b(slack|teams|enterprise im|team chat|企业通讯|协同沟通)\b/i.test(text)) {
        return { match: true, subgenre: 'team_chat_collaboration', score: 95 };
      }
      if (/\b(zoom|video conferencing|virtual meeting|webinar|视频会议)\b/i.test(text)) {
        return { match: true, subgenre: 'video_conferencing_meeting', score: 90 };
      }
      if (/\b(attendance|payroll|hrm|hr system|考勤|人事管理|薪酬)\b/i.test(text)) {
        return { match: true, subgenre: 'hrm_payroll_attendance', score: 90 };
      }
      if (/\b(e-signature|contract lifecycle|docusign|electronic signature|电子签署|合同签约)\b/i.test(text)) {
        return { match: true, subgenre: 'electronic_signature_contract', score: 90 };
      }
      if (/\b(project management|agile workflow|kanban sprint|jira|linear|敏捷项目)\b/i.test(text)) {
        return { match: true, subgenre: 'project_agile_management', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 18. productivity
  {
    genre_id: 'productivity',
    default_subgenre: 'note_taking_markdown',
    test: (text, deps) => {
      if (/\b(excalidraw|whiteboard|mindmap|mind mapping|brainstorm|思维导图|手绘白板)\b/i.test(text)) {
        return { match: true, subgenre: 'mind_mapping_brainstorm', score: 100 };
      }
      if (/\b(notes|markdown|knowledge base|obsidian|notion|personal wiki|笔记|知识库)\b/i.test(text)) {
        return { match: true, subgenre: 'note_taking_markdown', score: 95 };
      }
      if (/\b(todo|task management|gtd|checklist|待办清单|任务管理)\b/i.test(text)) {
        return { match: true, subgenre: 'todo_task_management', score: 95 };
      }
      if (/\b(pomodoro|focus timer|habit tracker|番茄钟|专注习惯)\b/i.test(text)) {
        return { match: true, subgenre: 'pomodoro_focus_timer', score: 90 };
      }
      if (/\b(pdf editor|office doc|pdf annotator|word doc|文档编辑|pdf套件)\b/i.test(text)) {
        return { match: true, subgenre: 'office_doc_pdf_editor', score: 90 };
      }
      if (/\b(calendar|scheduling|booking meeting|日程规划|日历预约)\b/i.test(text)) {
        return { match: true, subgenre: 'calendar_scheduling', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 19. utilities
  {
    genre_id: 'utilities',
    default_subgenre: 'browser_web_utility',
    test: (text, deps) => {
      if (/\b(vpn|proxy|wireguard|openvpn|shadowsocks|网络代理)\b/i.test(text)) {
        return { match: true, subgenre: 'net_vpn_proxy', score: 100 };
      }
      if (/\b(system cleaner|device booster|junk cleaner|cache clean|系统清理)\b/i.test(text)) {
        return { match: true, subgenre: 'system_cleaner_optimizer', score: 95 };
      }
      if (/\b(file manager|wi-fi transfer|file transfer|ftp|smb|文件管理|快传)\b/i.test(text)) {
        return { match: true, subgenre: 'file_manager_transfer', score: 90 };
      }
      if (/\b(scanner|ocr|document scan|camscanner|文档扫描|移动ocr)\b/i.test(text)) {
        return { match: true, subgenre: 'scanner_ocr_tools', score: 90 };
      }
      if (/\b(battery manager|battery health|charging alarm|电池健康|省电)\b/i.test(text)) {
        return { match: true, subgenre: 'battery_power_manager', score: 85 };
      }
      if (/\b(antivirus|app locker|spyware|malware scanner|安全防护|杀毒|应用锁)\b/i.test(text)) {
        return { match: true, subgenre: 'security_antivirus_locker', score: 85 };
      }
      if (/\b(browser|web utility|devtools|online toolbox|url shortener|json formatter|网页工具|实用工具)\b/i.test(text)) {
        return { match: true, subgenre: 'browser_web_utility', score: 80 };
      }
      return { match: true, subgenre: 'browser_web_utility', score: 10 }; // universal baseline
    }
  }
];

/**
 * 针对指定子分类，动态推导其实际拥有的功能特性标签（100% 存在于该子类下）
 */
function pickFeatureTagsForSubgenre(subObj, combinedText, depKeys) {
  if (!subObj || !subObj.tag_categories) return [];

  const matched = [];
  const allSubTags = [];

  for (const [catKey, tagList] of Object.entries(subObj.tag_categories)) {
    if (!Array.isArray(tagList)) continue;
    for (const t of tagList) {
      allSubTags.push({ ...t, category: catKey });
    }
  }

  // 1. 基于关键词与依赖精准匹配
  for (const t of allSubTags) {
    const idKey = t.tag_id.toLowerCase().replace(/_/g, ' ');
    const nameKey = (t.name || '').toLowerCase();

    const isHit =
      combinedText.includes(t.tag_id.toLowerCase()) ||
      combinedText.includes(idKey) ||
      combinedText.includes(nameKey) ||
      depKeys.some(d => idKey.includes(d) || (d.length >= 4 && nameKey.includes(d)));

    if (isHit && !matched.some(m => m.tag_id === t.tag_id)) {
      matched.push(t);
    }
  }

  // 2. 若匹配不足，选取该子分类 core_features 里的前 2-3 个标志性标签作为默认保底
  if (matched.length === 0 && subObj.tag_categories.core_features) {
    const defaultCores = subObj.tag_categories.core_features.slice(0, 3);
    for (const dt of defaultCores) {
      matched.push({ ...dt, category: 'core_features' });
    }
  }

  // 限制最大 5 个标签
  return matched.slice(0, 5);
}

/**
 * 自动结合项目事实推断 4 级品类与特性标签（带双重指令校验与反幻觉自愈）
 */
function inferTaxonomy(projectContext = {}) {
  const { genresMap, subgenresMap } = buildIndex();
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

  // === Pass 1: 首次规则与事实推导 ===
  let bestGenreId = 'utilities';
  let bestSubgenreId = 'browser_web_utility';
  let highestScore = -1;

  for (const rule of GENRE_RULES) {
    const res = rule.test(combinedText, depKeys);
    if (res.match && res.score > highestScore) {
      highestScore = res.score;
      bestGenreId = rule.genre_id;
      bestSubgenreId = res.subgenre || rule.default_subgenre;
    }
  }

  // === 指令校验 1: 验证首次推导出的品类是否存在于字典 ===
  let validation1 = validateTaxonomy(bestGenreId, bestSubgenreId, []);

  // === Pass 2: 若校验未通过，启动重新推导 / 纠正逻辑 ===
  if (!validation1.valid) {
    // 纠错路径 A: 如果 subgenre 存在但属于另一个 genre，自动拉回正轨
    if (subgenresMap.has(bestSubgenreId)) {
      bestGenreId = subgenresMap.get(bestSubgenreId).genre_id;
    } else {
      // 纠错路径 B: 降级回退到 utilities 通用 Web 工具
      bestGenreId = 'utilities';
      bestSubgenreId = 'browser_web_utility';
    }
  }

  // === 指令校验 2: 再次核验确保零幻觉 ===
  const validation2 = validateTaxonomy(bestGenreId, bestSubgenreId, []);
  if (!validation2.valid) {
    // 如果重推导依然不匹配，直接返回无效状态，避免向云端上传非法字段
    return {
      is_valid: false,
      genre: null,
      subgenre: null,
      feature_tags: [],
      feature_tag_ids: [],
    };
  }

  const currentGenreObj = genresMap.get(bestGenreId);
  const currentSubObj = currentGenreObj.subgenres.get(bestSubgenreId) || subgenresMap.get(bestSubgenreId);

  // 严格从该子分类已有的标签池中选取，确保 100% 存在且合法
  const matchedTags = pickFeatureTagsForSubgenre(currentSubObj, combinedText, depKeys);
  const tagIds = matchedTags.map(t => t.tag_id);

  // 最终标签合法性复核
  const tagValidation = validateTaxonomy(bestGenreId, bestSubgenreId, tagIds);
  const finalTagIds = tagValidation.validTagIds;
  const finalTags = matchedTags.filter(t => finalTagIds.includes(t.tag_id));

  return {
    is_valid: true,
    genre: {
      id: currentGenreObj.id,
      name: currentGenreObj.name,
      name_zh: currentGenreObj.name_zh,
      type: currentGenreObj.type,
    },
    subgenre: {
      id: currentSubObj.id,
      name: currentSubObj.name,
      name_zh: currentSubObj.name_zh,
    },
    feature_tags: finalTags.map(t => ({
      tag_id: t.tag_id,
      name: t.name,
      category: t.category,
      category_name: CATEGORY_DISPLAY_NAMES[t.category] || t.category,
    })),
    feature_tag_ids: finalTagIds,
  };
}

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
 * 根据 ID 反解析或校验品类，严格确保 ID 属于 Canonical 19 类字典
 */
function resolveTaxonomyFromIDs(genreId, subgenreId, tagIdList = []) {
  const { genresMap, subgenresMap, subgenreTagsMap } = buildIndex();

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

  // 严格自愈与重归纳
  if (!genre) {
    genre = genresMap.get('utilities') || { id: 'utilities', name: 'Utilities', type: 'App' };
  }
  if (!subgenre || !genre.subgenres.has(subgenre.id)) {
    subgenre = genre.subgenres.get('browser_web_utility') || genre.subgenres.values().next().value || { id: 'browser_web_utility', name: 'Mobile Web Browser & Utility' };
  }

  // 严格过滤仅属于该 subgenre 的标签
  const allowedTags = subgenreTagsMap.get(subgenre.id) || new Set();
  const feature_tags = [];
  const validTagIds = [];

  for (const tid of tagIdList) {
    if (allowedTags.has(tid)) {
      const { tagsMap } = buildIndex();
      const t = tagsMap.get(tid);
      feature_tags.push({
        tag_id: t.tag_id,
        name: t.name,
        category: t.category,
        category_name: CATEGORY_DISPLAY_NAMES[t.category] || t.category,
      });
      validTagIds.push(t.tag_id);
    }
  }

  return {
    is_valid: true,
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
    feature_tag_ids: validTagIds,
  };
}

module.exports = {
  loadTaxonomy,
  buildIndex,
  validateTaxonomy,
  inferTaxonomy,
  formatTaxonomySummary,
  resolveTaxonomyFromIDs,
  CATEGORY_DISPLAY_NAMES,
};
