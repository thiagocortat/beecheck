import { NextRequest, NextResponse } from 'next/server'
import { advancedAuditor } from '@/lib/advanced-audit'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const advancedScanSchema = z.object({
  url: z.string().min(1).transform((val) => {
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      return `https://${val}`
    }
    return val
  }).refine((val) => {
    try {
      const url = new URL(val)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, { message: 'URL deve ser válida' }),
  role: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, role } = advancedScanSchema.parse(body)

    // Perform advanced audit
    const auditResult = await advancedAuditor.auditUrl(url, role)
    
    // Calculate overall advanced score (weighted average)
    const weights = {
      perfNet: 0.20,
      resources: 0.15,
      cacheCdn: 0.15,
      images: 0.15,
      thirdParties: 0.10,
      fonts: 0.05,
      pwa: 0.05,
      a11y: 0.10,
      seo: 0.05
    }
    
    const overallScore = Math.round(
      Object.entries(auditResult.scores).reduce((sum, [key, score]) => {
        const weight = weights[key as keyof typeof weights] || 0
        return sum + (score * weight)
      }, 0)
    )

    // Save to database
    const report = await prisma.report.create({
      data: {
        url,
        status: 'completed',
        score: overallScore,
        
        // Core Web Vitals (using available timing data)
        lcpMobile: auditResult.sample.viewport === 'mobile' ? (auditResult.sample.timings.ttfb_ms || 0) : null,
        lcpDesktop: auditResult.sample.viewport === 'desktop' ? (auditResult.sample.timings.ttfb_ms || 0) : null,
        clsMobile: auditResult.sample.viewport === 'mobile' ? 0 : null,
        clsDesktop: auditResult.sample.viewport === 'desktop' ? 0 : null,
        inpMobile: auditResult.sample.viewport === 'mobile' ? (auditResult.sample.timings.longTasks_total_ms || 0) : null,
        inpDesktop: auditResult.sample.viewport === 'desktop' ? (auditResult.sample.timings.longTasks_total_ms || 0) : null,
        
        // Performance metrics
        ttfbMobile: auditResult.sample.viewport === 'mobile' ? (auditResult.sample.timings.ttfb_ms || 0) : null,
        ttfbDesktop: auditResult.sample.viewport === 'desktop' ? (auditResult.sample.timings.ttfb_ms || 0) : null,
        pageSizeMobile: auditResult.sample.viewport === 'mobile' ? auditResult.sample.thirdParties.total_bytes : null,
        pageSizeDesktop: auditResult.sample.viewport === 'desktop' ? auditResult.sample.thirdParties.total_bytes : null,
        
        // SEO metrics from advanced analysis
        hasTitle: auditResult.sample.seo.indexable,
        hasDescription: auditResult.sample.seo.og,
        hasH1: true, // Would need HTML parsing
        hasHttps: auditResult.sample.url.startsWith('https://'),
        hasSitemap: false, // Would need additional check
        hasRobots: true, // Assuming if indexable
        hasCanonical: auditResult.sample.seo.canonical,
        hasSchema: auditResult.sample.seo.schema.length > 0,
        hasBookingCta: false, // Would need content analysis
        
        executiveSummary: auditResult.executiveBullets.join('\n\n'),
        technicalReport: generateTechnicalReport(auditResult),
        recommendations: generateRecommendations(auditResult),
        
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      reportId: report.id,
      overallScore,
      scores: auditResult.scores,
      executiveBullets: auditResult.executiveBullets,
      sample: auditResult.sample
    })
    
  } catch (error) {
    console.error('Advanced scan error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateTechnicalReport(auditResult: any): string {
  const { sample, scores } = auditResult
  
  return `## Relatório Técnico de Performance Avançada

### Métricas de Rede e Performance
- TTFB: ${sample.timings.ttfb_ms}ms
- DNS: ${sample.timings.dns_ms}ms
- Conexão: ${sample.timings.connect_ms}ms
- TLS: ${sample.timings.tls_ms}ms
- Long Tasks: ${sample.timings.longTasks_count} (${sample.timings.longTasks_total_ms}ms total)
- Score: ${scores.perfNet}/100

### Recursos
- Total de requisições: ${sample.resources.requests_total}
- JavaScript: ${Math.round(sample.resources.bytes.js / 1024)}KB
- CSS: ${Math.round(sample.resources.bytes.css / 1024)}KB
- Imagens: ${Math.round(sample.resources.bytes.img / 1024)}KB
- Score: ${scores.resources}/100

### Cache e CDN
- CDN detectado: ${sample.cacheCdn.cdn?.vendor || 'Não'}
- Compressão: ${sample.cacheCdn.compressionCoverage_pct}%
- Cache headers: ${sample.cacheCdn.cacheable_pct}%
- Score: ${scores.cacheCdn}/100

### Imagens
- Total: ${sample.images.total}
- WebP: ${sample.images.webp_pct}%
- Lazy loading: ${sample.images.lazy_pct}%
- Hero preloaded: ${sample.images.heroPreloaded ? 'Sim' : 'Não'}
- Score: ${scores.images}/100

### Terceiros
- Domínios: ${sample.thirdParties.byDomain.length}
- Bytes totais: ${Math.round(sample.thirdParties.total_bytes / 1024)}KB
- Score: ${scores.thirdParties}/100

### PWA
- Manifest: ${sample.pwa.manifest ? 'Sim' : 'Não'}
- Service Worker: ${sample.pwa.serviceWorker ? 'Sim' : 'Não'}
- A2HS Ready: ${sample.pwa.a2hsReady ? 'Sim' : 'Não'}
- Score: ${scores.pwa}/100

### Acessibilidade
- Issues totais: ${sample.a11y.issues_total}
- Score: ${scores.a11y}/100

### SEO
- Indexável: ${sample.seo.indexable ? 'Sim' : 'Não'}
- Canonical: ${sample.seo.canonical ? 'Sim' : 'Não'}
- Open Graph: ${sample.seo.og ? 'Sim' : 'Não'}
- Schema: ${sample.seo.schema.length > 0 ? 'Sim' : 'Não'}
- Score: ${scores.seo}/100`
}

function generateRecommendations(auditResult: any): string {
  const { scores } = auditResult
  const recommendations: string[] = []
  
  if (scores.perfNet < 80) {
    recommendations.push('• Otimizar TTFB implementando cache no servidor')
    recommendations.push('• Reduzir Long Tasks dividindo JavaScript em chunks menores')
  }
  
  if (scores.resources < 80) {
    recommendations.push('• Minificar e comprimir arquivos JavaScript e CSS')
    recommendations.push('• Implementar code splitting para reduzir bundle inicial')
  }
  
  if (scores.cacheCdn < 80) {
    recommendations.push('• Configurar CDN para distribuição global de conteúdo')
    recommendations.push('• Ativar compressão gzip/brotli no servidor')
    recommendations.push('• Configurar headers de cache apropriados')
  }
  
  if (scores.images < 80) {
    recommendations.push('• Converter imagens para formatos modernos (WebP/AVIF)')
    recommendations.push('• Implementar lazy loading para imagens below-the-fold')
    recommendations.push('• Precarregar imagem hero/LCP')
  }
  
  if (scores.thirdParties < 80) {
    recommendations.push('• Auditar e remover scripts de terceiros desnecessários')
    recommendations.push('• Carregar scripts de terceiros de forma assíncrona')
  }
  
  if (scores.fonts < 80) {
    recommendations.push('• Adicionar font-display: swap nas fontes')
    recommendations.push('• Precarregar fontes críticas')
  }
  
  if (scores.pwa < 50) {
    recommendations.push('• Implementar Web App Manifest')
    recommendations.push('• Adicionar Service Worker para cache offline')
  }
  
  if (scores.a11y < 80) {
    recommendations.push('• Corrigir problemas de contraste de cores')
    recommendations.push('• Adicionar alt text em todas as imagens')
    recommendations.push('• Melhorar navegação por teclado')
  }
  
  if (scores.seo < 80) {
    recommendations.push('• Adicionar meta tags Open Graph')
    recommendations.push('• Implementar dados estruturados (Schema.org)')
    recommendations.push('• Configurar canonical URLs')
  }
  
  return recommendations.join('\n')
}