import { PageSpeedClient } from './pagespeed'
import { prisma } from './prisma'
import { generateExecutiveReport, generateTechnicalReport } from './report-generator'
import { calculateOverallScore } from './scoring'

interface AnalysisJobData {
  reportId: string
  url: string
  competitors?: string[]
}

const pageSpeedClient = new PageSpeedClient(process.env.PAGESPEED_API_KEY!)

export async function analyzeWebsite(data: AnalysisJobData) {
  const { reportId, url, competitors = [] } = data
  
  try {
    console.log(`Starting analysis for ${url} (Report ID: ${reportId})`)
    
    // Update status to processing
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'processing' }
    })
    
    // Analyze main URL
    const metrics = await pageSpeedClient.analyzeBoth(url)
    
    // Perform basic SEO checks
    const seoMetrics = await performSEOChecks(url)
    
    const metricsData = {
      mobile: metrics.mobile,
      desktop: metrics.desktop,
      seo: seoMetrics
    }
    
    // Calculate score
    const score = calculateOverallScore(metricsData)
    
    // Generate reports
    const executiveReport = generateExecutiveReport(metricsData, url)
    const technicalReport = generateTechnicalReport(metricsData)
    
    // Generate recommendations
    const recommendations = executiveReport.quickWins
      .map(win => `**${win.title}**: ${win.description} - ${win.impact}`)
      .join('\n\n')
    
    // Update report with results
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'completed',
        score,
        completedAt: new Date(),
        
        // Core Web Vitals
        lcpMobile: metrics.mobile.lcp,
        lcpDesktop: metrics.desktop.lcp,
        clsMobile: metrics.mobile.cls,
        clsDesktop: metrics.desktop.cls,
        inpMobile: metrics.mobile.inp,
        inpDesktop: metrics.desktop.inp,
        
        // Performance
        ttfbMobile: metrics.mobile.ttfb,
        ttfbDesktop: metrics.desktop.ttfb,
        pageSizeMobile: metrics.mobile.pageSize,
        pageSizeDesktop: metrics.desktop.pageSize,
        
        // SEO
        hasTitle: seoMetrics.hasTitle,
        hasDescription: seoMetrics.hasDescription,
        hasH1: seoMetrics.hasH1,
        hasHttps: seoMetrics.hasHttps,
        hasSitemap: seoMetrics.hasSitemap,
        hasRobots: seoMetrics.hasRobots,
        hasCanonical: seoMetrics.hasCanonical,
        hasSchema: seoMetrics.hasSchema,
        hasBookingCta: seoMetrics.hasBookingCta,
        
        // Generated content
        executiveSummary: JSON.stringify(executiveReport),
        technicalReport,
        recommendations,
      }
    })
    
    // Process competitors if provided
    if (competitors.length > 0) {
      await processCompetitors(reportId, competitors)
    }
    
    console.log(`Analysis completed for ${url} with score ${score}`)
    
  } catch (error) {
    console.error(`Analysis failed for ${url}:`, error)
    
    await prisma.report.update({
      where: { id: reportId },
      data: { 
        status: 'failed',
        technicalReport: `Erro na análise: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    })
    
    throw error
  }
}

async function performSEOChecks(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BeeCheck-Bot/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    const urlObj = new URL(url)
    
    return {
      hasTitle: /<title[^>]*>([^<]+)<\/title>/i.test(html),
      hasDescription: /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.test(html),
      hasH1: /<h1[^>]*>([^<]+)<\/h1>/i.test(html),
      hasHttps: urlObj.protocol === 'https:',
      hasSitemap: await checkSitemap(urlObj.origin),
      hasRobots: await checkRobots(urlObj.origin),
      hasCanonical: /<link[^>]*rel=["']canonical["']/i.test(html),
      hasSchema: /application\/ld\+json|schema\.org/i.test(html),
      hasBookingCta: /reserv|book|disponibilidade/i.test(html),
    }
  } catch (error) {
    console.error('SEO check failed:', error)
    return {
      hasTitle: false,
      hasDescription: false,
      hasH1: false,
      hasHttps: false,
      hasSitemap: false,
      hasRobots: false,
      hasCanonical: false,
      hasSchema: false,
      hasBookingCta: false,
    }
  }
}

async function checkSitemap(origin: string): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/sitemap.xml`)
    return response.ok
  } catch {
    return false
  }
}

async function checkRobots(origin: string): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/robots.txt`)
    return response.ok
  } catch {
    return false
  }
}

async function processCompetitors(reportId: string, competitors: string[]) {
  const competitorResults = await Promise.allSettled(
    competitors.map(async (url, index) => {
      try {
        const metrics = await pageSpeedClient.analyzeBoth(url)
        const seoMetrics = await performSEOChecks(url)
        
        const metricsData = {
          mobile: metrics.mobile,
          desktop: metrics.desktop,
          seo: seoMetrics
        }
        
        const score = calculateOverallScore(metricsData)
        
        return {
          url,
          score,
          rank: index + 2 // Main site is rank 1
        }
      } catch (error) {
        console.error(`Competitor analysis failed for ${url}:`, error)
        return {
          url,
          score: 0,
          rank: index + 2
        }
      }
    })
  )
  
  // Save competitor results
  const validResults = competitorResults
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value)
  
  if (validResults.length > 0) {
    await prisma.competitor.createMany({
      data: validResults.map(result => ({
        reportId,
        url: result.url,
        score: result.score,
        rank: result.rank
      }))
    })
  }
}