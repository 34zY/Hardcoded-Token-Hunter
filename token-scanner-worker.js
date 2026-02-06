// Web Worker for script analysis without freezing the browser
// Processa tokens em background thread

// Token detection patterns (copied from content.js)
const TOKEN_PATTERNS = {
  API_KEY: [
    /['"](api[_-]?key|apikey)['"]\s*[:=]\s*['"]([A-Za-z0-9_\-]{24,})['"]/gi,
    /['"](key|access[_-]?key)['"]\s*[:=]\s*['"]([A-Za-z0-9_\-]{24,})['"]/gi,
  ],
  JWT: [
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  ],
  AWS: [
    /AKIA[0-9A-Z]{16}/g,
    /['"](aws[_-]?access[_-]?key[_-]?id)['"]\s*[:=]\s*['"]([A-Z0-9]{20})['"]/gi,
    /['"](aws[_-]?secret[_-]?access[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9/+=]{40})['"]/gi,
  ],
  GITHUB: [
    /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    /github[_-]?token['"]\s*[:=]\s*['"]([a-zA-Z0-9]{40})['"]/gi,
  ],
  GITLAB: [
    /glpat-[a-zA-Z0-9_\-]{20,}/g,
    /gitlab[_-]?token['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
  ],
  VERCEL: [
    /['"](vercel[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_]{24})['"]/gi,
    /vercel_[a-zA-Z0-9]{24}/g,
  ],
  SUPABASE: [
    /['"](supabase[_-]?key|supabase[_-]?anon[_-]?key|supabase[_-]?service[_-]?role[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{100,})['"]/gi,
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/
  ],
  SLACK: [
    /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g,
  ],
  STRIPE: [
    /sk_live_[0-9a-zA-Z]{24,}/g,
    /pk_live_[0-9a-zA-Z]{24,}/g,
  ],
  FIREBASE: [
    /['"](firebase[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
    /AIzaSy[a-zA-Z0-9_\-]{33}/g,
  ],
  GOOGLE: [
    /['"](google[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
  ],
  FACEBOOK: [
    /['"](facebook[_-]?app[_-]?secret)['"]\s*[:=]\s*['"]([a-z0-9]{32})['"]/gi,
  ],
  TWITTER: [
    /['"](twitter[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9]{25})['"]/gi,
    /['"](twitter[_-]?api[_-]?secret)['"]\s*[:=]\s*['"]([a-zA-Z0-9]{50})['"]/gi,
  ],
  PASSWORD: [
    /['"](password|passwd|pwd)['"]\s*[:=]\s*['"]([^'"]{6,})['"]/gi,
  ],
  SECRET: [
    /['"](secret[_-]?key|client[_-]?secret)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
  ],
  TOKEN: [
    /['"](auth[_-]?token|access[_-]?token|bearer[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{20,})['"]/gi,
  ],
  PRIVATE_KEY: [
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  ]
};

// Check if it's a false positive
function isFalsePositive(value, context) {
  // Check if it's too short or empty
  if (value.length < 12 || /^[0]{8,}$/.test(value) || /^[x]{8,}$/i.test(value)) {
    return true;
  }

  // Check if it contains only lowercase letters and underscores
  if (/^[a-z_]+$/.test(value)) {
    return true;
  }

  // Check feature flag patterns
  if (/^[a-z]+(_[a-z0-9]+){1,5}$/.test(value)) {
    return true;
  }

  if (/^[a-z]+(_[a-z]+){2,}$/.test(value)) {
    return true;
  }

  // Verificar palavras comuns de features/configs
  const featureWords = [
    'default', 'feature', 'config', 'setting', 'option', 'enable', 'disable',
    'flag', 'toggle', 'badge', 'card', 'sidebar', 'upsell', 'trial', 'support',
    'verified', 'verification', 'impressions', 'home', 'threads', 'drafts',
    'progress', 'ended', 'quick', 'free', 'premium', 'subscription',
    'view', 'column', 'permissions', 'tracking', 'planner', 'workload'
  ];

  const lowerValue = value.toLowerCase();
  let featureWordCount = 0;
  for (const word of featureWords) {
    if (lowerValue.includes(word)) {
      featureWordCount++;
    }
  }

  if (featureWordCount >= 1) {
    return true;
  }

  // Verificar exemplos comuns
  const commonExamples = [
    'sk_test_', 'pk_test_', 'example', 'sample', 'demo', 'test',
    'your_api_key', 'your_token'
  ];

  for (const example of commonExamples) {
    if (lowerValue.includes(example)) {
      return true;
    }
  }

  // Check if it doesn't contain special characters or numbers
  if (!/[A-Z0-9\-_\.\/+=]/.test(value) && value.length < 40) {
    return true;
  }

  const hasUpperCase = /[A-Z]/.test(value);
  const hasNumbers = /[0-9]/.test(value);
  const hasSpecialChars = /[\.\-\/\+=]/.test(value);

  if (!hasUpperCase && !hasNumbers && !hasSpecialChars) {
    return true;
  }

  return false;
}

// Calculate line and column from index
function getLineAndColumn(content, index) {
  const lines = content.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

// Analyze script for tokens (worker version)
function analyzeScript(content, scriptUrl) {
  const foundTokens = [];

  for (const [type, regexList] of Object.entries(TOKEN_PATTERNS)) {
    for (const regex of regexList) {
      let match;
      let iterations = 0;
      const maxIterations = 1000; // Prevenir loops infinitos

      while ((match = regex.exec(content)) !== null && iterations++ < maxIterations) {
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

        // Evitar duplicatas
        const isDuplicate = foundTokens.some(t => t.value === value);

        if (!isDuplicate && value.length > 10) {
          // Calculate precise location
          const location = getLineAndColumn(content, matchIndex);

          foundTokens.push({
            type,
            value,
            scriptUrl,
            location: {
              line: location.line,
              column: location.column,
              index: matchIndex
            },
            context: context.length < 200 ? context : context.substring(0, 200) + '...',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  return foundTokens;
}

// Processar scripts de forma síncrona (workers não precisam de async para processamento)
function processScripts(scripts) {
  const results = {
    tokens: [],
    scriptsAnalyzed: 0
  };

  const total = scripts.length;
  let lastProgressReport = 0;

  for (let i = 0; i < total; i++) {
    const script = scripts[i];

    try {
      if (!script || !script.content) {
        continue;
      }

      const tokens = analyzeScript(script.content, script.url);
      results.tokens.push(...tokens);
      results.scriptsAnalyzed++;

      // Reportar progresso a cada 10% ou a cada 5 scripts
      const progressPercent = Math.floor((i / total) * 100);
      if (progressPercent >= lastProgressReport + 10 || i % 5 === 0) {
        lastProgressReport = progressPercent;
        self.postMessage({
          type: 'progress',
          data: {
            analyzed: results.scriptsAnalyzed,
            total: total,
            tokensFound: results.tokens.length
          }
        });
      }

    } catch (error) {
      // Continuar processamento mesmo com erro
      self.postMessage({
        type: 'error',
        error: 'Erro ao analisar script ' + i + ': ' + error.message
      });
    }
  }

  return results;
}

// Listener para mensagens do thread principal
self.addEventListener('message', function(event) {
  const { type, data } = event.data;

  if (type === 'scanScripts') {
    try {
      const results = processScripts(data.scripts);

      self.postMessage({
        type: 'complete',
        data: results
      });

    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
});
