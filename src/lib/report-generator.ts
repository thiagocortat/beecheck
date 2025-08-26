import { MetricsData, calculateOverallScore, getScoreEmoji, getScoreColor } from './scoring'

export interface QuickWin {
  title: string
  description: string
  impact: string
  priority: 'high' | 'medium' | 'low'
}

export interface ExecutiveReport {
  score: number
  color: 'green' | 'yellow' | 'red'
  emoji: string
  quickWins: QuickWin[]
  businessImpact: string
  mobileVsDesktop: string
}

export function generateExecutiveReport(data: MetricsData, url: string): ExecutiveReport {
  const score = calculateOverallScore(data)
  const color = getScoreColor(score)
  const emoji = getScoreEmoji(score)
  
  const quickWins = generateQuickWins(data)
  const businessImpact = generateBusinessImpact(score, data)
  const mobileVsDesktop = generateMobileVsDesktopComparison(data)
  
  return {
    score,
    color,
    emoji,
    quickWins,
    businessImpact,
    mobileVsDesktop,
  }
}

function generateQuickWins(data: MetricsData): QuickWin[] {
  const wins: QuickWin[] = []
  
  // Imagens pesadas
  if (data.mobile.pageSize > 2000 || data.desktop.pageSize > 3000) {
    wins.push({
      title: 'Comprimir fotos do site',
      description: 'Suas imagens estão muito pesadas, fazendo o site carregar devagar',
      impact: 'Páginas abrem 2× mais rápido no celular; mais hóspedes concluem a reserva',
      priority: 'high'
    })
  }
  
  // LCP ruim
  if (data.mobile.lcp > 2500) {
    wins.push({
      title: 'Acelerar carregamento do conteúdo principal',
      description: 'O conteúdo mais importante demora muito para aparecer na tela',
      impact: 'Visitantes veem suas ofertas 3 segundos mais rápido; reduz abandono em 25%',
      priority: 'high'
    })
  }
  
  // CLS alto
  if (data.mobile.cls > 0.1) {
    wins.push({
      title: 'Corrigir elementos que "pulam" na tela',
      description: 'Textos e botões se movem enquanto a página carrega, confundindo visitantes',
      impact: 'Experiência mais profissional; menos cliques acidentais no botão errado',
      priority: 'medium'
    })
  }
  
  // TTFB alto
  if (data.mobile.ttfb > 600) {
    wins.push({
      title: 'Melhorar velocidade do servidor',
      description: 'Seu servidor demora para responder quando alguém acessa o site',
      impact: 'Site começa a carregar instantaneamente; primeira impressão muito melhor',
      priority: 'high'
    })
  }
  
  // SEO básico
  if (!data.seo.hasTitle || !data.seo.hasDescription) {
    wins.push({
      title: 'Melhorar título e descrição para Google',
      description: 'Seu site não aparece bem nos resultados de busca do Google',
      impact: 'Mais pessoas encontram seu hotel quando pesquisam hospedagem na região',
      priority: 'medium'
    })
  }
  
  // HTTPS
  if (!data.seo.hasHttps) {
    wins.push({
      title: 'Ativar certificado de segurança (HTTPS)',
      description: 'Navegadores mostram "site não seguro" para seus visitantes',
      impact: 'Transmite confiança; essencial para pagamentos online',
      priority: 'high'
    })
  }
  
  // CTA de reserva
  if (!data.seo.hasBookingCta) {
    wins.push({
      title: 'Destacar botão "Reservar" na página inicial',
      description: 'Visitantes não encontram facilmente como fazer uma reserva',
      impact: 'Conversão direta: mais reservas com o mesmo número de visitantes',
      priority: 'high'
    })
  }
  
  // Schema markup
  if (!data.seo.hasSchema) {
    wins.push({
      title: 'Configurar dados estruturados do hotel',
      description: 'Google não consegue identificar informações como preços e avaliações',
      impact: 'Aparece nos resultados com estrelas, preços e fotos; mais cliques',
      priority: 'medium'
    })
  }
  
  return wins.slice(0, 5).sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

function generateBusinessImpact(score: number, data: MetricsData): string {
  if (score >= 80) {
    return 'Seu site está bem otimizado! Pequenos ajustes podem aumentar ainda mais as conversões e melhorar o posicionamento no Google.'
  }
  
  if (score >= 50) {
    return 'Há oportunidades claras de melhoria. Corrigindo os pontos principais, você pode aumentar as reservas em 15-30% e aparecer melhor no Google.'
  }
  
  return 'Seu site tem problemas que afastam hóspedes. Visitantes abandonam páginas lentas em 3 segundos. Melhorias urgentes podem dobrar suas conversões online.'
}

function generateMobileVsDesktopComparison(data: MetricsData): string {
  const mobileScore = (data.mobile.performanceScore + calculateCoreWebVitalsScore(data.mobile)) / 2
  const desktopScore = (data.desktop.performanceScore + calculateCoreWebVitalsScore(data.desktop)) / 2
  
  if (mobileScore < desktopScore - 20) {
    return '📱 Atenção: Seu site funciona muito pior no celular que no computador. Como 70% das reservas vêm do mobile, isso está custando vendas.'
  }
  
  if (mobileScore > desktopScore + 10) {
    return '📱 Ótimo: Seu site funciona melhor no celular, onde acontecem a maioria das reservas. Continue focando na experiência mobile.'
  }
  
  return '📱 Seu site tem performance similar no celular e computador. Foque em melhorar ambos, priorizando mobile (70% das reservas).'
}

function calculateCoreWebVitalsScore(metrics: any): number {
  // Simplified calculation for comparison
  const lcpScore = metrics.lcp <= 2500 ? 100 : Math.max(0, 100 - ((metrics.lcp - 2500) / 1500) * 50)
  const clsScore = metrics.cls <= 0.1 ? 100 : Math.max(0, 100 - ((metrics.cls - 0.1) / 0.15) * 50)
  const inpScore = metrics.inp <= 200 ? 100 : Math.max(0, 100 - ((metrics.inp - 200) / 300) * 50)
  
  return (lcpScore + clsScore + inpScore) / 3
}

export function generateTechnicalReport(data: MetricsData): string {
  return `
## Métricas Técnicas Detalhadas

### Core Web Vitals
**Mobile:**
- LCP (Largest Contentful Paint): ${data.mobile.lcp}ms
- CLS (Cumulative Layout Shift): ${data.mobile.cls}
- INP (Interaction to Next Paint): ${data.mobile.inp}ms

**Desktop:**
- LCP: ${data.desktop.lcp}ms
- CLS: ${data.desktop.cls}
- INP: ${data.desktop.inp}ms

### Performance
**Mobile:**
- TTFB: ${data.mobile.ttfb}ms
- Tamanho da página: ${data.mobile.pageSize}KB
- Score Lighthouse: ${data.mobile.performanceScore}/100

**Desktop:**
- TTFB: ${data.desktop.ttfb}ms
- Tamanho da página: ${data.desktop.pageSize}KB
- Score Lighthouse: ${data.desktop.performanceScore}/100

### SEO
- Título otimizado: ${data.seo.hasTitle ? '✅' : '❌'}
- Meta descrição: ${data.seo.hasDescription ? '✅' : '❌'}
- H1 único: ${data.seo.hasH1 ? '✅' : '❌'}
- HTTPS: ${data.seo.hasHttps ? '✅' : '❌'}
- Sitemap: ${data.seo.hasSitemap ? '✅' : '❌'}
- Robots.txt: ${data.seo.hasRobots ? '✅' : '❌'}
- URL canônica: ${data.seo.hasCanonical ? '✅' : '❌'}
- Schema.org: ${data.seo.hasSchema ? '✅' : '❌'}
- CTA de reserva: ${data.seo.hasBookingCta ? '✅' : '❌'}

### Referências
- [Core Web Vitals - Google](https://web.dev/vitals/)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org Hotel](https://schema.org/Hotel)
  `
}