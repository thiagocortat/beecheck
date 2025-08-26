import { AdvancedSample } from '@/types/advanced'
import { HumanCard, HumanLabel } from '@/types/humanized'

interface ReportData {
  pages?: AdvancedSample[]
}

export function pickMobileFirst(reportData: ReportData): AdvancedSample | undefined {
  if (!reportData.pages || reportData.pages.length === 0) return undefined
  
  const mobileSample = reportData.pages.find((p: AdvancedSample) => p.viewport === 'mobile')
  if (mobileSample) return mobileSample
  
  return reportData.pages.find((p: AdvancedSample) => p.viewport === 'desktop')
}

export const fmt = {
  msToSec: (ms?: number): string => {
    if (ms === undefined || ms === null) return '—'
    return `${(ms / 1000).toFixed(1)}s`
  },
  
  bytesToMB: (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '—'
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
}

export const lbl = {
  byThreshold: (value: number | undefined, g: number, y: number): HumanLabel => {
    if (value === undefined || value === null) return '🟡'
    if (value <= g) return '🟢'
    if (value <= y) return '🟡'
    return '🔴'
  }
}

export function buildPerfNetCard(
  sample: AdvancedSample,
  lcpMs?: number,
  inpMs?: number
): HumanCard {
  const ttfb = sample.timings?.ttfb_ms
  const longTasks = sample.timings?.longTasks_total_ms
  
  // Determinar pior métrica para semáforo
  const lcpLabel = lbl.byThreshold(lcpMs, 2500, 4000)
  const inpLabel = lbl.byThreshold(inpMs, 200, 500)
  const ttfbLabel = lbl.byThreshold(ttfb, 800, 1800)
  
  const worstLabel = [lcpLabel, inpLabel, ttfbLabel].includes('🔴') ? '🔴' :
                    [lcpLabel, inpLabel, ttfbLabel].includes('🟡') ? '🟡' : '🟢'
  
  return {
    key: 'perfNet',
    title: 'Performance & Rede',
    label: worstLabel,
    lines: {
      what: 'Fila do check-in.',
      why: 'Se demora a aparecer, o hóspede desiste.',
      doNow: 'Ativar CDN e cache nas páginas/fotos mais acessadas.',
      detail: `Aparece em ${fmt.msToSec(lcpMs)} s, reage em ${inpMs || 0} ms, servidor inicia em ${ttfb || 0} ms.`
    },
    bars: [
      { name: 'LCP', value: lcpMs || 0, suffix: 'ms', max: 4000 },
      { name: 'INP', value: inpMs || 0, suffix: 'ms', max: 500 },
      { name: 'TTFB', value: ttfb || 0, suffix: 'ms', max: 1800 }
    ],
    chips: [
      { name: 'Tarefas Longas', value: longTasks ? `${Math.round(longTasks)}ms` : '—' }
    ]
  }
}

export function buildResourcesCard(sample: AdvancedSample): HumanCard {
  const totalRequests = sample.resources?.requests_total || 0
  const bytes = sample.resources?.bytes
  const totalBytes = bytes ? Object.values(bytes).reduce((a, b) => a + b, 0) : 0
  const totalMB = totalBytes / 1024 / 1024
  
  const label = (totalMB <= 2 && totalRequests <= 60) ? '🟢' :
                (totalMB <= 4 && totalRequests <= 120) ? '🟡' : '🔴'
  
  return {
    key: 'resources',
    title: 'Recursos',
    label,
    lines: {
      what: 'Quanta coisa a página carrega.',
      why: 'Menos bagagem, mais rapidez.',
      doNow: 'Cortar scripts que não ajudam a vender e comprimir fotos.'
    },
    bars: [
      { name: 'Tamanho Total', value: totalMB, suffix: 'MB', max: 5 },
      { name: 'Requisições', value: totalRequests, max: 150 }
    ],
    chips: [
      { name: 'JS', value: fmt.bytesToMB(bytes?.js) },
      { name: 'CSS', value: fmt.bytesToMB(bytes?.css) },
      { name: 'Imagens', value: fmt.bytesToMB(bytes?.img) }
    ]
  }
}

export function buildCacheCdnCard(sample: AdvancedSample): HumanCard {
  const hasCdn = !!sample.cacheCdn?.cdn?.vendor
  const compression = sample.cacheCdn?.compressionCoverage_pct || 0
  const cacheable = sample.cacheCdn?.cacheable_pct || 0
  
  const label = (hasCdn && compression >= 90 && cacheable >= 75) ? '🟢' :
                (!hasCdn || (compression >= 60 && compression < 90)) ? '🟡' : '🔴'
  
  return {
    key: 'cacheCdn',
    title: 'Cache & CDN',
    label,
    lines: {
      what: 'Estoque na recepção.',
      why: 'O essencial já à mão acelera tudo.',
      doNow: 'Ligar compressão (br/gzip) e definir cache estático.'
    },
    bars: [
      { name: 'Compressão', value: compression, suffix: '%', max: 100 },
      { name: 'Cache', value: cacheable, suffix: '%', max: 100 }
    ],
    chips: [
      { name: 'CDN', value: hasCdn ? sample.cacheCdn?.cdn?.vendor || 'Sim' : 'Não' }
    ]
  }
}

export function buildImagesCard(sample: AdvancedSample): HumanCard {
  const webpAvif = (sample.images?.webp_pct || 0) + (sample.images?.avif_pct || 0)
  const lazy = sample.images?.lazy_pct || 0
  const wrongDims = sample.images?.wrongDims_count || 0
  const heroPreloaded = sample.images?.heroPreloaded || false
  
  const label = (webpAvif >= 80 && lazy >= 70 && wrongDims === 0 && heroPreloaded) ? '🟢' :
                (webpAvif >= 50 && lazy >= 40) ? '🟡' : '🔴'
  
  return {
    key: 'images',
    title: 'Imagens',
    label,
    lines: {
      what: 'Álbum bonito e leve.',
      why: 'Fotos leves fazem a página aparecer antes.',
      doNow: 'Converter heróis para WebP/AVIF, ajustar tamanho e lazy.'
    },
    bars: [
      { name: 'Formatos Modernos', value: webpAvif, suffix: '%', max: 100 },
      { name: 'Lazy Loading', value: lazy, suffix: '%', max: 100 }
    ],
    chips: [
      { name: 'Dimensões Erradas', value: wrongDims.toString() },
      { name: 'Hero Preload', value: heroPreloaded ? 'Sim' : 'Não' }
    ]
  }
}

export function buildA11yCard(sample: AdvancedSample): HumanCard {
  const totalIssues = sample.a11y?.issues_total || 0
  const label = totalIssues === 0 ? '🟢' : totalIssues <= 5 ? '🟡' : '🔴'
  
  return {
    key: 'a11y',
    title: 'Acessibilidade',
    label,
    lines: {
      what: 'Rampa e sinalização.',
      why: 'Todos conseguem usar e reservar.',
      doNow: 'Corrigir contraste e descrever imagens (alt).'
    },
    bars: [
      { name: 'Problemas Encontrados', value: totalIssues, max: 20 }
    ],
    chips: [
      { name: 'Contraste', value: (sample.a11y?.byCategory?.contrast || 0).toString() },
      { name: 'Alt Text', value: (sample.a11y?.byCategory?.alt || 0).toString() }
    ]
  }
}

export function buildSeoCard(sample: AdvancedSample): HumanCard {
  const indexable = sample.seo?.indexable || false
  const canonical = sample.seo?.canonical || false
  const og = sample.seo?.og || false
  const twitter = sample.seo?.twitter || false
  const hasHotelSchema = sample.seo?.schema?.some(s => s.includes('Hotel') || s.includes('LodgingBusiness')) || false
  const hreflang = sample.seo?.hreflangPairs_ok || false
  
  const goodCount = [indexable, canonical, og, twitter, hasHotelSchema].filter(Boolean).length
  const label = goodCount >= 4 && (hreflang || !sample.seo?.hreflangPairs_ok) ? '🟢' :
                goodCount >= 2 ? '🟡' : '🔴'
  
  return {
    key: 'seo',
    title: 'SEO',
    label,
    lines: {
      what: 'Placas na estrada.',
      why: 'Sem placas, o viajante passa reto.',
      doNow: 'Revisar títulos/descrições e adicionar schema.org/Hotel.'
    },
    chips: [
      { name: 'Indexável', value: indexable ? 'Sim' : 'Não' },
      { name: 'Canonical', value: canonical ? 'Sim' : 'Não' },
      { name: 'Open Graph', value: og ? 'Sim' : 'Não' },
      { name: 'Schema Hotel', value: hasHotelSchema ? 'Sim' : 'Não' }
    ]
  }
}

export function buildPwaCard(sample: AdvancedSample): HumanCard {
  const manifest = sample.pwa?.manifest || false
  const serviceWorker = sample.pwa?.serviceWorker || false
  const a2hs = sample.pwa?.a2hsReady || false
  
  const label = (manifest && serviceWorker && a2hs) ? '🟢' :
                manifest ? '🟡' : '🔴'
  
  return {
    key: 'pwa',
    title: 'PWA',
    label,
    lines: {
      what: 'Atalho no celular.',
      why: 'Quem gostou volta mais rápido.',
      doNow: 'Manifesto + Service Worker simples.'
    },
    chips: [
      { name: 'Manifest', value: manifest ? 'Sim' : 'Não' },
      { name: 'Service Worker', value: serviceWorker ? 'Sim' : 'Não' },
      { name: 'Instalável', value: a2hs ? 'Sim' : 'Não' }
    ]
  }
}

export function buildThirdPartiesCard(sample: AdvancedSample): HumanCard {
  const totalBytes = sample.thirdParties?.total_bytes || 0
  const totalKB = totalBytes / 1024
  const blockingCount = sample.thirdParties?.byDomain?.filter(d => d.blocking).length || 0
  
  const label = (totalKB <= 150 && blockingCount === 0) ? '🟢' :
                (totalKB <= 600 && blockingCount <= 1) ? '🟡' : '🔴'
  
  return {
    key: 'thirdParties',
    title: 'Scripts Terceiros',
    label,
    lines: {
      what: 'Promotores no lobby.',
      why: 'Não podem bloquear a porta.',
      doNow: 'Carregar chat/pixels depois do conteúdo.'
    },
    bars: [
      { name: 'Tamanho Total', value: totalKB, suffix: 'KB', max: 800 },
      { name: 'Scripts Bloqueantes', value: blockingCount, max: 5 }
    ],
    chips: sample.thirdParties?.byDomain?.slice(0, 3).map(d => ({
      name: d.domain.split('.')[0],
      value: `${Math.round(d.bytes / 1024)}KB`
    })) || []
  }
}