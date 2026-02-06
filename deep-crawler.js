// Deep Crawler - OFJAAAH Hardcoded Token Detector
// Deep crawler for JavaScript analysis with depth 10

class DeepCrawler {
  constructor(maxDepth = 10) {
    this.maxDepth = maxDepth;
    this.visitedUrls = new Set();
    this.foundScripts = new Set();
    this.queue = [];
    this.depth = 0;
  }

  // Iniciar crawler profundo
  async crawl(startUrl = window.location.href) {
    console.log(`🕷️ Iniciando Deep Crawler (depth: ${this.maxDepth})`);

    this.queue.push({ url: startUrl, depth: 0 });
    const allScripts = [];

    while (this.queue.length > 0) {
      const { url, depth } = this.queue.shift();

      if (depth > this.maxDepth || this.visitedUrls.has(url)) {
        continue;
      }

      console.log(`🔍 Crawling [depth ${depth}]: ${url}`);
      this.visitedUrls.add(url);

      try {
        const scripts = await this.extractScriptsFromPage(url, depth);
        allScripts.push(...scripts);

        // If max depth not reached, fetch more links
        if (depth < this.maxDepth) {
          const links = await this.extractLinks(url);
          for (const link of links) {
            if (!this.visitedUrls.has(link) && this.isSameDomain(link, startUrl)) {
              this.queue.push({ url: link, depth: depth + 1 });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao processar ${url}:`, error.message);
        // Log detalhado do erro para debug
        if (error.stack) {
          console.debug('Stack trace:', error.stack);
        }
      }

      // Delay to avoid overload
      await this.sleep(100);
    }

    console.log(`✅ Crawler completo: ${allScripts.length} scripts encontrados em ${this.visitedUrls.size} páginas`);
    return allScripts;
  }

  // Extract scripts from a page
  async extractScriptsFromPage(url, depth) {
    const scripts = [];

    try {
      let htmlContent;

      // If it's the current page, use DOM
      if (url === window.location.href) {
        htmlContent = document.documentElement.outerHTML;
      } else {
        // Fetch external page
        const response = await fetch(url);
        htmlContent = await response.text();
      }

      // Parser HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Encontrar todos os scripts
      const scriptElements = doc.querySelectorAll('script');

      for (const script of scriptElements) {
        // Script inline
        if (script.textContent && script.textContent.trim()) {
          const scriptData = {
            type: 'inline',
            url: url,
            content: script.textContent,
            depth: depth,
            size: script.textContent.length,
            foundAt: new Date().toISOString()
          };

          scripts.push(scriptData);
          this.foundScripts.add(JSON.stringify({ url, type: 'inline' }));
        }

        // Script externo
        if (script.src) {
          const scriptUrl = this.resolveUrl(script.src, url);
          const scriptKey = JSON.stringify({ url: scriptUrl, type: 'external' });

          // Ignorar scripts de terceiros conhecidos e source maps
          if (scriptUrl.includes('.map') ||
              scriptUrl.includes('google-analytics') ||
              scriptUrl.includes('googletagmanager') ||
              scriptUrl.includes('facebook.net') ||
              scriptUrl.includes('twitter.com') ||
              scriptUrl.includes('linkedin.com') ||
              scriptUrl.includes('hotjar.com') ||
              scriptUrl.includes('clarity.ms') ||
              scriptUrl.includes('redditstatic.com') ||
              scriptUrl.includes('quora.com') ||
              scriptUrl.includes('marketo.net') ||
              scriptUrl.includes('ads-twitter.com')) {
            continue;
          }

          if (!this.foundScripts.has(scriptKey)) {
            try {
              const response = await fetch(scriptUrl);
              const content = await response.text();

              const scriptData = {
                type: 'external',
                url: scriptUrl,
                content: content,
                depth: depth,
                size: content.length,
                foundAt: new Date().toISOString()
              };

              scripts.push(scriptData);
              this.foundScripts.add(scriptKey);

              // Analisar sourceMappingURL e buscar source maps
              const sourceMapMatch = content.match(/\/\/# sourceMappingURL=(.+)/);
              if (sourceMapMatch) {
                await this.fetchSourceMap(scriptUrl, sourceMapMatch[1], scripts, depth);
              }

            } catch (error) {
              // Silenciosamente ignorar erros CORS e de rede
              // Apenas logar erros inesperados
              if (!error.message.includes('CORS') &&
                  !error.message.includes('Failed to fetch') &&
                  !error.message.includes('NetworkError')) {
                console.warn(`⚠️ Erro ao buscar script: ${scriptUrl}`, error.message);
              }
            }
          }
        }
      }

      // Buscar scripts em atributos onclick, onerror, etc
      const elementsWithEvents = doc.querySelectorAll('[onclick], [onerror], [onload], [onmouseover]');
      for (const elem of elementsWithEvents) {
        for (const attr of ['onclick', 'onerror', 'onload', 'onmouseover']) {
          const code = elem.getAttribute(attr);
          if (code) {
            scripts.push({
              type: 'event-handler',
              url: url,
              content: code,
              depth: depth,
              size: code.length,
              attribute: attr,
              foundAt: new Date().toISOString()
            });
          }
        }
      }

      // Buscar JavaScript em URLs (javascript:)
      const jsLinks = doc.querySelectorAll('a[href^="javascript:"]');
      for (const link of jsLinks) {
        const code = link.getAttribute('href').substring(11); // Remove 'javascript:'
        scripts.push({
          type: 'javascript-url',
          url: url,
          content: decodeURIComponent(code),
          depth: depth,
          size: code.length,
          foundAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error(`❌ Erro ao extrair scripts de ${url}:`, error.message);
      if (error.stack) {
        console.debug('Stack trace:', error.stack);
      }
    }

    return scripts;
  }

  // Buscar e analisar source maps
  async fetchSourceMap(scriptUrl, sourceMapPath, scripts, depth) {
    try {
      const sourceMapUrl = this.resolveUrl(sourceMapPath, scriptUrl);
      const response = await fetch(sourceMapUrl);
      const sourceMap = await response.json();

      // Source maps contain original code
      if (sourceMap.sourcesContent) {
        for (let i = 0; i < sourceMap.sourcesContent.length; i++) {
          const content = sourceMap.sourcesContent[i];
          if (content) {
            scripts.push({
              type: 'sourcemap',
              url: sourceMapUrl,
              originalFile: sourceMap.sources[i],
              content: content,
              depth: depth,
              size: content.length,
              foundAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      // Silenciosamente ignorar erros ao buscar source maps
      // Source maps usually cause CORS errors and are not critical
      if (!error.message.includes('CORS') &&
          !error.message.includes('Failed to fetch') &&
          !error.message.includes('NetworkError') &&
          !error.message.includes('JSON')) {
        console.warn(`⚠️ Erro ao buscar source map: ${sourceMapPath}`, error.message);
      }
    }
  }

  // Extract links from a page
  async extractLinks(url) {
    const links = [];

    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const anchors = doc.querySelectorAll('a[href]');
      for (const anchor of anchors) {
        const href = anchor.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          const absoluteUrl = this.resolveUrl(href, url);
          links.push(absoluteUrl);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao extrair links de ${url}`, error.message);
    }

    return links;
  }

  // Resolver URL relativa para absoluta
  resolveUrl(relativeUrl, baseUrl) {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return relativeUrl;
    }
  }

  // Check if it's the same domain
  isSameDomain(url1, url2) {
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      return domain1 === domain2;
    } catch {
      return false;
    }
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obter estatísticas do crawler
  getStats() {
    return {
      pagesVisited: this.visitedUrls.size,
      scriptsFound: this.foundScripts.size,
      queueSize: this.queue.length
    };
  }
}

// Exportar para uso global (compatível com extensões Chrome)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeepCrawler;
}

// Disponibilizar globalmente também
if (typeof window !== 'undefined') {
  window.DeepCrawler = DeepCrawler;
}

// Exportar como módulo ES6
export default DeepCrawler;
export { DeepCrawler };
