interface PageSpeedResult {
  lighthouseResult: {
    audits: {
      'largest-contentful-paint': { numericValue: number }
      'cumulative-layout-shift': { numericValue: number }
      'interaction-to-next-paint': { numericValue: number }
      'server-response-time': { numericValue: number }
      'total-byte-weight': { numericValue: number }
    }
    categories: {
      performance: { score: number }
      seo: { score: number }
    }
  }
  loadingExperience?: {
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile: number }
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentile: number }
      INTERACTION_TO_NEXT_PAINT?: { percentile: number }
    }
  }
}

export interface PageSpeedMetrics {
  lcp: number
  cls: number
  inp: number
  ttfb: number
  pageSize: number
  performanceScore: number
  seoScore: number
}

export class PageSpeedClient {
  private apiKey: string
  private baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzeUrl(url: string, strategy: 'mobile' | 'desktop'): Promise<PageSpeedMetrics> {
    // Mock implementation for demo purposes
    // In production, enable PageSpeed Insights API in Google Cloud Console
    console.log(`Analyzing ${url} for ${strategy}...`)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return mock data based on strategy
    const baseScore = strategy === 'mobile' ? 75 : 85
    const variation = Math.floor(Math.random() * 20) - 10
    
    return {
      lcp: strategy === 'mobile' ? 2800 + Math.random() * 1000 : 2200 + Math.random() * 800,
      cls: Math.random() * 0.15,
      inp: 150 + Math.random() * 100,
      ttfb: 400 + Math.random() * 300,
      pageSize: 1500 + Math.floor(Math.random() * 2000),
      performanceScore: Math.max(0, Math.min(100, baseScore + variation)),
      seoScore: Math.max(0, Math.min(100, 80 + Math.floor(Math.random() * 20))),
    }
  }

  private extractMetrics(data: PageSpeedResult): PageSpeedMetrics {
    const audits = data.lighthouseResult.audits
    const categories = data.lighthouseResult.categories
    const crux = data.loadingExperience?.metrics

    return {
      lcp: crux?.LARGEST_CONTENTFUL_PAINT_MS?.percentile || audits['largest-contentful-paint']?.numericValue || 0,
      cls: crux?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile || audits['cumulative-layout-shift']?.numericValue || 0,
      inp: crux?.INTERACTION_TO_NEXT_PAINT?.percentile || audits['interaction-to-next-paint']?.numericValue || 0,
      ttfb: audits['server-response-time']?.numericValue || 0,
      pageSize: Math.round((audits['total-byte-weight']?.numericValue || 0) / 1024),
      performanceScore: Math.round((categories.performance?.score || 0) * 100),
      seoScore: Math.round((categories.seo?.score || 0) * 100),
    }
  }

  async analyzeBoth(url: string): Promise<{ mobile: PageSpeedMetrics; desktop: PageSpeedMetrics }> {
    const [mobile, desktop] = await Promise.all([
      this.analyzeUrl(url, 'mobile'),
      this.analyzeUrl(url, 'desktop'),
    ])

    return { mobile, desktop }
  }
}