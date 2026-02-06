// Content Script - OFJAAAH Hardcoded Token Detector
// Automatic and manual hardcoded token scanner

// Prevent multiple executions of content script
if (window.hardcodedTokenDetectorLoaded) {
  console.log('🔍 Hardcoded Token Detector já carregado, ignorando execução duplicada');
} else {
  window.hardcodedTokenDetectorLoaded = true;
  console.log('🔍 Hardcoded Token Detector by OFJAAAH - Content Script carregado');

// Import validator, crawler and bucket detector
let validatorModule = null;
let DeepCrawler = null;
let BucketTakeoverDetector = null;
let modulesLoaded = false;
let modulesLoadingPromise = null;

// Function to ensure modules are loaded
async function ensureModulesLoaded() {
  if (modulesLoaded) {
    return true;
  }

  if (modulesLoadingPromise) {
    await modulesLoadingPromise;
    return modulesLoaded;
  }

  modulesLoadingPromise = (async () => {
    try {
      // Load validator using dynamic import
      const validatorUrl = chrome.runtime.getURL('validator.js');
      const validatorImport = await import(validatorUrl);
      validatorModule = validatorImport;
      console.log('✅ Módulo de validação carregado');

      // Load deep crawler using dynamic import
      try {
        const crawlerUrl = chrome.runtime.getURL('deep-crawler.js');
        const crawlerModule = await import(crawlerUrl);

        // Try to get the module class in different ways
        DeepCrawler = crawlerModule.default || crawlerModule.DeepCrawler;

        // If still not available, create a global reference
        if (!DeepCrawler) {
          // Inject script in page context to access window
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = crawlerUrl;
            script.onload = () => {
              // Wait a moment for the script to execute
              setTimeout(() => {
                if (typeof window.DeepCrawler !== 'undefined') {
                  DeepCrawler = window.DeepCrawler;
                  document.head.removeChild(script);
                  resolve();
                } else {
                  reject(new Error('DeepCrawler not found in window'));
                }
              }, 100);
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (DeepCrawler) {
          console.log('✅ Deep Crawler carregado');
        } else {
          console.warn('⚠️ Deep Crawler not found');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao carregar Deep Crawler:', error.message);
      }

      // Load bucket takeover detector using dynamic import
      try {
        const bucketUrl = chrome.runtime.getURL('bucket-takeover-detector.js');
        const bucketModule = await import(bucketUrl);

        // Try to get the module class in different ways
        BucketTakeoverDetector = bucketModule.default || bucketModule.BucketTakeoverDetector;

        // If still not available, create a global reference
        if (!BucketTakeoverDetector) {
          // Inject script in page context to access window
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = bucketUrl;
            script.onload = () => {
              // Wait a moment for the script to execute
              setTimeout(() => {
                if (typeof window.BucketTakeoverDetector !== 'undefined') {
                  BucketTakeoverDetector = window.BucketTakeoverDetector;
                  document.head.removeChild(script);
                  resolve();
                } else {
                  reject(new Error('BucketTakeoverDetector not found in window'));
                }
              }, 100);
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (BucketTakeoverDetector) {
          console.log('✅ Bucket Takeover Detector carregado');
        } else {
          console.warn('⚠️ Bucket Takeover Detector not found');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao carregar Bucket Takeover Detector:', error.message);
      }

      // Mark as loaded if at least the validator works
      modulesLoaded = !!(validatorModule && (DeepCrawler || BucketTakeoverDetector));
      return modulesLoaded;
    } catch (error) {
      console.error('❌ Erro crítico ao carregar módulos:', error);
      modulesLoaded = false;
      return false;
    }
  })();

  await modulesLoadingPromise;
  return modulesLoaded;
}

// Start loading modules immediately
ensureModulesLoaded();

// ========================================
// FILTRO DE DOMÍNIOS - REDES SOCIAIS E SITES POPULARES
// ========================================
const SOCIAL_MEDIA_DOMAINS = [
  // Main Social Networks
  'facebook.com', 'fb.com', 'fbcdn.net', 'facebook.net',
  'instagram.com', 'cdninstagram.com',
  'twitter.com', 'x.com', 't.co', 'twimg.com',
  'youtube.com', 'youtu.be', 'ytimg.com', 'googlevideo.com',
  'linkedin.com', 'licdn.com',
  'tiktok.com', 'tiktokcdn.com', 'tiktokv.com',
  'snapchat.com', 'snap.com',
  'reddit.com', 'redd.it', 'redditmedia.com',
  'pinterest.com', 'pinimg.com',
  'whatsapp.com', 'whatsapp.net',
  'telegram.org', 't.me',
  'discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net',

  // Google Services (Analytics, Ads, etc) - Removed google.com and googleapis.com to allow GCP scan
  'google-analytics.com', 'googletagmanager.com',
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'gstatic.com',

  // Microsoft Services
  'microsoft.com', 'live.com', 'outlook.com', 'office.com',
  'msn.com', 'bing.com', 'microsoftonline.com',

  // Tracking & Analytics
  'hotjar.com', 'hotjar.io',
  'clarity.ms', 'c.clarity.ms',
  'segment.com', 'segment.io',
  'mixpanel.com',
  'amplitude.com',
  'heap.io', 'heapanalytics.com',
  'fullstory.com',
  'intercom.io', 'intercom.com',
  'zendesk.com',

  // CDNs and Infrastructure Services
  'cloudflare.com', 'cloudflareinsights.com', 'cf-assets.com',
  'akamai.net', 'akamaihd.net',
  'fastly.net',
  'jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',

  // Ad Networks
  'adnxs.com',
  'adsafeprotected.com',
  'advertising.com',
  'criteo.com',
  'rubiconproject.com',

  // Other Common Platforms
  'medium.com',
  'wordpress.com', 'wp.com',
  'tumblr.com',
  'vimeo.com',
  'soundcloud.com',
  'spotify.com', 'scdn.co',
  'apple.com', 'icloud.com',

  // E-commerce and Shopping (block site, but allow buckets)
  'amazon.com', 'amazon.com.br', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
  'amazon.es', 'amazon.it', 'amazon.ca', 'amazon.co.jp', 'amazon.in',
  'ssl-images-amazon.com', 'media-amazon.com', 'amazonwebservices.com',
  'ebay.com', 'aliexpress.com', 'alibaba.com',
  'shopify.com', 'myshopify.com',
  'walmart.com', 'target.com'
];

// ========================================
// IMPORTANTE: A detecção de buckets S3/GCS NÃO é afetada por este filtro!
// Este filtro impede apenas o SCAN DIRETO dentro desses sites.
//
// Quando você escaneia OUTROS sites (ex: example.com), a extensão VAI
// encontrar referências a buckets S3/GCS no código JavaScript normalmente.
// ========================================

// Check if current domain should be skipped for scan
function shouldSkipDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Verificar se o domínio ou qualquer subdomínio está na blacklist
    for (const domain of SOCIAL_MEDIA_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        console.log(`⏭️ Scan bloqueado - Domínio na blacklist: ${hostname}`);
        return true; // Pular scan deste site
      }
    }

    // Domínio não está na blacklist, permitir scan
    console.log(`✅ Scan permitido - Domínio: ${hostname}`);
    return false;
  } catch (error) {
    return false;
  }
}

// Filtro de falsos positivos - URLs e padrões comuns
const FALSE_POSITIVE_PATTERNS = {
  // URLs de redes sociais
  SOCIAL_URLS: [
    /https?:\/\/(www\.)?instagram\.com/gi,
    /https?:\/\/(www\.)?facebook\.com/gi,
    /https?:\/\/(www\.)?twitter\.com/gi,
    /https?:\/\/(www\.)?linkedin\.com/gi,
    /https?:\/\/(www\.)?youtube\.com/gi,
    /instagram\.com\/[a-zA-Z0-9_\.]+/gi,
    /facebook\.com\/[a-zA-Z0-9_\.]+/gi,
  ],
  // URLs de serviços comuns do Google (Gmail, Drive, Maps, etc)
  GOOGLE_COMMON_URLS: [
    /https?:\/\/(www\.)?mail\.google\.com/gi,
    /https?:\/\/(www\.)?gmail\.com/gi,
    /https?:\/\/(www\.)?drive\.google\.com/gi,
    /https?:\/\/(www\.)?docs\.google\.com/gi,
    /https?:\/\/(www\.)?sheets\.google\.com/gi,
    /https?:\/\/(www\.)?slides\.google\.com/gi,
    /https?:\/\/(www\.)?forms\.google\.com/gi,
    /https?:\/\/(www\.)?calendar\.google\.com/gi,
    /https?:\/\/(www\.)?meet\.google\.com/gi,
    /https?:\/\/(www\.)?chat\.google\.com/gi,
    /https?:\/\/(www\.)?maps\.google\.com/gi,
    /https?:\/\/(www\.)?accounts\.google\.com/gi,
    /https?:\/\/(www\.)?myaccount\.google\.com/gi,
    /https?:\/\/(www\.)?photos\.google\.com/gi,
    /https?:\/\/(www\.)?contacts\.google\.com/gi,
    /https?:\/\/(www\.)?keep\.google\.com/gi,
    /https?:\/\/(www\.)?translate\.google\.com/gi,
    /https?:\/\/(www\.)?news\.google\.com/gi,
    /https?:\/\/(www\.)?play\.google\.com/gi,
    /mail\.google\.com\/mail\/u\/\d+/gi, // URLs específicas do Gmail
    /fonts\.googleapis\.com/gi,
    /fonts\.gstatic\.com/gi,
    /maps\.googleapis\.com\/maps/gi, // Maps API (não storage/buckets)
  ],
  // IDs de posts/perfis do Instagram/Facebook (não são secrets)
  SOCIAL_IDS: [
    /instagram.*['"]([0-9]{10,20})['"]/gi,
    /facebook.*['"]([0-9]{10,20})['"]/gi,
    /fb.*['"]([0-9]{10,20})['"]/gi,
    /ig.*['"]([0-9]{10,20})['"]/gi,
  ],
  // Placeholders e exemplos
  PLACEHOLDERS: [
    /['"]?YOUR[_-]?(API|KEY|TOKEN|SECRET)['"]/gi,
    /['"]?(EXAMPLE|SAMPLE|TEST|DEMO)[_-]?(KEY|TOKEN)['"]/gi,
    /['"]?xxx+['"]/gi,
    /['"]?000+['"]/gi,
    /['"]?123456+['"]/gi,
  ],
  // Valores vazios ou muito curtos
  EMPTY_VALUES: [
    /['"]\s*['"]/g,
    /['"]{1,10}['"]/g,
  ],
  // URLs de navegação comuns (não são credenciais)
  NAVIGATION_URLS: [
    /\/(inbox|sent|drafts|trash|spam|folders)/gi,
    /\/(home|dashboard|settings|profile)/gi,
    /\/(login|logout|signin|signout)/gi,
    /\/(about|help|support|faq|contact)/gi,
    /\?q=/gi, // Query strings de busca
    /\/search\?/gi,
  ]
};

// Função para verificar se é um falso positivo
function isFalsePositive(value, context) {
  // Verificar se contém URLs de redes sociais
  for (const regex of FALSE_POSITIVE_PATTERNS.SOCIAL_URLS) {
    if (regex.test(context) || regex.test(value)) {
      return true;
    }
  }

  // Verificar se contém URLs de serviços comuns do Google
  for (const regex of FALSE_POSITIVE_PATTERNS.GOOGLE_COMMON_URLS) {
    if (regex.test(context) || regex.test(value)) {
      return true;
    }
  }

  // Verificar URLs de navegação comuns
  for (const regex of FALSE_POSITIVE_PATTERNS.NAVIGATION_URLS) {
    if (regex.test(context) || regex.test(value)) {
      return true;
    }
  }

  // Verificar IDs de redes sociais
  for (const regex of FALSE_POSITIVE_PATTERNS.SOCIAL_IDS) {
    if (regex.test(context)) {
      return true;
    }
  }

  // Verificar placeholders
  for (const regex of FALSE_POSITIVE_PATTERNS.PLACEHOLDERS) {
    if (regex.test(value) || regex.test(context)) {
      return true;
    }
  }

  // Verificar se é muito curto ou vazio
  if (value.length < 12 || /^[0]{8,}$/.test(value) || /^[x]{8,}$/i.test(value)) {
    return true;
  }

  // Verificar se contém apenas letras minúsculas e underscores (feature flags, configs)
  if (/^[a-z_]+$/.test(value)) {
    return true;
  }

  // Check if it looks like a feature/config name (common pattern: word_word_number)
  if (/^[a-z]+(_[a-z0-9]+){1,5}$/.test(value)) {
    return true;
  }

  // Verificar padrões muito comuns de feature flags e configs
  // Exemplo: resource_planner_view, projects_workload_view, time_tracking_column
  if (/^[a-z]+(_[a-z]+){2,}$/.test(value)) {
    return true;
  }

  // Verificar se contém palavras comuns de features/configs
  const featureWords = [
    'default', 'feature', 'config', 'setting', 'option', 'enable', 'disable',
    'flag', 'toggle', 'badge', 'card', 'sidebar', 'upsell', 'trial', 'support',
    'verified', 'verification', 'impressions', 'home', 'threads', 'drafts',
    'progress', 'ended', 'quick', 'free', 'premium', 'subscription',
    'view', 'column', 'permissions', 'tracking', 'planner', 'workload',
    'filters', 'workspace', 'account', 'milestone', 'timeline', 'profile',
    'custom', 'fields', 'board', 'item', 'advanced', 'capabilities'
  ];

  const lowerValue = value.toLowerCase();
  let featureWordCount = 0;
  for (const word of featureWords) {
    if (lowerValue.includes(word)) {
      featureWordCount++;
    }
  }

  // Se contém 1 ou mais palavras de features, provavelmente é falso positivo
  if (featureWordCount >= 1) {
    return true;
  }

  // Verificar se é um exemplo comum
  const commonExamples = [
    'sk_test_', 'pk_test_', 'example', 'sample', 'demo', 'test',
    'your_api_key', 'your_token', 'insert_key_here', 'placeholder'
  ];

  for (const example of commonExamples) {
    if (lowerValue.includes(example)) {
      return true;
    }
  }

  // Verificar se não contém caracteres especiais ou números (tokens reais geralmente têm)
  if (!/[A-Z0-9\-_\.\/+=]/.test(value) && value.length < 40) {
    return true;
  }

  // Check camelCase or snake_case pattern without numbers (usually variable names)
  if (/^[a-z][a-zA-Z]*$/.test(value) || /^[a-z]+(_[a-z]+)+$/.test(value)) {
    return true;
  }

  // Tokens reais geralmente contêm caracteres misturados (maiúsculas + minúsculas + números)
  // Se tiver APENAS minúsculas e underscores, é provavelmente um nome de variável/feature
  const hasUpperCase = /[A-Z]/.test(value);
  const hasNumbers = /[0-9]/.test(value);
  const hasSpecialChars = /[\.\-\/\+=]/.test(value);

  // Se não tem maiúsculas E não tem números E não tem caracteres especiais, é falso positivo
  if (!hasUpperCase && !hasNumbers && !hasSpecialChars) {
    return true;
  }

  // Tokens reais raramente são apenas palavras em inglês separadas por underscores
  // Se todas as partes (separadas por _) são palavras comuns, é falso positivo
  const parts = value.toLowerCase().split('_');
  const commonWords = [
    'view', 'column', 'permissions', 'tracking', 'planner', 'workload',
    'filters', 'workspace', 'account', 'milestone', 'timeline', 'profile',
    'custom', 'fields', 'board', 'item', 'advanced', 'capabilities',
    'resource', 'projects', 'time', 'viewing', 'full', 'user', 'progress',
    'in', 'on', 'at', 'from', 'to', 'with', 'and', 'or', 'for', 'the'
  ];

  const allPartsAreCommonWords = parts.every(part =>
    part.length <= 3 || commonWords.includes(part)
  );

  if (allPartsAreCommonWords && parts.length >= 2) {
    return true;
  }

  return false;
}

// ========================================
// SISTEMA DE SEVERIDADE - Priorização de Tokens
// ========================================
const TOKEN_SEVERITY = {
  CRITICAL: ['AWS', 'GITHUB', 'STRIPE', 'PRIVATE_KEY', 'PASSWORD', 'MONGODB', 'POSTGRES', 'MYSQL'],
  HIGH: ['SUPABASE', 'FIREBASE', 'VERCEL', 'SENDGRID', 'TWILIO', 'SLACK', 'SECRET'],
  MEDIUM: ['JWT', 'API_KEY', 'TOKEN', 'GITLAB', 'TWITTER', 'FACEBOOK', 'GOOGLE'],
  LOW: ['CLOUDFLARE', 'DIGITALOCEAN', 'NPM', 'HEROKU', 'REDIS', 'AZURE', 'MAILGUN']
};

// Obter severidade de um token
function getTokenSeverity(tokenType) {
  for (const [severity, types] of Object.entries(TOKEN_SEVERITY)) {
    if (types.includes(tokenType)) {
      return severity;
    }
  }
  return 'MEDIUM'; // Default
}

// ========================================
// CACHE DE SCRIPTS - Evita re-escanear
// ========================================
const scriptCache = new Map(); // hash -> resultado do scan
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 3600000; // 1 hora

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

function getCachedScan(content) {
  const hash = hashString(content);
  const cached = scriptCache.get(hash);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.tokens;
  }
  return null;
}

function setCachedScan(content, tokens) {
  const hash = hashString(content);

  // Limitar tamanho do cache
  if (scriptCache.size >= CACHE_MAX_SIZE) {
    const firstKey = scriptCache.keys().next().value;
    scriptCache.delete(firstKey);
  }

  scriptCache.set(hash, {
    tokens,
    timestamp: Date.now()
  });
}

// ========================================
// DETECÇÃO DE ENDPOINTS DE API
// ========================================
const API_ENDPOINT_PATTERNS = [
  // REST API endpoints
  /['"]https?:\/\/[a-z0-9.-]+\/api\/[a-z0-9/_-]+['"]/gi,
  /['"]\/api\/v?\d*\/[a-z0-9/_-]+['"]/gi,

  // GraphQL endpoints
  /['"]https?:\/\/[a-z0-9.-]+\/graphql['"]/gi,
  /['"]\/graphql['"]/gi,

  // Webhooks
  /['"]https?:\/\/[a-z0-9.-]+\/webhooks?\/[a-z0-9/_-]+['"]/gi,

  // Admin/Internal endpoints
  /['"]https?:\/\/[a-z0-9.-]+\/(?:admin|internal|private)\/[a-z0-9/_-]+['"]/gi,

  // Database connections
  /['"]https?:\/\/[a-z0-9.-]+:[0-9]{4,5}\/['"]/gi,
];

// ========================================
// DEDUPLICATE GLOBAL APRIMORADO
// ========================================
const globalTokens = new Map(); // value+type -> {count, urls[]}

function isTokenDuplicate(token) {
  const key = `${token.type}:${token.value}`;
  return globalTokens.has(key);
}

function registerToken(token) {
  const key = `${token.type}:${token.value}`;

  if (globalTokens.has(key)) {
    const existing = globalTokens.get(key);
    existing.count++;
    if (!existing.urls.includes(token.scriptUrl)) {
      existing.urls.push(token.scriptUrl);
    }
  } else {
    globalTokens.set(key, {
      count: 1,
      urls: [token.scriptUrl],
      firstSeen: Date.now()
    });
  }
}

// Padrões de detecção de tokens (otimizados e expandidos)
const TOKEN_PATTERNS = {
  // API Keys Genéricas
  API_KEY: [
    /['"](api[_-]?key|apikey)['"]\s*[:=]\s*['"]([A-Za-z0-9_\-]{24,})['"]/gi,
    /['"](key|access[_-]?key)['"]\s*[:=]\s*['"]([A-Za-z0-9_\-]{24,})['"]/gi,
  ],

  // JWT Tokens
  JWT: [
    /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  ],

  // AWS Credentials
  AWS: [
    /AKIA[0-9A-Z]{16}/g,
    /['"](aws[_-]?access[_-]?key[_-]?id)['"]\s*[:=]\s*['"]([A-Z0-9]{20})['"]/gi,
    /['"](aws[_-]?secret[_-]?access[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9/+=]{40})['"]/gi,
    /['"](aws[_-]?session[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9/+=]{100,})['"]/gi,
  ],

  // GitHub Tokens
  GITHUB: [
    /gh[pousr]_[A-Za-z0-9_]{36,255}/g,
    /github[_-]?token['"]\s*[:=]\s*['"]([a-zA-Z0-9]{40,})['"]/gi,
    /gho_[A-Za-z0-9_]{36,}/g, // OAuth tokens
    /ghs_[A-Za-z0-9_]{36,}/g, // Server tokens
  ],

  // GitLab Tokens
  GITLAB: [
    /glpat-[a-zA-Z0-9_\-]{20,}/g,
    /gitlab[_-]?token['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
  ],

  // Vercel Tokens
  VERCEL: [
    /['"](vercel[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_]{24,})['"]/gi,
    /vercel_[a-zA-Z0-9]{24,}/g,
  ],

  // Supabase Keys
  SUPABASE: [
    /['"](supabase[_-]?(?:key|anon[_-]?key|service[_-]?role[_-]?key))['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{100,})['"]/gi,
  ],

  // Slack Tokens
  SLACK: [
    /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g,
    /xox[abe]-\d{10,13}-\d{10,13}-[a-zA-Z0-9]{24,}/g,
  ],

  // Stripe Keys
  STRIPE: [
    /sk_live_[0-9a-zA-Z]{24,}/g,
    /pk_live_[0-9a-zA-Z]{24,}/g,
    /rk_live_[0-9a-zA-Z]{24,}/g, // Restricted keys
    /sk_test_[0-9a-zA-Z]{24,}/g,
  ],

  // Firebase
  FIREBASE: [
    /['"](firebase[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
    /AIzaSy[a-zA-Z0-9_\-]{33}/g,
  ],

  // Google API
  GOOGLE: [
    /['"](google[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
    /AIza[0-9A-Za-z_\-]{35}/g,
  ],

  // Facebook/Meta
  FACEBOOK: [
    /['"](facebook[_-]?(?:app[_-]?secret|access[_-]?token))['"]\s*[:=]\s*['"]([a-z0-9]{32,})['"]/gi,
    /EAA[a-zA-Z0-9]{100,}/g, // Facebook access tokens
  ],

  // Twitter/X API
  TWITTER: [
    /['"](twitter[_-]?(?:api[_-]?key|consumer[_-]?key))['"]\s*[:=]\s*['"]([a-zA-Z0-9]{25,})['"]/gi,
    /['"](twitter[_-]?(?:api[_-]?secret|consumer[_-]?secret))['"]\s*[:=]\s*['"]([a-zA-Z0-9]{50,})['"]/gi,
    /['"](bearer[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9%\-_]{100,})['"]/gi,
  ],

  // Twilio
  TWILIO: [
    /SK[a-z0-9]{32}/g,
    /AC[a-z0-9]{32}/g,
    /['"](twilio[_-]?(?:auth[_-]?token|account[_-]?sid))['"]\s*[:=]\s*['"]([a-z0-9]{32})['"]/gi,
  ],

  // SendGrid
  SENDGRID: [
    /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/g,
    /['"](sendgrid[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{60,})['"]/gi,
  ],

  // Mailgun
  MAILGUN: [
    /key-[a-zA-Z0-9]{32}/g,
    /['"](mailgun[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9]{32,})['"]/gi,
  ],

  // Heroku
  HEROKU: [
    /['"](heroku[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9\-]{36})['"]/gi,
  ],

  // NPM Tokens
  NPM: [
    /npm_[a-zA-Z0-9]{36}/g,
    /['"](npm[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9\-]{36,})['"]/gi,
  ],

  // MongoDB Connection Strings
  MONGODB: [
    /mongodb(\+srv)?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-]+@[a-zA-Z0-9\-\.\/:?=&]+/gi,
    /['"](mongo(?:db)?[_-]?(?:uri|url|connection[_-]?string))['"]\s*[:=]\s*['"](mongodb[^'"]+)['"]/gi,
  ],

  // PostgreSQL Connection Strings
  POSTGRES: [
    /postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-]+@[a-zA-Z0-9\-\.\/:?=&]+/gi,
    /['"](postgres(?:ql)?[_-]?(?:uri|url|connection[_-]?string))['"]\s*[:=]\s*['"](postgres[^'"]+)['"]/gi,
  ],

  // MySQL Connection Strings
  MYSQL: [
    /mysql:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-]+@[a-zA-Z0-9\-\.\/:?=&]+/gi,
    /['"](mysql[_-]?(?:uri|url|connection[_-]?string))['"]\s*[:=]\s*['"](mysql[^'"]+)['"]/gi,
  ],

  // Redis Connection
  REDIS: [
    /redis:\/\/[a-zA-Z0-9_\-]*:?[a-zA-Z0-9_\-]*@[a-zA-Z0-9\-\.\/:?=&]+/gi,
    /['"](redis[_-]?(?:uri|url|password))['"]\s*[:=]\s*['"](redis[^'"]+)['"]/gi,
  ],

  // Cloudflare API
  CLOUDFLARE: [
    /['"](cloudflare[_-]?api[_-]?(?:key|token))['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{37,})['"]/gi,
  ],

  // DigitalOcean
  DIGITALOCEAN: [
    /['"](digitalocean[_-]?(?:token|access[_-]?token))['"]\s*[:=]\s*['"]([a-zA-Z0-9]{64})['"]/gi,
  ],

  // Azure Keys
  AZURE: [
    /['"](azure[_-]?(?:storage[_-]?key|connection[_-]?string))['"]\s*[:=]\s*['"]([a-zA-Z0-9+/=]{88,})['"]/gi,
  ],

  // Passwords
  PASSWORD: [
    /['"](password|passwd|pwd|db[_-]?password)['"]\s*[:=]\s*['"]([^'"]{8,})['"]/gi,
  ],

  // Generic Secrets
  SECRET: [
    /['"](secret[_-]?key|client[_-]?secret|app[_-]?secret)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
  ],

  // Generic Tokens
  TOKEN: [
    /['"](auth[_-]?token|access[_-]?token|bearer[_-]?token|api[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{20,})['"]/gi,
  ],

  // Private Keys
  PRIVATE_KEY: [
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
    /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/g,
    /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/g,
    /-----BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----/g,
  ]
};

// ========================================
// MODO CIRÚRGICO - Apenas domínio atual
// ========================================
const KNOWN_CDNS = [
  'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
  'code.jquery.com', 'ajax.googleapis.com', 'cdn.ampproject.org',
  'stackpath.bootstrapcdn.com', 'maxcdn.bootstrapcdn.com',
  'use.fontawesome.com', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'polyfill.io', 'cdn.polyfill.io', 'bundle.run',
  'esm.sh', 'cdn.skypack.dev', 'ga.jspm.io'
];

function isCDNScript(scriptUrl) {
  try {
    const url = new URL(scriptUrl);
    return KNOWN_CDNS.some(cdn => url.hostname.includes(cdn));
  } catch {
    return false;
  }
}

function isSameDomain(scriptUrl, currentHostname) {
  try {
    const url = new URL(scriptUrl);
    return url.hostname === currentHostname || url.hostname.endsWith('.' + currentHostname);
  } catch {
    return false;
  }
}

// Verificar configurações e iniciar scan automático
async function initAutoScan() {
  try {
    const { settings } = await chrome.storage.local.get('settings');

    // Verificar se deve pular este domínio (filtro de redes sociais)
    const skipSocialMedia = settings?.skipSocialMediaScan !== false; // Active by default
    if (skipSocialMedia && shouldSkipDomain(window.location.href)) {
      console.log('⏭️ Scan pulado: domínio está na blacklist de redes sociais/tracking');
      return;
    }

    if (settings && settings.autoScanEnabled) {
      console.log('🤖 Modo automático ativo - Aguardando...', settings.scanDelay, 'ms');

      // Aguardar um delay antes de escanear
      setTimeout(async () => {
        console.log('🔍 Iniciando scan automático...');
        const results = await scanForTokens(true); // true = modo cirúrgico

        if (results.tokens.length > 0) {
          console.log(`✅ Auto-scan completo: ${results.tokens.length} token(s) found`);

          // DESABILITADO: Validação automática pode travar o site
          // A validação só acontece no SCAN MANUAL
          console.log('ℹ️ Use scan manual para validar tokens');

          // Enviar para background para processar (SEM validação)
          chrome.runtime.sendMessage({
            action: 'tokensFound',
            data: results
          });
        } else {
          console.log('✅ Auto-scan completo: no tokens found');
        }
      }, settings.scanDelay || 3000);
    }
  } catch (error) {
    console.error('❌ Erro ao iniciar auto scan:', error);
  }
}

// Função principal de scan (básico - página atual) - OTIMIZADA COM WEB WORKER
async function scanForTokens(surgical = true) {
  const foundTokens = {
    tokens: [],
    endpoints: [],
    scriptsAnalyzed: 0,
    scriptsSkipped: 0,
    mode: surgical ? 'SURGICAL' : 'FULL'
  };

  try {
    // Verificar se deve pular este domínio (scan manual também respeita o filtro se configurado)
    const { settings } = await chrome.storage.local.get('settings');
    const skipSocialMedia = settings?.skipSocialMediaScan !== false; // Active by default

    if (skipSocialMedia && shouldSkipDomain(window.location.href)) {
      console.log('⏭️ Scan pulado: domínio está na blacklist de redes sociais/tracking');
      return foundTokens; // Retorna vazio
    }

    const currentHostname = window.location.hostname;
    console.log(`🎯 Modo: ${surgical ? 'CIRÚRGICO (apenas domínio atual)' : 'COMPLETO (todos os scripts)'}`);

    // Obter todos os scripts da página
    const scripts = Array.from(document.scripts);
    console.log(`🔍 Encontrados ${scripts.length} scripts na página`);

    // Coletar conteúdo dos scripts de forma não-bloqueante
    const scriptsToAnalyze = [];

    // Processar scripts inline (rápido)
    for (const script of scripts) {
      if (script.textContent && script.textContent.length > 50) {
        // Verificar cache primeiro
        const cachedTokens = getCachedScan(script.textContent);
        if (cachedTokens) {
          console.log('💾 Cache hit: script inline');
          scriptsToAnalyze.push({
            content: script.textContent,
            url: 'inline script',
            cached: true,
            cachedTokens
          });
        } else {
          scriptsToAnalyze.push({
            content: script.textContent,
            url: 'inline script'
          });
        }
      }
    }

    // Buscar scripts externos com filtro cirúrgico
    let externalScripts = scripts.filter(s => s.src);

    // MODO CIRÚRGICO: Filtrar apenas scripts do mesmo domínio
    if (surgical) {
      externalScripts = externalScripts.filter(script => {
        // Ignorar CDNs conhecidos
        if (isCDNScript(script.src)) {
          foundTokens.scriptsSkipped++;
          return false;
        }

        // Apenas scripts do mesmo domínio ou subdomínios
        if (!isSameDomain(script.src, currentHostname)) {
          foundTokens.scriptsSkipped++;
          return false;
        }

        return true;
      });

      console.log(`🎯 Filtro cirúrgico: ${externalScripts.length} scripts relevantes (${foundTokens.scriptsSkipped} CDNs/externos ignorados)`);
    }

    // LIMITE MÁXIMO: Não processar mais de 50 scripts externos para não travar
    const MAX_EXTERNAL_SCRIPTS = 50;
    if (externalScripts.length > MAX_EXTERNAL_SCRIPTS) {
      console.log(`⚠️ Limitando de ${externalScripts.length} para ${MAX_EXTERNAL_SCRIPTS} scripts externos (proteção contra travamento)`);
      foundTokens.scriptsSkipped += (externalScripts.length - MAX_EXTERNAL_SCRIPTS);
      externalScripts = externalScripts.slice(0, MAX_EXTERNAL_SCRIPTS);
    }

    // REDUZIDO: 2 fetches por vez para não saturar a rede e não travar
    const CONCURRENT_FETCHES = 2;

    for (let i = 0; i < externalScripts.length; i += CONCURRENT_FETCHES) {
      const batch = externalScripts.slice(i, i + CONCURRENT_FETCHES);

      const fetchPromises = batch.map(async (script) => {
        try {
          // Ignorar source maps e scripts de terceiros conhecidos
          if (script.src.includes('.map') ||
              script.src.includes('google-analytics') ||
              script.src.includes('googletagmanager') ||
              script.src.includes('facebook.net') ||
              script.src.includes('twitter.com') ||
              script.src.includes('linkedin.com') ||
              script.src.includes('hotjar.com') ||
              script.src.includes('clarity.ms')) {
            foundTokens.scriptsSkipped++;
            return null;
          }

          // Verificar cache primeiro (antes de fazer fetch)
          const cachedTokens = scriptCache.get(script.src);
          if (cachedTokens && (Date.now() - cachedTokens.timestamp) < CACHE_TTL) {
            console.log(`💾 Cache hit: ${script.src}`);
            return {
              content: '', // Conteúdo vazio, usa cache
              url: script.src,
              cached: true,
              cachedTokens: cachedTokens.tokens
            };
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout (reduzido para não travar)

          const response = await fetch(script.src, {
            signal: controller.signal,
            priority: 'low' // Não bloquear outras requisições
          });
          clearTimeout(timeoutId);

          const content = await response.text();

          // Não processar scripts muito grandes (> 500KB para não travar)
          if (content.length > 524288) {
            console.log(`⚠️ Script muito grande ignorado (>${(content.length/1024).toFixed(0)}KB): ${script.src}`);
            foundTokens.scriptsSkipped++;
            return null;
          }

          return {
            content,
            url: script.src
          };
        } catch (error) {
          // Silenciosamente ignorar erros de CORS ou scripts inacessíveis
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      scriptsToAnalyze.push(...results.filter(r => r !== null));

      // Delay maior entre batches para NÃO TRAVAR o site (200ms = tempo para navegador respirar)
      if (i + CONCURRENT_FETCHES < externalScripts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`📦 ${scriptsToAnalyze.length} scripts coletados, iniciando análise em background...`);

    // Usar Web Worker para análise pesada
    const results = await analyzeScriptsWithWorker(scriptsToAnalyze);
    foundTokens.tokens = results.tokens;
    foundTokens.scriptsAnalyzed = results.scriptsAnalyzed;

    console.log(`✅ Scan completo: ${foundTokens.tokens.length} tokens em ${foundTokens.scriptsAnalyzed} scripts`);
  } catch (error) {
    console.error('❌ Erro durante scan:', error);
  }

  return foundTokens;
}

// Analisar scripts usando Web Worker (não bloqueia o navegador)
function analyzeScriptsWithWorker(scripts) {
  return new Promise((resolve, reject) => {
    // Verificar se há scripts para processar
    if (!scripts || scripts.length === 0) {
      resolve({ tokens: [], scriptsAnalyzed: 0 });
      return;
    }

    try {
      const workerUrl = chrome.runtime.getURL('token-scanner-worker.js');
      const worker = new Worker(workerUrl, { type: 'module' });

      let lastProgressUpdate = Date.now();
      let workerTimeout = setTimeout(() => {
        console.log('ℹ️ Worker timeout após 10s, usando fallback não-bloqueante');
        worker.terminate();
        resolve(analyzeScriptsFallback(scripts));
      }, 10000); // 10 segundos timeout (reduzido para não travar)

      worker.onmessage = (event) => {
        try {
          const { type, data, error } = event.data;

          if (type === 'progress') {
            // Throttle progress logs (máximo 1 por segundo)
            const now = Date.now();
            if (now - lastProgressUpdate > 1000) {
              console.log(`⚙️ Progresso: ${data.analyzed}/${data.total} scripts (${data.tokensFound} tokens)`);
              lastProgressUpdate = now;
            }
          } else if (type === 'complete') {
            clearTimeout(workerTimeout);
            worker.terminate();
            resolve(data);
          } else if (type === 'error') {
            console.warn('⚠️ Erro parcial no worker:', error);
            // Não terminar o worker por erros parciais, continuar processamento
          }
        } catch (err) {
          console.error('❌ Erro ao processar mensagem do worker:', err);
          clearTimeout(workerTimeout);
          worker.terminate();
          resolve(analyzeScriptsFallback(scripts));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(workerTimeout);
        worker.terminate();
        const errorMsg = error?.message || error?.error?.message || 'CSP ou contexto não suportado';
        console.log(`ℹ️ Worker não suportado (${errorMsg}), usando fallback otimizado`);
        // Fallback para análise síncrona
        resolve(analyzeScriptsFallback(scripts));
      };

      // Enviar scripts para o worker com validação
      try {
        worker.postMessage({
          type: 'scanScripts',
          data: { scripts, chunkSize: 5 }
        });
      } catch (postError) {
        console.log('ℹ️ Não foi possível comunicar com worker, usando fallback');
        clearTimeout(workerTimeout);
        worker.terminate();
        resolve(analyzeScriptsFallback(scripts));
      }

    } catch (error) {
      const errorMsg = error?.message || error?.error?.message || String(error);
      console.log('ℹ️ Worker não disponível neste contexto, usando análise direta (normal para content scripts)');
      resolve(analyzeScriptsFallback(scripts));
    }
  });
}

// Fallback: análise 100% não-bloqueante (caso o worker falhe)
async function analyzeScriptsFallback(scripts) {
  const foundTokens = {
    tokens: [],
    endpoints: [],
    scriptsAnalyzed: 0
  };

  console.log(`📊 Modo fallback: analisando ${scripts.length} scripts 100% não-bloqueante`);

  // Processar 1 script por vez com yield AGRESSIVO para NUNCA travar
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];

    // Usar cache se disponível
    if (script.cached && script.cachedTokens) {
      foundTokens.tokens.push(...script.cachedTokens);
      foundTokens.scriptsAnalyzed++;
      continue;
    }

    // Processar script em idle time APENAS
    await new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          // Só processa se o navegador estiver realmente idle
          analyzeScript(script.content, script.url, foundTokens);
          foundTokens.scriptsAnalyzed++;
          resolve();
        }, { timeout: 1000 }); // Timeout de 1s para garantir progresso
      } else {
        // Fallback: setTimeout com delay generoso
        setTimeout(() => {
          analyzeScript(script.content, script.url, foundTokens);
          foundTokens.scriptsAnalyzed++;
          resolve();
        }, 50); // 50ms entre scripts
      }
    });

    // Log de progresso a cada 5 scripts (reduzido para menos overhead)
    if (foundTokens.scriptsAnalyzed % 5 === 0) {
      console.log(`📈 ${foundTokens.scriptsAnalyzed}/${scripts.length} scripts (${foundTokens.tokens.length} tokens)`);
    }

    // Yield EXTRA após cada script para navegador respirar
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  console.log(`✅ Fallback: ${foundTokens.tokens.length} tokens em ${foundTokens.scriptsAnalyzed} scripts`);
  return foundTokens;
}

// Função de Deep Scan com crawler profundo + bug bounty focus
async function deepScanForTokens(maxDepth = 50) {
  console.log(`🕷️ Iniciando Deep Scan com profundidade ${maxDepth}...`);

  const foundTokens = {
    tokens: [],
    buckets: [],
    bugbountyCredentials: [],
    scriptsAnalyzed: 0,
    pagesVisited: 0,
    depth: maxDepth
  };

  try {
    // Notificar background que deep scan começou
    chrome.runtime.sendMessage({
      action: 'deepScanStarted',
      progress: {
        pagesVisited: 0,
        scriptsAnalyzed: 0,
        tokensFound: 0
      }
    }).catch(err => console.log('Background não disponível:', err));

    // Garantir que os módulos estão carregados
    console.log('🔄 Aguardando carregamento dos módulos...');
    const loaded = await ensureModulesLoaded();

    // Verificar se Deep Crawler está disponível
    if (!loaded || !DeepCrawler) {
      console.warn('⚠️ Deep Crawler não disponível, usando scan básico');
      return await scanForTokens();
    }

    console.log('✅ Módulos carregados, iniciando Deep Scan...');

    // Criar instância do crawler e bucket detector
    const crawler = new DeepCrawler(maxDepth);
    const bucketDetector = BucketTakeoverDetector ? new BucketTakeoverDetector() : null;

    // Iniciar crawling
    const allScripts = await crawler.crawl();

    console.log(`📊 Scripts found: ${allScripts.length}`);

    // Analyze each found script
    for (const scriptData of allScripts) {
      foundTokens.scriptsAnalyzed++;

      // Standard token analysis
      analyzeScript(scriptData.content, scriptData.url, foundTokens);

      // Análise de buckets e bug bounty credentials
      if (bucketDetector) {
        const bucketResults = await bucketDetector.fullScan(scriptData.content, scriptData.url);
        foundTokens.buckets.push(...bucketResults.buckets);
        foundTokens.bugbountyCredentials.push(...bucketResults.credentials);
      }

      // Log de progresso e atualizar background a cada 10 scripts
      if (foundTokens.scriptsAnalyzed % 10 === 0) {
        console.log(`🔍 Analisados ${foundTokens.scriptsAnalyzed}/${allScripts.length} scripts...`);

        // Atualizar progresso no background
        chrome.runtime.sendMessage({
          action: 'deepScanProgress',
          progress: {
            pagesVisited: foundTokens.pagesVisited,
            scriptsAnalyzed: foundTokens.scriptsAnalyzed,
            tokensFound: foundTokens.tokens.length
          }
        }).catch(err => console.log('Background não disponível:', err));
      }
    }

    // Obter estatísticas do crawler
    const stats = crawler.getStats();
    foundTokens.pagesVisited = stats.pagesVisited;

    console.log(`✅ Deep Scan completo:`);
    console.log(`   - Páginas visitadas: ${foundTokens.pagesVisited}`);
    console.log(`   - Scripts analisados: ${foundTokens.scriptsAnalyzed}`);
    console.log(`   - Tokens encontrados: ${foundTokens.tokens.length}`);
    console.log(`   - Buckets encontrados: ${foundTokens.buckets.length}`);
    console.log(`   - Bug Bounty Credentials: ${foundTokens.bugbountyCredentials.length}`);

    // Combinar tokens padrão com bug bounty credentials
    const allCredentials = [...foundTokens.tokens, ...foundTokens.bugbountyCredentials];

    // Validar TODOS os tokens encontrados
    if (allCredentials.length > 0 && validatorModule) {
      console.log('🔐 Validando todos os tokens encontrados...');
      const validatedCredentials = await validateAllTokens(allCredentials);

      // Filtrar apenas tokens válidos
      const validTokens = validatedCredentials.filter(t => t.validation?.valid === true);
      console.log(`✅ Validação completa: ${validTokens.length} tokens válidos de ${allCredentials.length} total`);

      foundTokens.tokens = validatedCredentials;
      foundTokens.validTokens = validTokens;
    }

    // Validar buckets para takeover
    if (foundTokens.buckets.length > 0 && bucketDetector) {
      console.log('🪣 Validando buckets para possível takeover...');
      foundTokens.buckets = await validateBuckets(foundTokens.buckets, bucketDetector);

      const vulnerableBuckets = foundTokens.buckets.filter(b => b.validation?.vulnerable === true);
      if (vulnerableBuckets.length > 0) {
        console.log(`⚠️ ALERTA: ${vulnerableBuckets.length} bucket(s) vulnerável(is) a takeover!`);
        foundTokens.vulnerableBuckets = vulnerableBuckets;
      }
    }

  } catch (error) {
    console.error('❌ Erro durante deep scan:', error);
  }

  // Notificar background que deep scan foi completado
  chrome.runtime.sendMessage({
    action: 'deepScanCompleted',
    data: foundTokens
  }).catch(err => console.log('Background não disponível:', err));

  return foundTokens;
}

// Validar buckets para takeover
async function validateBuckets(buckets, bucketDetector) {
  const validatedBuckets = [];

  console.log(`🔐 Iniciando validação de ${buckets.length} buckets...`);

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];

    try {
      const validation = await bucketDetector.validateBucketTakeover(bucket);
      validatedBuckets.push({
        ...bucket,
        validation
      });

      if (validation.vulnerable === true) {
        console.log(`⚠️ BUCKET VULNERÁVEL [${i + 1}/${buckets.length}]: ${bucket.url} - ${validation.status}`);
      }

      // Rate limiting - 2 segundos entre validações de buckets
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Erro ao validar bucket ${i + 1}:`, error);
      validatedBuckets.push({
        ...bucket,
        validation: { vulnerable: null, status: 'Erro: ' + error.message }
      });
    }
  }

  return validatedBuckets;
}

// Validar tokens com rate limiting agressivo e processamento em background
async function validateAllTokens(tokens) {
  if (!validatorModule || !validatorModule.validateToken) {
    console.warn('⚠️ Módulo de validação não disponível');
    return tokens;
  }

  const validatedTokens = [];
  let validCount = 0;
  let invalidCount = 0;

  console.log(`🔐 Iniciando validação de ${tokens.length} tokens em background...`);

  // Validar em batches pequenos para não travar
  const BATCH_SIZE = 3;
  const DELAY_BETWEEN_BATCHES = 2000; // 2s entre batches
  const DELAY_BETWEEN_VALIDATIONS = 1000; // 1s entre validações

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    for (const token of batch) {
      try {
        // Usar requestIdleCallback para validar apenas quando o navegador estiver ocioso
        const validation = await new Promise((resolve) => {
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(async () => {
              const result = await validatorModule.validateToken(token.type, token.value);
              resolve(result);
            }, { timeout: 5000 });
          } else {
            // Fallback para navegadores sem requestIdleCallback
            setTimeout(async () => {
              const result = await validatorModule.validateToken(token.type, token.value);
              resolve(result);
            }, 100);
          }
        });

        validatedTokens.push({
          ...token,
          validation
        });

        if (validation.valid === true) {
          validCount++;
          console.log(`⚠️ TOKEN VÁLIDO [${validatedTokens.length}/${tokens.length}]: ${token.type}`);
        } else if (validation.valid === false) {
          invalidCount++;
        }

        // Delay entre validações individuais
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VALIDATIONS));

      } catch (error) {
        console.error(`❌ Erro ao validar token:`, error);
        validatedTokens.push({
          ...token,
          validation: { valid: null, status: 'Erro: ' + error.message }
        });
      }
    }

    // Progress log
    console.log(`📊 Progresso: ${validatedTokens.length}/${tokens.length} (${validCount} válidos, ${invalidCount} inválidos)`);

    // Delay maior entre batches
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`✅ Validação completa: ${validCount} válidos | ${invalidCount} inválidos | ${tokens.length - validCount - invalidCount} não testados`);

  return validatedTokens;
}

// Calcular linha e coluna a partir do índice
function getLineAndColumn(content, index) {
  const lines = content.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

// Analisar script em busca de tokens com localização precisa + SEVERIDADE + ENDPOINTS
function analyzeScript(content, scriptUrl, results) {
  // Detectar ENDPOINTS de API
  if (results.endpoints !== undefined) {
    for (const regex of API_ENDPOINT_PATTERNS) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const endpoint = match[0].replace(/['"]/g, '');

        // Evitar duplicatas de endpoints
        if (!results.endpoints.some(e => e.url === endpoint)) {
          results.endpoints.push({
            url: endpoint,
            scriptUrl,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  // Detectar TOKENS
  for (const [type, regexList] of Object.entries(TOKEN_PATTERNS)) {
    for (const regex of regexList) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const value = match[2] || match[1] || match[0];

        // Obter contexto
        const matchIndex = match.index;
        const contextStart = Math.max(0, matchIndex - 100);
        const contextEnd = Math.min(content.length, matchIndex + match[0].length + 100);
        const context = content.substring(contextStart, contextEnd).replace(/\s+/g, ' ');

        // Verificar falsos positivos
        if (isFalsePositive(value, context)) {
          continue;
        }

        // Criar objeto de token
        const token = {
          type,
          value,
          scriptUrl,
          severity: getTokenSeverity(type), // NOVO: Severidade
          location: {
            line: 0,
            column: 0,
            index: matchIndex
          },
          context: context.length < 200 ? context : context.substring(0, 200) + '...',
          timestamp: new Date().toISOString()
        };

        // DEDUPLICATE GLOBAL - Evita reportar o mesmo token múltiplas vezes
        if (isTokenDuplicate(token)) {
          continue;
        }

        // Evitar duplicatas locais
        const isDuplicate = results.tokens.some(t =>
          t.value === value && t.scriptUrl === scriptUrl
        );

        if (!isDuplicate && value.length > 10) {
          // Calcular localização precisa
          const location = getLineAndColumn(content, matchIndex);
          token.location.line = location.line;
          token.location.column = location.column;

          // Registrar token globalmente
          registerToken(token);

          results.tokens.push(token);
        }
      }
    }
  }
}

// Listener para mensagens do popup (scan manual)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startManualScan') {
    // Scan básico (página atual)
    scanForTokens().then(async results => {
      // Validar tokens se encontrados
      if (results.tokens.length > 0) {
        console.log('🔐 Validando tokens do scan manual...');
        results.tokens = await validateAllTokens(results.tokens);

        // Filtrar apenas válidos
        const validTokens = results.tokens.filter(t => t.validation?.valid === true);
        results.validTokens = validTokens;

        if (validTokens.length > 0) {
          console.log(`⚠️ ALERTA: ${validTokens.length} token(s) válido(s) encontrado(s)!`);
        }
      }

      sendResponse(results);

      // Enviar apenas tokens VÁLIDOS para background
      if (results.validTokens && results.validTokens.length > 0) {
        chrome.runtime.sendMessage({
          action: 'manualScan',
          data: {
            ...results,
            tokens: results.validTokens // Enviar apenas válidos
          }
        });
      }
    });
    return true; // Mantém o canal aberto para resposta assíncrona
  }

  // Deep Scan com crawler profundo
  if (request.action === 'startDeepScan') {
    const depth = request.depth || 50;
    console.log(`🕷️ Iniciando Deep Scan com profundidade ${depth}...`);

    deepScanForTokens(depth).then(results => {
      sendResponse(results);

      // Enviar apenas tokens VÁLIDOS para background
      if (results.validTokens && results.validTokens.length > 0) {
        chrome.runtime.sendMessage({
          action: 'deepScan',
          data: {
            ...results,
            tokens: results.validTokens // Enviar apenas válidos
          }
        });
      }
    });
    return true;
  }
});

// Iniciar auto scan quando a página carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoScan);
} else {
  initAutoScan();
}

} // Fim do bloco de prevenção de múltiplas execuções
