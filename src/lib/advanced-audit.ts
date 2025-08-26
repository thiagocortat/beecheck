import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'
import { AdvancedSample, AdvancedScores, AdvancedAuditResult } from '@/types/advanced'
import * as axe from 'axe-core'

export class AdvancedAuditor {
  private browser: Browser | null = null

  async initialize() {
    // Configure for serverless environments like Vercel
    const isProduction = process.env.NODE_ENV === 'production'
    
    // For chromium-min, we need to provide the brotli files location
    // In Vercel, we'll use a CDN-hosted version of the brotli files
    const brotliPath = isProduction 
      ? 'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar'
      : undefined
    
    this.browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        ...(isProduction ? ['--single-process'] : [])
      ],
      executablePath: await chromium.executablePath(brotliPath),
      headless: true
    })
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async auditUrl(url: string, role?: string): Promise<AdvancedAuditResult> {
    if (!this.browser) {
      await this.initialize()
    }

    const mobileResult = await this.auditViewport(url, 'mobile')
    const desktopResult = await this.auditViewport(url, 'desktop')

    // Combine results (prioritize mobile for scoring)
    const sample = mobileResult
    const scores = this.scoreAdvanced(sample)
    const executiveBullets = this.generateExecutiveBullets(sample, scores)

    // Calculate overall score as weighted average
    const overallScore = Math.round(
      (scores.perfNet * 0.25) +
      (scores.resources * 0.15) +
      (scores.cacheCdn * 0.1) +
      (scores.images * 0.15) +
      (scores.thirdParties * 0.1) +
      (scores.fonts * 0.05) +
      (scores.pwa * 0.05) +
      (scores.a11y * 0.1) +
      (scores.seo * 0.05)
    )

    return {
      sample,
      scores,
      executiveBullets,
      overallScore,
      reportId: '' // Will be set by the caller
    }
  }

  private async auditViewport(url: string, viewport: 'mobile' | 'desktop'): Promise<AdvancedSample> {
    const page = await this.browser!.newPage()
    
    await page.setViewport(viewport === 'mobile' 
      ? { width: 360, height: 780 }
      : { width: 1366, height: 768 })
    
    await page.setUserAgent(viewport === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Enable request interception for monitoring
    await page.setRequestInterception(false)
    
    const responses: any[] = []
    const serverTimings: any[] = []
    
    // Collect responses and headers
    page.on('response', (response: any) => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        size: response.headers()['content-length'] || 0
      })
      
      const serverTiming = response.headers()['server-timing']
      if (serverTiming) {
        serverTimings.push(this.parseServerTiming(serverTiming))
      }
    })

    // Navigate and collect performance data
    const startTime = Date.now()
    
    try {
      // Try networkidle2 first (more lenient - waits for 2 or fewer network connections)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 })
    } catch (error) {
      // Fallback to domcontentloaded if networkidle2 times out
      console.warn('NetworkIdle2 timeout, falling back to domcontentloaded:', error)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
      // Wait a bit more for resources to load
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    const endTime = Date.now()

    // Inject performance observer script
    const performanceData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const data: any = {
          navigation: {},
          resources: [],
          longTasks: [],
          lcp: null
        }

        // Navigation timing
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (nav) {
          data.navigation = {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            connect: nav.connectEnd - nav.connectStart,
            tls: nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
            ttfb: nav.responseStart - nav.requestStart,
            response: nav.responseEnd - nav.responseStart
          }
        }

        // Resource timing
        data.resources = performance.getEntriesByType('resource').map((entry: any) => ({
          name: entry.name,
          size: entry.transferSize || 0,
          type: entry.initiatorType
        }))

        // Long tasks
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            data.longTasks = list.getEntries().map((entry: any) => ({
              duration: entry.duration,
              startTime: entry.startTime
            }))
          })
          observer.observe({ entryTypes: ['longtask'] })
        }

        // LCP
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1] as any
              data.lcp = {
                value: lastEntry.startTime,
                url: lastEntry.url
              }
            }
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
        }

        setTimeout(() => resolve(data), 2000)
      })
    })

    // Get DOM content for analysis
    const html = await page.content()
    
    // Run accessibility audit with error handling
    let a11yResults = null
    try {
      // Add timeout to axe-core loading and execution
      await Promise.race([
        page.addScriptTag({ url: 'https://unpkg.com/axe-core@latest/axe.min.js' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Axe script timeout')), 5000))
      ])
      
      a11yResults = await Promise.race([
        page.evaluate(() => (window as any).axe.run()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Axe execution timeout')), 5000))
      ])
    } catch (error) {
      console.warn('Accessibility audit failed, skipping:', error)
      a11yResults = { violations: [] }
    }

    await page.close()

    return this.buildAdvancedSample(url, viewport, {
      performanceData,
      responses,
      serverTimings,
      html,
      a11yResults,
      totalTime: endTime - startTime
    })
  }

  private parseServerTiming(serverTiming: string): any[] {
    return serverTiming.split(',').map(timing => {
      const parts = timing.trim().split(';')
      const name = parts[0]
      let dur_ms: number | undefined
      let desc: string | undefined

      parts.slice(1).forEach(part => {
        const [key, value] = part.split('=')
        if (key.trim() === 'dur') {
          dur_ms = parseFloat(value)
        } else if (key.trim() === 'desc') {
          desc = value.replace(/"/g, '')
        }
      })

      return { name, dur_ms, desc }
    })
  }

  private buildAdvancedSample(url: string, viewport: 'mobile' | 'desktop', data: any): AdvancedSample {
    const { performanceData, responses, serverTimings, html, a11yResults } = data

    return {
      url,
      viewport,
      timings: {
        dns_ms: performanceData.navigation.dns,
        connect_ms: performanceData.navigation.connect,
        tls_ms: performanceData.navigation.tls,
        ttfb_ms: performanceData.navigation.ttfb,
        response_ms: performanceData.navigation.response,
        longTasks_count: performanceData.longTasks.length,
        longTasks_total_ms: performanceData.longTasks.reduce((sum: number, task: any) => sum + task.duration, 0),
        serverTiming: serverTimings.flat()
      },
      resources: this.analyzeResources(responses),
      cacheCdn: this.analyzeCacheCdn(responses),
      images: this.analyzeImages(html, responses, performanceData.lcp?.url),
      thirdParties: this.analyzeThirdParties(responses),
      fonts: this.analyzeFonts(html, responses),
      pwa: this.analyzePwa(html),
      a11y: this.analyzeA11y(a11yResults),
      seo: this.analyzeSeo(html)
    }
  }

  private analyzeResources(responses: any[]) {
    const bytes = { js: 0, css: 0, img: 0, font: 0, html: 0, other: 0 }
    
    responses.forEach(response => {
      const size = parseInt(response.size) || 0
      const contentType = response.headers['content-type'] || ''
      
      if (contentType.includes('javascript')) bytes.js += size
      else if (contentType.includes('css')) bytes.css += size
      else if (contentType.includes('image')) bytes.img += size
      else if (contentType.includes('font')) bytes.font += size
      else if (contentType.includes('html')) bytes.html += size
      else bytes.other += size
    })

    return {
      requests_total: responses.length,
      bytes
    }
  }

  private analyzeCacheCdn(responses: any[]) {
    const cdnEvidence: string[] = []
    let compressionCount = 0
    let cacheableCount = 0
    
    responses.forEach(response => {
      const headers = response.headers
      
      // CDN detection
      if (headers['cf-ray']) cdnEvidence.push('Cloudflare')
      if (headers['x-served-by']) cdnEvidence.push('Fastly')
      if (headers['x-amz-cf-id']) cdnEvidence.push('CloudFront')
      
      // Compression
      if (headers['content-encoding']) compressionCount++
      
      // Cache headers
      if (headers['cache-control'] || headers['expires']) cacheableCount++
    })

    const vendor = cdnEvidence.length > 0 ? cdnEvidence[0] as any : undefined
    
    return {
      cdn: vendor ? { vendor, evidence: [...new Set(cdnEvidence)] } : undefined,
      compressionCoverage_pct: Math.round((compressionCount / responses.length) * 100),
      cacheable_pct: Math.round((cacheableCount / responses.length) * 100),
      headersSample: responses.slice(0, 10).map(r => ({
        url: r.url,
        contentType: r.headers['content-type'],
        encoding: r.headers['content-encoding'],
        cacheControl: r.headers['cache-control'],
        vary: r.headers['vary']
      }))
    }
  }

  private analyzeImages(html: string, responses: any[], lcpUrl?: string) {
    const imgTags = html.match(/<img[^>]*>/gi) || []
    const total = imgTags.length
    
    let webpCount = 0
    let avifCount = 0
    let jpgPngCount = 0
    let lazyCount = 0
    let wrongDimsCount = 0
    
    imgTags.forEach(img => {
      if (img.includes('.webp')) webpCount++
      else if (img.includes('.avif')) avifCount++
      else if (img.includes('.jpg') || img.includes('.png')) jpgPngCount++
      
      if (img.includes('loading="lazy"')) lazyCount++
    })

    const heroPreloaded = html.includes('<link rel="preload"') && html.includes('as="image"')

    return {
      total,
      webp_pct: Math.round((webpCount / total) * 100) || 0,
      avif_pct: Math.round((avifCount / total) * 100) || 0,
      jpg_png_pct: Math.round((jpgPngCount / total) * 100) || 0,
      lazy_pct: Math.round((lazyCount / total) * 100) || 0,
      wrongDims_count: wrongDimsCount,
      heroPreloaded,
      lcpUrl
    }
  }

  private analyzeThirdParties(responses: any[]) {
    const thirdPartyDomains = new Map()
    let totalBytes = 0
    
    responses.forEach(response => {
      const url = new URL(response.url)
      const domain = url.hostname
      const size = parseInt(response.size) || 0
      
      if (!thirdPartyDomains.has(domain)) {
        thirdPartyDomains.set(domain, {
          domain,
          bytes: 0,
          blocking: false,
          category: this.categorizeThirdParty(domain)
        })
      }
      
      thirdPartyDomains.get(domain).bytes += size
      totalBytes += size
    })

    return {
      total_requests: responses.length,
      total_bytes: totalBytes,
      byDomain: Array.from(thirdPartyDomains.values())
    }
  }

  private categorizeThirdParty(domain: string): string {
    if (domain.includes('google-analytics') || domain.includes('gtag')) return 'analytics'
    if (domain.includes('facebook') || domain.includes('twitter')) return 'social'
    if (domain.includes('doubleclick') || domain.includes('adsystem')) return 'ads'
    if (domain.includes('gtm') || domain.includes('tagmanager')) return 'tag_manager'
    if (domain.includes('chat') || domain.includes('zendesk')) return 'chat'
    return 'unknown'
  }

  private analyzeFonts(html: string, responses: any[]) {
    const fontLinks = html.match(/<link[^>]*href[^>]*\.woff2?[^>]*>/gi) || []
    const fontFaces = html.match(/@font-face[^}]*}/gi) || []
    const total = fontLinks.length + fontFaces.length
    
    let withFontDisplayCount = 0
    let preloadedCount = 0
    
    fontFaces.forEach(fontFace => {
      if (fontFace.includes('font-display')) withFontDisplayCount++
    })
    
    fontLinks.forEach(link => {
      if (link.includes('rel="preload"')) preloadedCount++
    })

    return {
      total,
      withFontDisplay_pct: Math.round((withFontDisplayCount / total) * 100) || 0,
      preloaded_count: preloadedCount,
      subset_hint: html.includes('unicode-range')
    }
  }

  private analyzePwa(html: string) {
    const hasManifest = html.includes('rel="manifest"')
    const hasServiceWorker = html.includes('serviceWorker') || html.includes('sw.js')
    
    return {
      manifest: hasManifest,
      serviceWorker: hasServiceWorker,
      offlineBasic: hasServiceWorker, // Simplified check
      a2hsReady: hasManifest && hasServiceWorker
    }
  }

  private analyzeA11y(axeResults: any) {
    const violations = axeResults.violations || []
    const byCategory: any = {}
    
    violations.forEach((violation: any) => {
      violation.tags.forEach((tag: string) => {
        if (tag.includes('color-contrast')) {
          byCategory.contrast = (byCategory.contrast || 0) + violation.nodes.length
        } else if (tag.includes('alt')) {
          byCategory.alt = (byCategory.alt || 0) + violation.nodes.length
        } else if (tag.includes('label')) {
          byCategory.labels = (byCategory.labels || 0) + violation.nodes.length
        } else if (tag.includes('focus')) {
          byCategory.focus = (byCategory.focus || 0) + violation.nodes.length
        } else if (tag.includes('keyboard')) {
          byCategory.keyboard = (byCategory.keyboard || 0) + violation.nodes.length
        }
      })
    })

    return {
      issues_total: violations.reduce((sum: number, v: any) => sum + v.nodes.length, 0),
      byCategory
    }
  }

  private analyzeSeo(html: string) {
    return {
      indexable: !html.includes('noindex'),
      canonical: html.includes('rel="canonical"'),
      og: html.includes('property="og:'),
      twitter: html.includes('name="twitter:'),
      schema: (html.match(/application\/ld\+json/g) || []).length > 0 ? ['structured-data'] : [],
      hreflangPairs_ok: html.includes('hreflang')
    }
  }

  private scoreAdvanced(sample: AdvancedSample): AdvancedScores {
    return {
      perfNet: this.scorePerfNet(sample.timings),
      resources: this.scoreResources(sample.resources),
      cacheCdn: this.scoreCacheCdn(sample.cacheCdn),
      images: this.scoreImages(sample.images),
      thirdParties: this.scoreThirdParties(sample.thirdParties),
      fonts: this.scoreFonts(sample.fonts),
      pwa: this.scorePwa(sample.pwa),
      a11y: this.scoreA11y(sample.a11y),
      seo: this.scoreSeo(sample.seo)
    }
  }

  private scorePerfNet(timings: any): number {
    const ttfb = timings.ttfb_ms || 0
    const longTasks = timings.longTasks_total_ms || 0
    
    let score = 100
    if (ttfb > 800) score -= 30
    else if (ttfb > 400) score -= 15
    
    if (longTasks > 500) score -= 20
    else if (longTasks > 200) score -= 10
    
    return Math.max(0, score)
  }

  private scoreResources(resources: any): number {
    const totalBytes = Object.values(resources.bytes).reduce((sum: number, bytes: any) => sum + bytes, 0)
    const totalRequests = resources.requests_total
    
    let score = 100
    if (totalBytes > 3000000) score -= 40 // 3MB
    else if (totalBytes > 1500000) score -= 20 // 1.5MB
    
    if (totalRequests > 100) score -= 20
    else if (totalRequests > 50) score -= 10
    
    return Math.max(0, score)
  }

  private scoreCacheCdn(cacheCdn: any): number {
    let score = 100
    
    if (!cacheCdn.cdn) score -= 30
    if ((cacheCdn.compressionCoverage_pct || 0) < 80) score -= 25
    if ((cacheCdn.cacheable_pct || 0) < 70) score -= 25
    
    return Math.max(0, score)
  }

  private scoreImages(images: any): number {
    let score = 100
    
    if (images.webp_pct < 50) score -= 20
    if (images.lazy_pct < 70) score -= 15
    if (!images.heroPreloaded) score -= 15
    if (images.wrongDims_count > 5) score -= 20
    
    return Math.max(0, score)
  }

  private scoreThirdParties(thirdParties: any): number {
    let score = 100
    
    if (thirdParties.total_bytes > 500000) score -= 30 // 500KB
    if (thirdParties.byDomain.length > 10) score -= 20
    
    return Math.max(0, score)
  }

  private scoreFonts(fonts: any): number {
    let score = 100
    
    if (fonts.withFontDisplay_pct < 80) score -= 25
    if (fonts.preloaded_count === 0) score -= 20
    if (!fonts.subset_hint) score -= 15
    
    return Math.max(0, score)
  }

  private scorePwa(pwa: any): number {
    let score = 0
    
    if (pwa.manifest) score += 25
    if (pwa.serviceWorker) score += 35
    if (pwa.offlineBasic) score += 25
    if (pwa.a2hsReady) score += 15
    
    return score
  }

  private scoreA11y(a11y: any): number {
    let score = 100
    
    const totalIssues = a11y.issues_total || 0
    if (totalIssues > 20) score -= 50
    else if (totalIssues > 10) score -= 30
    else if (totalIssues > 5) score -= 15
    
    return Math.max(0, score)
  }

  private scoreSeo(seo: any): number {
    let score = 100
    
    if (!seo.indexable) score -= 30
    if (!seo.canonical) score -= 20
    if (!seo.og) score -= 15
    if (!seo.twitter) score -= 10
    if (seo.schema.length === 0) score -= 15
    
    return Math.max(0, score)
  }

  private generateExecutiveBullets(sample: AdvancedSample, scores: AdvancedScores): string[] {
    const bullets: string[] = []
    
    // Performance & Network
    if (scores.perfNet < 70) {
      const ttfb = sample.timings.ttfb_ms || 0
      bullets.push(`O servidor demora ${ttfb}ms para responder. Ativar cache/CDN reduz a espera no celular — menos desistências.`)
    }
    
    // Resources
    if (scores.resources < 70) {
      const totalBytes = Object.values(sample.resources.bytes).reduce((sum: number, bytes: any) => sum + bytes, 0)
      const totalMB = (totalBytes / 1024 / 1024).toFixed(1)
      bullets.push(`A página carrega ${totalMB}MB em ${sample.resources.requests_total} itens. Enxugar scripts e comprimir fotos agiliza o carregamento — mais pessoas concluem a reserva.`)
    }
    
    // Cache/CDN
    if (scores.cacheCdn < 70) {
      bullets.push(`Vários arquivos não usam compressão (br/gzip). Ligar compressão no servidor deixa tudo mais leve — abre mais rápido no 4G.`)
    }
    
    // Images
    if (scores.images < 70) {
      bullets.push(`Poucas fotos em WebP/AVIF. Trocar os formatos reduz o tamanho — página aparece antes.`)
    }
    
    // Third parties
    if (scores.thirdParties < 70) {
      bullets.push(`Muitos scripts de terceiros estão atrasando o carregamento. Revisar e remover os desnecessários melhora a velocidade.`)
    }
    
    return bullets.slice(0, 5) // Max 5 bullets
  }
}

export const advancedAuditor = new AdvancedAuditor()