export type AdvancedSample = {
  url: string
  viewport: 'mobile' | 'desktop'
  timings: {
    dns_ms?: number
    connect_ms?: number
    tls_ms?: number
    ttfb_ms?: number
    response_ms?: number
    mainThread_ms?: number
    longTasks_count?: number
    longTasks_total_ms?: number
    serverTiming?: { name: string; dur_ms?: number; desc?: string }[]
  }
  resources: {
    requests_total: number
    bytes: { js: number; css: number; img: number; font: number; html: number; other: number }
  }
  cacheCdn: {
    cdn?: {
      vendor?: 'Cloudflare' | 'Akamai' | 'Fastly' | 'CloudFront' | 'AzureFD' | 'GoogleCDN' | 'Other'
      evidence: string[]
    }
    compressionCoverage_pct?: number
    cacheable_pct?: number
    headersSample?: {
      url: string
      contentType?: string
      encoding?: string
      cacheControl?: string
      vary?: string
    }[]
  }
  images: {
    total: number
    webp_pct: number
    avif_pct: number
    jpg_png_pct: number
    lazy_pct: number
    wrongDims_count: number
    heroPreloaded: boolean
    lcpUrl?: string
  }
  thirdParties: {
    total_requests: number
    total_bytes: number
    byDomain: {
      domain: string
      bytes: number
      blocking: boolean
      category: 'chat' | 'analytics' | 'ads' | 'tag_manager' | 'social' | 'widget' | 'unknown'
    }[]
  }
  fonts: {
    total: number
    withFontDisplay_pct: number
    preloaded_count: number
    subset_hint: boolean
  }
  pwa: {
    manifest: boolean
    serviceWorker: boolean
    offlineBasic: boolean
    a2hsReady: boolean
  }
  a11y: {
    issues_total: number
    byCategory: {
      contrast?: number
      alt?: number
      labels?: number
      focus?: number
      keyboard?: number
    }
  }
  seo: {
    indexable: boolean
    canonical: boolean
    og: boolean
    twitter: boolean
    schema: string[]
    hreflangPairs_ok: boolean
  }
}

export type AdvancedScores = {
  perfNet: number
  resources: number
  cacheCdn: number
  images: number
  thirdParties: number
  fonts: number
  pwa: number
  a11y: number
  seo: number
}

export interface AdvancedAuditResult {
  sample: AdvancedSample
  scores: AdvancedScores
  executiveBullets: string[]
  overallScore: number
  reportId: string
}