const path = require('path');
const fs = require('fs');

let taxonomyCache = null;
let indexCache = null;

function loadTaxonomy() {
  if (taxonomyCache) return taxonomyCache;
  
  // 1. Try local CLI assets/taxonomy.json
  const assetPath = path.join(__dirname, 'assets', 'taxonomy.json');
  // 2. Try root workspace Taxonomy.json
  const rootPath = path.resolve(__dirname, '..', '..', '..', 'Taxonomy.json');

  const candidates = [assetPath, rootPath];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        taxonomyCache = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (taxonomyCache.genres && taxonomyCache.genres.length >= 26) {
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

  // Also index global feature_tags_dimensions
  if (data.feature_tags_dimensions) {
    for (const [dimKey, tagList] of Object.entries(data.feature_tags_dimensions)) {
      if (Array.isArray(tagList)) {
        for (const tagId of tagList) {
          if (!tagsMap.has(tagId)) {
            tagsMap.set(tagId, {
              tag_id: tagId,
              name: tagId.replace(/_/g, ' '),
              category: dimKey,
              subgenre_id: '',
              subgenre_name: '',
              genre_id: '',
              genre_name: '',
              genre_type: 'Universal',
            });
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
  monetization_models: 'Monetization Models',
  social_engagement: 'Social & Growth',
  social_multiplayer_mechanics: 'Social & Multiplayer Mechanics',
  gameplay_progression_mechanics: 'Gameplay Progression',
  technical_platform: 'Technical Platform',
  technical_architectures: 'Technical Architectures',
  content_theme: 'Content & Compliance',
};

/**
 * 26 权威品类特征识别规则定义
 */
const GENRE_RULES = [
  // 1. game_simulation
  {
    genre_id: 'game_simulation',
    default_subgenre: 'g_sim_life_sandbox',
    test: (text, deps) => {
      if (/\b(animal crossing|acnh|动森|动物森友会|stalk market|turnip-calc|turnip calculator|大头菜|stalks)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sim_life_sandbox', score: 100 };
      }
      if (/\b(flight simulator|train sim|cockpit simulator|vehicle sim)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sim_vehicle_flight_mech', score: 90 };
      }
      if (/\b(cooking diner|restaurant tycoon|kitchen management)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sim_restaurant_cooking', score: 85 };
      }
      if (/\b(farming tycoon|farm simulation|town building|harvest)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sim_farming_town', score: 85 };
      }
      if (/\b(visual novel|otome|interactive story|dating sim)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sim_otome_visual_novel', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 2. game_action
  {
    genre_id: 'game_action',
    default_subgenre: 'g_act_platformer',
    test: (text, deps) => {
      if (/\b(spacecadet|pinball|space cadet pinball|3d pinball|弹球|三维弹球)\b/i.test(text)) {
        return { match: true, subgenre: 'g_act_platformer', score: 100 };
      }
      if (/\b(clumsy-bird|flappy bird|clumsy bird)\b/i.test(text)) {
        return { match: true, subgenre: 'g_act_platformer', score: 95 };
      }
      if (/\b(battle royale|pubg|fortnite|apex|吃鸡)\b/i.test(text)) {
        return { match: true, subgenre: 'g_act_battle_royale', score: 90 };
      }
      if (/\b(fps|tps|first-person shooter|third-person shooter|gun game|射击游戏)\b/i.test(text)) {
        return { match: true, subgenre: 'g_act_fps_tps_shooter', score: 90 };
      }
      if (/\b(hack and slash|arpg|beat em up|brawler|fighting game|格斗)\b/i.test(text)) {
        return { match: true, subgenre: 'g_act_fighting_brawler', score: 85 };
      }
      if (/\b(platformer|side-scroller|jump and run|跳跃动作)\b/i.test(text)) {
        return { match: true, subgenre: 'g_act_platformer', score: 80 };
      }
      return { match: false, score: 0 };
    }
  },
  // 3. game_rpg
  {
    genre_id: 'game_rpg',
    default_subgenre: 'g_rpg_mmorpg',
    test: (text, deps) => {
      if (/\b(browserquest|browser quest|html5 rpg|mmo rpg|multiplayer rpg|kaboom|rpgjs|canvasquest)\b/i.test(text)) {
        return { match: true, subgenre: 'g_rpg_mmorpg', score: 100 };
      }
      if (/\b(roguelike|dungeon crawler|permadeath|地牢|rpg game|role-playing)\b/i.test(text)) {
        return { match: true, subgenre: 'g_rpg_roguelike_dungeon', score: 90 };
      }
      if (/\b(idle rpg|afk rpg|auto battler rpg|放置rpg|挂机)\b/i.test(text)) {
        return { match: true, subgenre: 'g_rpg_idle_afk', score: 90 };
      }
      if (/\b(open-world rpg|rpg adventure|role-playing game|quest log|hero level)\b/i.test(text)) {
        return { match: true, subgenre: 'g_rpg_open_world', score: 80 };
      }
      return { match: false, score: 0 };
    }
  },
  // 4. game_strategy
  {
    genre_id: 'game_strategy',
    default_subgenre: 'g_str_4x_mmo_strategy',
    test: (text, deps) => {
      if (/\b(freeciv|civilization|4x|slg|turn-based strategy|tbs|empire builder|hex map|hextris)\b/i.test(text)) {
        return { match: true, subgenre: 'g_str_4x_mmo_strategy', score: 100 };
      }
      if (/\b(tower defense|tower-defense|td game|塔防)\b/i.test(text)) {
        return { match: true, subgenre: 'g_str_tower_defense', score: 95 };
      }
      if (/\b(moba|dota|league of legends|lane battle)\b/i.test(text)) {
        return { match: true, subgenre: 'g_str_moba', score: 90 };
      }
      if (/\b(auto chess|autochess|auto-battler|自走棋)\b/i.test(text)) {
        return { match: true, subgenre: 'g_str_auto_chess_battler', score: 90 };
      }
      if (/\b(collectible card game|ccg|tcg|card battler|deck builder)\b/i.test(text)) {
        return { match: true, subgenre: 'g_str_ccg_card_battler', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 5. game_casual
  {
    genre_id: 'game_casual',
    default_subgenre: 'g_cas_hypercasual_arcade',
    test: (text, deps) => {
      if (/\b(2048|join numbers|tile sliding|get to the 2048 tile)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_merge_craft', score: 100 };
      }
      if (/\b(match-3|match 3|match three|tile match|三消)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_match3_narrative', score: 95 };
      }
      if (/\b(bubble shooter|physics drop|bubble pop|泡泡龙)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_bubble_physics', score: 90 };
      }
      if (/\b(endless runner|subway runner|temple run|跑酷)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_endless_runner', score: 90 };
      }
      if (/\b(word puzzle|crossword|wordle|trivia quiz|答题|填字)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_word_trivia', score: 85 };
      }
      if (/\b(puzzle game|casual game|hypercasual|sliding puzzle|益智小游戏)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_hypercasual_arcade', score: 80 };
      }
      return { match: false, score: 0 };
    }
  },
  // 6. game_sports_racing
  {
    genre_id: 'game_sports_racing',
    default_subgenre: 'g_sr_arcade_kart_racing',
    test: (text, deps) => {
      if (/\b(hexgl|fast-paced futuristic racing|3d racing game|three\.js racing|three|three\.js|javascript-racer|js-racer|outrun|racer|racing game)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sr_arcade_kart_racing', score: 100 };
      }
      if (/\b(kart racing|drift racing|arcade racer|赛车|竞速游戏)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sr_arcade_kart_racing', score: 90 };
      }
      if (/\b(sim racing|track racing|formula 1|gran turismo)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sr_realistic_track_racing', score: 90 };
      }
      if (/\b(football game|soccer game|basketball game|nba 2k|fifa)\b/i.test(text)) {
        return { match: true, subgenre: 'g_sr_team_sports_football_nba', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 7. game_casino
  {
    genre_id: 'game_casino',
    default_subgenre: 'g_cas_blackjack_baccarat',
    test: (text, deps) => {
      if (/\b(blackjack|21-game|21 point|twenty-one|twenty one|hit or stand|double down|split pair|card counting)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_blackjack_baccarat', score: 100 };
      }
      if (/\b(texas hold'em|texas holdem|poker table|poker chip|poker game|德州扑克)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_texas_holdem_poker', score: 95 };
      }
      if (/\b(slot machine|vegas slots|spin reels|jackpot slots|老虎机)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_vegas_slots', score: 95 };
      }
      if (/\b(bingo|keno|lottery party|宾果)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_bingo_keno', score: 90 };
      }
      if (/\b(solitaire|spider solitaire|mahjong solitaire|接龙|麻将)\b/i.test(text)) {
        return { match: true, subgenre: 'g_cas_social_mahjong_solitaire', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 8. medical
  {
    genre_id: 'medical',
    default_subgenre: 'med_clinical_reference',
    test: (text, deps) => {
      if (/\b(ohif|viewers|dicom|dwv|dicom-parser|cornerstone|cornerstone3d|medical imaging|radiology|pacs|mri|ct scan|health records|ehr|emr|telehealth|prescription)\b/i.test(text)) {
        return { match: true, subgenre: 'med_clinical_reference', score: 100 };
      }
      if (/\b(pill reminder|medication tracker|prescription delivery|doctor consult|online clinic)\b/i.test(text)) {
        return { match: true, subgenre: 'med_medication_pill_reminder', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 9. sports
  {
    genre_id: 'sports',
    default_subgenre: 'spt_live_scores_match_stats',
    test: (text, deps) => {
      if (/\b(lichess|lila|chessground|chess\.js|chess\.org|chess game|chess server|stockfish|pgn|fen|elo rating|chess tournament|国际象棋)\b/i.test(text)) {
        return { match: true, subgenre: 'spt_live_scores_match_stats', score: 100 };
      }
      if (/\b(fantasy sports|fantasy league|draft simulator|match odds|live score|football score|nba stats)\b/i.test(text)) {
        return { match: true, subgenre: 'spt_live_scores_match_stats', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 10. kids_family
  {
    genre_id: 'kids_family',
    default_subgenre: 'kids_parental_control_screentime',
    test: (text, deps) => {
      if (/\b(babybuddy|baby buddy|infant tracker|diaper|breastfeeding|baby sleep|toddler|parenting log|育儿|母婴)\b/i.test(text)) {
        return { match: true, subgenre: 'kids_parental_control_screentime', score: 100 };
      }
      if (/\b(parental control|screen time limits|family locator|preschool abc|kids storybook)\b/i.test(text)) {
        return { match: true, subgenre: 'kids_parental_control_screentime', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 11. lifestyle
  {
    genre_id: 'lifestyle',
    default_subgenre: 'life_smart_home_iot',
    test: (text, deps) => {
      if (/\b(habitica|gamified habit|habit tracker|daily tasks and habits|rpg habit|hexo|hexo-theme|hexo-theme-next|生活日常|习惯养成)\b/i.test(text)) {
        return { match: true, subgenre: 'life_smart_home_iot', score: 100 };
      }
      if (/\b(smart home|home assistant|zigbee|home decor|astrology|horoscope|tarot|pet care|religious)\b/i.test(text)) {
        return { match: true, subgenre: 'life_smart_home_iot', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 12. news_magazines
  {
    genre_id: 'news_magazines',
    default_subgenre: 'news_rss_feed_readers',
    test: (text, deps) => {
      if (/\b(freshrss|rss feed|atom feed|rss aggregator|feed reader|feed subscription|opml|资讯订阅|新闻聚合)\b/i.test(text)) {
        return { match: true, subgenre: 'news_rss_feed_readers', score: 100 };
      }
      if (/\b(news feed|newspaper|journalism|magazine kiosk|press wire|headlines)\b/i.test(text)) {
        return { match: true, subgenre: 'news_algorithmic_feed', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 13. navigation_transit
  {
    genre_id: 'navigation_transit',
    default_subgenre: 'nav_turn_by_turn_driving',
    test: (text, deps) => {
      if (/\b(graphhopper|graphhopper-maps|routing engine|turn-by-turn|openstreetmap|gis routing|gps navigation|direction routing|transit schedule)\b/i.test(text)) {
        return { match: true, subgenre: 'nav_turn_by_turn_driving', score: 100 };
      }
      if (/\b(ridesharing|taxi booking|metro timetable|bike sharing|parking finder)\b/i.test(text)) {
        return { match: true, subgenre: 'nav_ridesharing_hailing', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 14. education_reference
  {
    genre_id: 'education_reference',
    default_subgenre: 'edu_vocabulary_flashcards',
    test: (text, deps) => {
      if (/\b(anki|anki-web|ankidroid|flashcards|flashcard|spaced repetition|srs algorithm|ebbinghaus|vocab memory|背单词|记忆卡片)\b/i.test(text)) {
        return { match: true, subgenre: 'edu_vocabulary_flashcards', score: 100 };
      }
      if (/\b(javascript-algorithms|algorithm|algorithms|data structure|data structures|binary tree|sorting|freecodecamp|learn to code|interactive programming|math solver|mooc course|k12 homework|thesaurus|dictionary)\b/i.test(text)) {
        return { match: true, subgenre: 'edu_coding_interactive', score: 95 };
      }
      return { match: false, score: 0 };
    }
  },
  // 15. food_drink
  {
    genre_id: 'food_drink',
    default_subgenre: 'fd_recipes_meal_plans',
    test: (text, deps) => {
      if (/\b(mealie|recipe manager|meal plan|meal planning|cookbook|food recipe|cooking guide|shopping list recipe|micro|zeit\/micro|菜谱|美食备餐)\b/i.test(text)) {
        return { match: true, subgenre: 'fd_recipes_meal_plans', score: 100 };
      }
      if (/\b(food delivery|restaurant booking|coffee ordering|wine scanner|cocktail recipe)\b/i.test(text)) {
        return { match: true, subgenre: 'fd_food_delivery_aggregator', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 16. health_fitness
  {
    genre_id: 'health_fitness',
    default_subgenre: 'hf_weightlifting_log',
    test: (text, deps) => {
      if (/\b(wger|workout manager|fitness tracker|weightlifting log|exercise database|bodybuilding|workout routines|gym log|homer|健身追踪)\b/i.test(text)) {
        return { match: true, subgenre: 'hf_weightlifting_log', score: 100 };
      }
      if (/\b(calorie counter|diet diary|running tracker|intermittent fasting|sleep tracker|meditation|yoga)\b/i.test(text)) {
        return { match: true, subgenre: 'hf_calorie_diet_diary', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 17. shopping
  {
    genre_id: 'shopping',
    default_subgenre: 'shop_general_marketplace',
    test: (text, deps) => {
      if (/\b(medusa|starter-medusa|nextjs-starter-medusa|ecommerce storefront|cart checkout|shopify storefront|shopping cart|catalog order|电商商城)\b/i.test(text)) {
        return { match: true, subgenre: 'shop_general_marketplace', score: 100 };
      }
      if (/\b(secondhand|resale|fashion apparel|coupons cashback|order tracking)\b/i.test(text)) {
        return { match: true, subgenre: 'shop_fashion_apparel', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 18. entertainment
  {
    genre_id: 'entertainment',
    default_subgenre: 'ent_ott_subscription',
    test: (text, deps) => {
      if (/\b(jellyfin|jellyfin-web|emby|plex|media system|media streaming|video streaming client|movie collection|tv series playback|流媒体播放)\b/i.test(text)) {
        return { match: true, subgenre: 'ent_ott_subscription', score: 100 };
      }
      if (/\b(music streaming|podcast player|audiobook|ebook reader|manga reader|short drama)\b/i.test(text)) {
        return { match: true, subgenre: 'ent_music_streaming', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 19. finance
  {
    genre_id: 'finance',
    default_subgenre: 'fin_expense_budgeting',
    test: (text, deps) => {
      if (/\b(maybe|maybe-finance|firefly|actualbudget|personal finance|net worth|investment portfolio|financial tracker|budgeting app|expense tracking|记账理财)\b/i.test(text)) {
        return { match: true, subgenre: 'fin_expense_budgeting', score: 100 };
      }
      if (/\b(stock trading|crypto exchange|defi wallet|crypto wallet|p2p payment|tax accounting)\b/i.test(text)) {
        return { match: true, subgenre: 'fin_stock_trading', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 20. photo_video
  {
    genre_id: 'photo_video',
    default_subgenre: 'pv_general_photo_editor',
    test: (text, deps) => {
      if (/\b(immich|lychee|photoprism|photo backup|photo gallery|self-hosted photo|video backup|albums|exif metadata|photo manager|tui\.image-editor|toast ui imageeditor|image editor|photo editor|相册管理)\b/i.test(text)) {
        return { match: true, subgenre: 'pv_general_photo_editor', score: 100 };
      }
      if (/\b(video editor|timeline video|screen recorder|raw editor|beauty retouch|photo collage)\b/i.test(text)) {
        return { match: true, subgenre: 'pv_video_timeline_editor', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 21. social_media
  {
    genre_id: 'social_media',
    default_subgenre: 'soc_microblogging',
    test: (text, deps) => {
      if (/\b(bluesky|social-app|medium-editor|medium\.com|contenteditable|wysiwyg|atproto|at protocol|decentralized social|microblogging|timeline feed|followers|repost|社交网络)\b/i.test(text)) {
        return { match: true, subgenre: 'soc_microblogging', score: 100 };
      }
      if (/\b(social network|dating app|threaded community|forum discussion|voice chatrooms)\b/i.test(text)) {
        return { match: true, subgenre: 'soc_broad_network', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 22. communication
  {
    genre_id: 'communication',
    default_subgenre: 'comm_instant_messaging',
    test: (text, deps) => {
      if (/\b(cinny|matrix client|matrix protocol|matrix-js-sdk|matrix chat|end-to-end encrypted chat|e2ee messaging|即时通讯)\b/i.test(text)) {
        return { match: true, subgenre: 'comm_instant_messaging', score: 100 };
      }
      if (/\b(video meeting|voip calling|sms filter|email client|webmail)\b/i.test(text)) {
        return { match: true, subgenre: 'comm_video_meeting', score: 85 };
      }
      return { match: false, score: 0 };
    }
  },
  // 23. business
  {
    genre_id: 'business',
    default_subgenre: 'biz_crm_sales',
    test: (text, deps) => {
      if (/\b(twenty|twentyhq|open-source crm|customer relationship|sales pipeline|lead management|deal tracking|crm workspace|hoppscotch|api development|api ecosystem|graphql client|rest api|客户关系协同)\b/i.test(text)) {
        return { match: true, subgenre: 'biz_crm_sales', score: 100 };
      }
      if (/\b(team chat enterprise|project management|agile sprint|recruitment hiring|hr attendance|bi analytics|pos billing)\b/i.test(text)) {
        return { match: true, subgenre: 'biz_project_mgmt', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 24. travel_local
  {
    genre_id: 'travel_local',
    default_subgenre: 'trv_travel_itinerary_guide',
    test: (text, deps) => {
      if (/\b(notesnook|offline private notes|travel journal|trip diary|itinerary notes|leaflet|interactive maps|gis map|travel map|encrypted notesnook)\b/i.test(text)) {
        return { match: true, subgenre: 'trv_travel_itinerary_guide', score: 100 };
      }
      if (/\b(ota booking|flight booking|hotel resort|vacation rental|city guide|attraction ticket)\b/i.test(text)) {
        return { match: true, subgenre: 'trv_ota_full_service', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 25. productivity
  {
    genre_id: 'productivity',
    default_subgenre: 'prod_mindmap_whiteboard',
    test: (text, deps) => {
      if (/\b(excalidraw|drawflow|flow library|data flows|flowchart|flow-based-programming|virtual whiteboard|hand-drawn look|sketching|diagramming canvas|collaborative whiteboard|白板绘图)\b/i.test(text)) {
        return { match: true, subgenre: 'prod_mindmap_whiteboard', score: 100 };
      }
      if (/\b(markdown editor|todo list|task manager|kanban board|pomodoro timer|calendar planner|pdf editor|code editor)\b/i.test(text)) {
        return { match: true, subgenre: 'prod_markdown_notes', score: 90 };
      }
      return { match: false, score: 0 };
    }
  },
  // 26. utilities
  {
    genre_id: 'utilities',
    default_subgenre: 'tool_calculators',
    test: (text, deps) => {
      if (/\b(it-tools|developer tools|online toolbox|uuid generator|hash calculator|json formatter|regex tester|base64 converter|实用工具箱)\b/i.test(text)) {
        return { match: true, subgenre: 'tool_calculators', score: 100 };
      }
      if (/\b(vpn proxy|system cleaner|hardware benchmark|clipboard manager|file compression|qr barcode|speed test)\b/i.test(text)) {
        return { match: true, subgenre: 'sys_memory_cleaner', score: 85 };
      }
      return { match: true, subgenre: 'tool_calculators', score: 10 }; // fallback baseline
    }
  }
];

/**
 * 自动结合 5 层项目事实推断 4 级品类与特性标签
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

  let bestGenreId = 'utilities';
  let bestSubgenreId = 'tool_calculators';
  let highestScore = -1;

  for (const rule of GENRE_RULES) {
    const res = rule.test(combinedText, depKeys);
    if (res.match && res.score > highestScore) {
      highestScore = res.score;
      bestGenreId = rule.genre_id;
      bestSubgenreId = res.subgenre || rule.default_subgenre;
    }
  }

  // Ensure genre and subgenre exist in canonical taxonomy
  if (!genresMap.has(bestGenreId)) {
    bestGenreId = 'utilities';
  }
  const currentGenreObj = genresMap.get(bestGenreId);
  if (!currentGenreObj.subgenres.has(bestSubgenreId)) {
    bestSubgenreId = currentGenreObj.subgenres.keys().next().value || 'tool_calculators';
  }

  const currentSubObj = currentGenreObj.subgenres.get(bestSubgenreId) || subgenresMap.get(bestSubgenreId);

  // Pick Feature Tags
  const matchedTags = new Set();

  // A. Architectural tags based on dependencies & framework
  if (depKeys.some(d => d.includes('stripe') || d.includes('paddle') || d.includes('lemon'))) {
    matchedTags.add('Store_Billing_Stripe_RevenueCat');
    matchedTags.add('Subscription_Tiered_Recurring');
  } else if (depKeys.some(d => d.includes('admob') || d.includes('google-ad') || d.includes('adsense'))) {
    matchedTags.add('Ad_Native_Banner');
  } else {
    matchedTags.add('IAP_OneTime_Unlock');
  }

  if (depKeys.some(d => d.includes('socket.io') || d.includes('ws') || d.includes('matrix') || d.includes('webrtc'))) {
    matchedTags.add('Backend_Node_Golang_Websocket');
    matchedTags.add('Realtime_PVP_Matchmaking');
  }

  if (depKeys.some(d => d.includes('three') || d.includes('webgl') || d.includes('gl-matrix'))) {
    matchedTags.add('Engine_Unity'); // standard 3D rendering marker
  }

  if (depKeys.some(d => d.includes('firebase') || d.includes('supabase') || d.includes('auth0') || d.includes('next-auth'))) {
    matchedTags.add('Auth_Apple_Google_OAuth');
  }

  // Analytics standard tag
  matchedTags.add('Analytics_StarRocks_ClickHouse_Mixpanel');

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
      id: currentGenreObj?.id || bestGenreId,
      name: currentGenreObj?.name || 'Utilities',
      name_zh: currentGenreObj?.name_zh || '实用工具',
      type: currentGenreObj?.type || 'App',
    },
    subgenre: {
      id: currentSubObj?.id || bestSubgenreId,
      name: currentSubObj?.name || 'Calculators & Converters',
      name_zh: currentSubObj?.name_zh || '科学计算与工具',
    },
    feature_tags: tagDetails,
    feature_tag_ids: Array.from(matchedTags),
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
    subgenre = subgenresMap.get('tool_calculators') || { id: 'tool_calculators', name: 'Calculators & Currency Converters' };
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
