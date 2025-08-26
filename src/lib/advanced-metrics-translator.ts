import { AdvancedSample, AdvancedScores } from '@/types/advanced'

export interface MetricTranslation {
  title: string
  description: string
  impact: string
  recommendation: string
  priority: 'high' | 'medium' | 'low'
}

export interface TranslatedMetrics {
  performance: MetricTranslation[]
  resources: MetricTranslation[]
  caching: MetricTranslation[]
  images: MetricTranslation[]
  thirdParties: MetricTranslation[]
  fonts: MetricTranslation[]
  pwa: MetricTranslation[]
  accessibility: MetricTranslation[]
  seo: MetricTranslation[]
}

export class AdvancedMetricsTranslator {
  static translateMetrics(sample: AdvancedSample, scores: AdvancedScores): TranslatedMetrics {
    return {
      performance: this.translatePerformance(sample, scores),
      resources: this.translateResources(sample, scores),
      caching: this.translateCaching(sample, scores),
      images: this.translateImages(sample, scores),
      thirdParties: this.translateThirdParties(sample, scores),
      fonts: this.translateFonts(sample, scores),
      pwa: this.translatePwa(sample, scores),
      accessibility: this.translateAccessibility(sample, scores),
      seo: this.translateSeo(sample, scores)
    }
  }

  private static translatePerformance(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const ttfb = sample.timings.ttfb_ms || 0
    const longTasks = sample.timings.longTasks_total_ms || 0

    if (ttfb > 400) {
      translations.push({
        title: 'Tempo de Resposta do Servidor',
        description: `O servidor demora ${ttfb}ms para começar a enviar a página`,
        impact: ttfb > 800 ? 'Alto impacto na experiência do usuário' : 'Impacto moderado na velocidade',
        recommendation: 'Ativar cache no servidor, usar CDN ou otimizar banco de dados',
        priority: ttfb > 800 ? 'high' : 'medium'
      })
    }

    if (longTasks > 200) {
      translations.push({
        title: 'Tarefas Longas no JavaScript',
        description: `Scripts bloqueiam a página por ${longTasks}ms`,
        impact: 'Página trava durante o carregamento, usuário não consegue interagir',
        recommendation: 'Dividir scripts grandes em partes menores ou carregar de forma assíncrona',
        priority: longTasks > 500 ? 'high' : 'medium'
      })
    }

    return translations
  }

  private static translateResources(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const totalBytes = Object.values(sample.resources.bytes).reduce((sum: number, bytes: any) => sum + bytes, 0)
    const totalMB = (totalBytes / 1024 / 1024).toFixed(1)
    const requests = sample.resources.requests_total

    if (totalBytes > 1500000) {
      translations.push({
        title: 'Tamanho Total da Página',
        description: `A página carrega ${totalMB}MB de conteúdo`,
        impact: totalBytes > 3000000 ? 'Muito lenta em conexões móveis' : 'Lenta em conexões 3G/4G',
        recommendation: 'Comprimir imagens, minificar CSS/JS e remover recursos desnecessários',
        priority: totalBytes > 3000000 ? 'high' : 'medium'
      })
    }

    if (requests > 50) {
      translations.push({
        title: 'Número de Requisições',
        description: `A página faz ${requests} requisições para carregar`,
        impact: 'Cada requisição adiciona latência, especialmente em conexões lentas',
        recommendation: 'Combinar arquivos CSS/JS, usar sprites para ícones e lazy loading',
        priority: requests > 100 ? 'high' : 'medium'
      })
    }

    // Análise por tipo de recurso
    const jsBytes = sample.resources.bytes.js || 0
    if (jsBytes > 500000) {
      translations.push({
        title: 'JavaScript Pesado',
        description: `${(jsBytes / 1024).toFixed(0)}KB de JavaScript`,
        impact: 'Scripts grandes demoram para baixar e processar',
        recommendation: 'Code splitting, tree shaking e carregamento sob demanda',
        priority: jsBytes > 1000000 ? 'high' : 'medium'
      })
    }

    return translations
  }

  private static translateCaching(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const compressionPct = sample.cacheCdn.compressionCoverage_pct || 0
    const cacheablePct = sample.cacheCdn.cacheable_pct || 0
    const hasCdn = sample.cacheCdn.cdn

    if (!hasCdn) {
      translations.push({
        title: 'CDN não detectado',
        description: 'Arquivos são servidos diretamente do servidor principal',
        impact: 'Usuários distantes do servidor têm carregamento mais lento',
        recommendation: 'Configurar CDN (Cloudflare, AWS CloudFront) para distribuir conteúdo globalmente',
        priority: 'medium'
      })
    }

    if (compressionPct < 80) {
      translations.push({
        title: 'Compressão Insuficiente',
        description: `Apenas ${compressionPct}% dos arquivos usam compressão`,
        impact: 'Arquivos maiores demoram mais para baixar',
        recommendation: 'Ativar compressão gzip/brotli no servidor para CSS, JS e HTML',
        priority: compressionPct < 50 ? 'high' : 'medium'
      })
    }

    if (cacheablePct < 70) {
      translations.push({
        title: 'Cache Mal Configurado',
        description: `${cacheablePct}% dos recursos podem ser cacheados`,
        impact: 'Usuários baixam os mesmos arquivos a cada visita',
        recommendation: 'Configurar headers Cache-Control para imagens, CSS e JS',
        priority: 'medium'
      })
    }

    return translations
  }

  private static translateImages(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const webpPct = sample.images.webp_pct || 0
    const lazyPct = sample.images.lazy_pct || 0
    const wrongDims = sample.images.wrongDims_count || 0
    const heroPreloaded = sample.images.heroPreloaded

    if (webpPct < 50) {
      translations.push({
        title: 'Formatos de Imagem Antigos',
        description: `${100 - webpPct}% das imagens usam JPG/PNG`,
        impact: 'Imagens maiores demoram mais para carregar',
        recommendation: 'Converter para WebP ou AVIF - reduz tamanho em 25-50%',
        priority: webpPct < 25 ? 'high' : 'medium'
      })
    }

    if (lazyPct < 70) {
      translations.push({
        title: 'Lazy Loading Ausente',
        description: `${100 - lazyPct}% das imagens carregam imediatamente`,
        impact: 'Página demora mais para aparecer por carregar imagens invisíveis',
        recommendation: 'Adicionar loading="lazy" em imagens fora da tela inicial',
        priority: 'medium'
      })
    }

    if (!heroPreloaded) {
      translations.push({
        title: 'Imagem Principal não Otimizada',
        description: 'A imagem mais importante não tem prioridade de carregamento',
        impact: 'Usuário vê espaço em branco por mais tempo',
        recommendation: 'Adicionar <link rel="preload"> para a imagem hero/LCP',
        priority: 'high'
      })
    }

    if (wrongDims > 5) {
      translations.push({
        title: 'Imagens com Dimensões Incorretas',
        description: `${wrongDims} imagens são redimensionadas pelo navegador`,
        impact: 'Desperdício de dados - baixa imagem grande para mostrar pequena',
        recommendation: 'Servir imagens no tamanho correto ou usar srcset responsivo',
        priority: 'medium'
      })
    }

    return translations
  }

  private static translateThirdParties(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const totalBytes = sample.thirdParties.total_bytes || 0
    const totalDomains = sample.thirdParties.byDomain.length
    const totalKB = (totalBytes / 1024).toFixed(0)

    if (totalBytes > 500000) {
      translations.push({
        title: 'Scripts de Terceiros Pesados',
        description: `${totalKB}KB de conteúdo externo (analytics, ads, chat)`,
        impact: 'Scripts externos podem atrasar o carregamento da página',
        recommendation: 'Revisar necessidade de cada script, carregar de forma assíncrona',
        priority: totalBytes > 1000000 ? 'high' : 'medium'
      })
    }

    if (totalDomains > 10) {
      translations.push({
        title: 'Muitos Domínios Externos',
        description: `Conecta com ${totalDomains} serviços diferentes`,
        impact: 'Cada conexão adiciona latência e pontos de falha',
        recommendation: 'Consolidar serviços similares e remover os desnecessários',
        priority: 'medium'
      })
    }

    // Análise por categoria
    const blockingDomains = sample.thirdParties.byDomain.filter(d => d.blocking)
    if (blockingDomains.length > 0) {
      translations.push({
        title: 'Scripts Bloqueantes',
        description: `${blockingDomains.length} scripts param o carregamento da página`,
        impact: 'Página fica em branco até scripts externos carregarem',
        recommendation: 'Mover scripts para async/defer ou carregar após o conteúdo principal',
        priority: 'high'
      })
    }

    return translations
  }

  private static translateFonts(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const fontDisplayPct = sample.fonts.withFontDisplay_pct || 0
    const preloadedCount = sample.fonts.preloaded_count || 0
    const hasSubset = sample.fonts.subset_hint
    const totalFonts = sample.fonts.total

    if (fontDisplayPct < 80) {
      translations.push({
        title: 'Font Display não Configurado',
        description: `${100 - fontDisplayPct}% das fontes podem causar texto invisível`,
        impact: 'Usuário vê página sem texto até fonte carregar (FOIT)',
        recommendation: 'Adicionar font-display: swap nas fontes CSS',
        priority: 'medium'
      })
    }

    if (preloadedCount === 0 && totalFonts > 0) {
      translations.push({
        title: 'Fontes não Precarregadas',
        description: 'Fontes importantes não têm prioridade de carregamento',
        impact: 'Texto aparece com fonte padrão e depois muda (layout shift)',
        recommendation: 'Precarregar fontes críticas com <link rel="preload">',
        priority: 'medium'
      })
    }

    if (!hasSubset && totalFonts > 0) {
      translations.push({
        title: 'Fontes Completas',
        description: 'Carregando caracteres desnecessários nas fontes',
        impact: 'Arquivos de fonte maiores que o necessário',
        recommendation: 'Usar subsets (latin, latin-ext) ou unicode-range',
        priority: 'low'
      })
    }

    return translations
  }

  private static translatePwa(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const hasManifest = sample.pwa.manifest
    const hasServiceWorker = sample.pwa.serviceWorker
    const hasOffline = sample.pwa.offlineBasic
    const isA2hsReady = sample.pwa.a2hsReady

    if (!hasManifest) {
      translations.push({
        title: 'Web App Manifest Ausente',
        description: 'Site não pode ser instalado como app',
        impact: 'Usuários não podem adicionar à tela inicial do celular',
        recommendation: 'Criar manifest.json com ícones e configurações do app',
        priority: 'low'
      })
    }

    if (!hasServiceWorker) {
      translations.push({
        title: 'Service Worker não Encontrado',
        description: 'Site não funciona offline',
        impact: 'Usuário vê erro quando perde conexão',
        recommendation: 'Implementar Service Worker para cache offline básico',
        priority: 'low'
      })
    }

    if (hasManifest && hasServiceWorker && !isA2hsReady) {
      translations.push({
        title: 'PWA Incompleto',
        description: 'Tem recursos PWA mas não está totalmente configurado',
        impact: 'Perde oportunidade de engajamento como app nativo',
        recommendation: 'Verificar critérios PWA: HTTPS, ícones, start_url',
        priority: 'low'
      })
    }

    return translations
  }

  private static translateAccessibility(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const totalIssues = sample.a11y.issues_total || 0
    const categories = sample.a11y.byCategory

    if (totalIssues > 5) {
      translations.push({
        title: 'Problemas de Acessibilidade',
        description: `${totalIssues} problemas encontrados que dificultam o uso`,
        impact: 'Pessoas com deficiência não conseguem usar o site adequadamente',
        recommendation: 'Corrigir problemas de contraste, alt text e navegação por teclado',
        priority: totalIssues > 20 ? 'high' : 'medium'
      })
    }

    if (categories.contrast && categories.contrast > 0) {
      translations.push({
        title: 'Contraste Insuficiente',
        description: `${categories.contrast} elementos com contraste baixo`,
        impact: 'Texto difícil de ler, especialmente para pessoas com baixa visão',
        recommendation: 'Usar cores com contraste mínimo 4.5:1 para texto normal',
        priority: 'medium'
      })
    }

    if (categories.alt && categories.alt > 0) {
      translations.push({
        title: 'Imagens sem Descrição',
        description: `${categories.alt} imagens sem texto alternativo`,
        impact: 'Leitores de tela não conseguem descrever as imagens',
        recommendation: 'Adicionar atributo alt descritivo em todas as imagens',
        priority: 'medium'
      })
    }

    return translations
  }

  private static translateSeo(sample: AdvancedSample, scores: AdvancedScores): MetricTranslation[] {
    const translations: MetricTranslation[] = []
    const isIndexable = sample.seo.indexable
    const hasCanonical = sample.seo.canonical
    const hasOg = sample.seo.og
    const hasTwitter = sample.seo.twitter
    const hasSchema = sample.seo.schema.length > 0

    if (!isIndexable) {
      translations.push({
        title: 'Página Bloqueada para Buscadores',
        description: 'Meta robots ou robots.txt impedem indexação',
        impact: 'Google e outros buscadores não vão mostrar esta página',
        recommendation: 'Remover noindex se a página deve aparecer no Google',
        priority: 'high'
      })
    }

    if (!hasCanonical) {
      translations.push({
        title: 'URL Canônica Ausente',
        description: 'Não especifica qual é a URL principal da página',
        impact: 'Pode haver conteúdo duplicado e diluição de ranking',
        recommendation: 'Adicionar <link rel="canonical"> apontando para URL principal',
        priority: 'medium'
      })
    }

    if (!hasOg) {
      translations.push({
        title: 'Open Graph não Configurado',
        description: 'Compartilhamentos no Facebook/WhatsApp ficam sem preview',
        impact: 'Links compartilhados têm aparência ruim nas redes sociais',
        recommendation: 'Adicionar meta tags og:title, og:description, og:image',
        priority: 'medium'
      })
    }

    if (!hasTwitter) {
      translations.push({
        title: 'Twitter Cards Ausentes',
        description: 'Compartilhamentos no Twitter ficam sem preview',
        impact: 'Links no Twitter têm aparência básica',
        recommendation: 'Adicionar meta tags twitter:card, twitter:title, twitter:description',
        priority: 'low'
      })
    }

    if (!hasSchema) {
      translations.push({
        title: 'Dados Estruturados Ausentes',
        description: 'Google não entende o tipo de conteúdo da página',
        impact: 'Perde oportunidade de rich snippets nos resultados de busca',
        recommendation: 'Adicionar JSON-LD com schema.org apropriado (Article, Product, etc)',
        priority: 'low'
      })
    }

    return translations
  }

  static getTopIssues(translations: TranslatedMetrics, limit: number = 5): MetricTranslation[] {
    const allTranslations: MetricTranslation[] = [
      ...translations.performance,
      ...translations.resources,
      ...translations.caching,
      ...translations.images,
      ...translations.thirdParties,
      ...translations.fonts,
      ...translations.pwa,
      ...translations.accessibility,
      ...translations.seo
    ]

    // Ordenar por prioridade: high > medium > low
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    
    return allTranslations
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, limit)
  }

  static generateExecutiveSummary(translations: TranslatedMetrics): string {
    const topIssues = this.getTopIssues(translations, 3)
    
    if (topIssues.length === 0) {
      return 'Parabéns! Sua página está bem otimizada e não foram encontrados problemas críticos de performance.'
    }

    const summary = topIssues.map((issue, index) => 
      `${index + 1}. **${issue.title}**: ${issue.description}. ${issue.impact}`
    ).join('\n\n')

    return `Os principais pontos de melhoria identificados são:\n\n${summary}`
  }
}

export const metricsTranslator = new AdvancedMetricsTranslator()