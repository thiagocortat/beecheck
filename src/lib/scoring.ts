import { PageSpeedMetrics } from './pagespeed'

export interface ScoringWeights {
  coreWebVitals: number // 40%
  performance: number   // 40% 
  seo: number          // 20%
  mobileWeight: number // 70% mobile, 30% desktop
  desktopWeight: number
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  coreWebVitals: 0.4,
  performance: 0.4,
  seo: 0.2,
  mobileWeight: 0.7,
  desktopWeight: 0.3,
}

export interface SEOMetrics {
  hasTitle: boolean
  hasDescription: boolean
  hasH1: boolean
  hasHttps: boolean
  hasSitemap: boolean
  hasRobots: boolean
  hasCanonical: boolean
  hasSchema: boolean
  hasBookingCta: boolean
}

export interface MetricsData {
  mobile: PageSpeedMetrics
  desktop: PageSpeedMetrics
  seo: SEOMetrics
}

export function calculateCoreWebVitalsScore(metrics: PageSpeedMetrics): number {
  const lcpScore = getLCPScore(metrics.lcp)
  const clsScore = getCLSScore(metrics.cls)
  const inpScore = getINPScore(metrics.inp)
  
  return (lcpScore + clsScore + inpScore) / 3
}

export function getLCPScore(lcp: number): number {
  if (lcp <= 2500) return 100
  if (lcp <= 4000) return Math.max(0, 100 - ((lcp - 2500) / 1500) * 50)
  return 0
}

export function getCLSScore(cls: number): number {
  if (cls <= 0.1) return 100
  if (cls <= 0.25) return Math.max(0, 100 - ((cls - 0.1) / 0.15) * 50)
  return 0
}

export function getINPScore(inp: number): number {
  if (inp <= 200) return 100
  if (inp <= 500) return Math.max(0, 100 - ((inp - 200) / 300) * 50)
  return 0
}

export function calculatePerformanceScore(metrics: PageSpeedMetrics): number {
  const ttfbScore = getTTFBScore(metrics.ttfb)
  const pageSizeScore = getPageSizeScore(metrics.pageSize)
  const lighthouseScore = metrics.performanceScore
  
  return (ttfbScore + pageSizeScore + lighthouseScore) / 3
}

export function getTTFBScore(ttfb: number): number {
  if (ttfb <= 200) return 100
  if (ttfb <= 600) return Math.max(0, 100 - ((ttfb - 200) / 400) * 50)
  return Math.max(0, 50 - ((ttfb - 600) / 1000) * 50)
}

export function getPageSizeScore(pageSize: number): number {
  if (pageSize <= 1000) return 100
  if (pageSize <= 3000) return Math.max(0, 100 - ((pageSize - 1000) / 2000) * 50)
  return Math.max(0, 50 - ((pageSize - 3000) / 5000) * 50)
}

export function calculateSEOScore(seo: SEOMetrics): number {
  const checks = [
    seo.hasTitle,
    seo.hasDescription, 
    seo.hasH1,
    seo.hasHttps,
    seo.hasSitemap,
    seo.hasRobots,
    seo.hasCanonical,
    seo.hasSchema,
    seo.hasBookingCta,
  ]
  
  const passedChecks = checks.filter(Boolean).length
  return (passedChecks / checks.length) * 100
}

export function calculateOverallScore(
  data: MetricsData,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  const mobileCWV = calculateCoreWebVitalsScore(data.mobile)
  const desktopCWV = calculateCoreWebVitalsScore(data.desktop)
  const coreWebVitalsScore = (mobileCWV * weights.mobileWeight) + (desktopCWV * weights.desktopWeight)
  
  const mobilePerf = calculatePerformanceScore(data.mobile)
  const desktopPerf = calculatePerformanceScore(data.desktop)
  const performanceScore = (mobilePerf * weights.mobileWeight) + (desktopPerf * weights.desktopWeight)
  
  const seoScore = calculateSEOScore(data.seo)
  
  const overallScore = (
    (coreWebVitalsScore * weights.coreWebVitals) +
    (performanceScore * weights.performance) +
    (seoScore * weights.seo)
  )
  
  return Math.round(Math.max(0, Math.min(100, overallScore)))
}

export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

export function getScoreEmoji(score: number): string {
  if (score >= 80) return '🟢'
  if (score >= 50) return '🟡'
  return '🔴'
}