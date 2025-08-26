project_rules.md — BeeVitals (Módulo 16 — Auditoria Avançada)

Escopo: regras do projeto para o Módulo 16 — Cobertura de Métricas Avançadas do BeeVitals. Baseado no “BeeVitals — Context Pack (Trae Variant B)” com a ampliação de métricas avançadas. Documento para desenvolvedores, QA e PMs.

1) Propósito

Fornecer um worker de auditoria avançada que, a partir de uma URL de hotel, colete dados de rede, recursos e DOM via Playwright/Chrome Headless, gere um JSON padronizado (AdvancedSample) e de subscores por categoria, além de bullets em linguagem humana para o relatório executivo.

Resultados esperados:

Diagnóstico objetivo de Performance & Rede, Cache/CDN, Imagens, Scripts de Terceiros, Fonts, PWA, Acessibilidade e SEO avançado.

Saída pronta para scoring 2.0 e para texto não técnico no relatório.

2) Fora de escopo (neste módulo)

Geração de PDF (fica no Módulo de Relatórios).

Persistência em banco e histórico (fica no Módulo de Storage).

Crawling de múltiplas páginas (ver Módulo de Amostragem/Descoberta).

RUM/CrUX dedicado (ver Módulo de Field Data).

3) Entradas e Saídas

Entrada mínima: { url: string, role?: 'home'|'rooms'|'booking'|'checkout'|'other' }

Saída: objeto AdvancedSample + objeto de subscores (ver §6) e bullets humanos (ver §9).

Endpoint recomendado:

POST /api/advanced-scan
Content-Type: application/json
{
  "url": "https://www.seuhotel.com",
  "role": "home"
}

Resposta:

{
  "sample": { /* AdvancedSample */ },
  "subscores": { /* ver §8 */ },
  "bullets": ["...", "..."]
}
4) Arquitetura & Execução

Runner: Playwright, contextos mobile (360×780) e desktop (1366×768).

HAR: habilitar captura por navegação.

Observers: injetar script com PerformanceObserver para navigation, resource, longtask, largest-contentful-paint.

Respostas HTTP: ouvir page.on('response') para coletar headers e tamanho (usar transferSize/content-length).

DOM: extrair <img>, <script>, <link>, <meta>, JSON‑LD, e CSS injetado.

Timeout padrão: 20s por página (configurável). Repetir uma vez em falha transitória.

5) JSON Contract — AdvancedSample
export type AdvancedSample = {
  url: string
  viewport: 'mobile'|'desktop'
  timings: {
    dns_ms?: number; connect_ms?: number; tls_ms?: number; ttfb_ms?: number;
    response_ms?: number; mainThread_ms?: number; longTasks_count?: number; longTasks_total_ms?: number;
    serverTiming?: { name:string; dur_ms?:number; desc?:string }[]
  }
  resources: {
    requests_total: number
    bytes: { js:number; css:number; img:number; font:number; html:number; other:number }
  }
  cacheCdn: {
    cdn?: { vendor?: 'Cloudflare'|'Akamai'|'Fastly'|'CloudFront'|'AzureFD'|'GoogleCDN'|'Other'; evidence: string[] }
    compressionCoverage_pct?: number
    cacheable_pct?: number
    headersSample?: { url:string; contentType?:string; encoding?:string; cacheControl?:string; vary?:string }[]
  }
  images: {
    total: number; webp_pct:number; avif_pct:number; jpg_png_pct:number
    lazy_pct:number; wrongDims_count:number; heroPreloaded:boolean; lcpUrl?:string
  }
  thirdParties: {
    total_requests:number; total_bytes:number
    byDomain: { domain:string; bytes:number; blocking:boolean; category:'chat'|'analytics'|'ads'|'tag_manager'|'social'|'widget'|'unknown' }[]
  }
  fonts: {
    total:number; withFontDisplay_pct:number; preloaded_count:number; subset_hint:boolean
  }
  pwa: { manifest:boolean; serviceWorker:boolean; offlineBasic:boolean; a2hsReady:boolean }
  a11y: { issues_total:number; byCategory:{ contrast?:number; alt?:number; labels?:number; focus?:number; keyboard?:number } }
  seo: {
    indexable:boolean; canonical:boolean; og:boolean; twitter:boolean;
    schema:string[]; hreflangPairs_ok:boolean
  }
}

Valores ausentes devem ser omitidos ou definidos como undefined (não usar null).

6) Coleta — Regras e Fórmulas

Timings

dns_ms = domainLookupEnd - domainLookupStart

connect_ms = connectEnd - connectStart

tls_ms = secureConnectionStart ? (connectEnd - secureConnectionStart) : 0

ttfb_ms = responseStart - requestStart

response_ms = responseEnd - responseStart

longTasks_*: somar PerformanceObserver('longtask'). mainThread_ms = longTasks_total_ms + 0.6 * (TBT_ms || 0) (fallback heurístico).

serverTiming: parsear header server-timing da resposta principal.

Resumo de recursos

requests_total = total HAR.

bytes.* por content-type (fallback por extensão). Se sem content-length, usar transferSize.

Cache/CDN

CDN: detectar via headers (cf-ray, x-amz-cf-*, x-akamai-*, x-served-by, via, x-azure-ref) ou CNAME.

Compressão: cobertura = % de responses textuais (text/*, application/javascript|json|xml|svg) com content-encoding ∈ {br,gzip}.

Cacheável: % de responses textuais com cache-control adequado (max-age>=86400) — HTML pode ser no-store.

Imagens

Formatos por content-type/extensão → webp_pct, avif_pct, jpg_png_pct.

lazy_pct = % de <img> com loading="lazy" ou padrão equivalente.

wrongDims_count = nº de <img> com dimensões renderizadas divergentes >20% do arquivo (precisa avaliar naturalWidth/Height).

heroPreloaded = existência de <link rel="preload" as="image" href="{lcpUrl}">.

Scripts de terceiros

Domínio ≠ host base → classificar por regex list: analytics (googletagmanager.com, google-analytics.com, facebook.net, clarity.ms, doubleclick.net, hotjar.com...), chat (intercom.io, crisp.chat, tawk.to, zendesk.com, drift.com...), ads, sociais, widgets.

blocking=true para <script> sem async|defer no <head>.

Fonts

Verificar @font-face → font-display (conta ok para swap|optional).

preloaded_count por <link rel="preload" as="font">.

subset_hint se nome do arquivo contém -subset|latin|latin-ext ou se CSS usa unicode-range específico.

PWA

manifest via <link rel="manifest"> e validação básica (name/short_name, icons 192/512, display = standalone|minimal-ui).

serviceWorker via navigator.serviceWorker.getRegistrations().

offlineBasic se SW registra fetch handler.

a2hsReady se manifest válido + ícones + display correto.

A11y

Injetar axe-core e executar axe.run(). Agrupar em contrast, alt, labels, focus, keyboard.

SEO avançado

indexable se não houver <meta name="robots" content="noindex"> e robots.txt não bloquear /.

canonical absoluto e consistente.

og e twitter com title, description, image.

schema = tipos JSON‑LD/Microdata encontrados (Hotel, LodgingBusiness, Organization, BreadcrumbList, AggregateRating).

hreflangPairs_ok = reciprocidade entre páginas de idiomas.

7) Resiliência & Erros

Se algum coletor falhar, preencher parcialmente o AdvancedSample e registrar aviso em log.

Nunca lançar erro não tratado para a UI. Retornar 200 com campo warnings: string[] quando apropriado.

Limites: máximo de 200 respostas inspecionadas por amostra; headers headersSample limitado a 10 URLs por tipo.

8) Scoring — Subscores por Categoria

Função pura scoreAdvanced(sample: AdvancedSample): { perfNet:number; resources:number; cacheCdn:number; images:number; thirdParties:number; fonts:number; pwa:number; a11y:number; seo:number }

Pesos móveis: se viewport='mobile', aplique ×1.0; se desktop, aplique ×0.7 em dimensões técnicas ao consolidar no relatório geral.

Thresholds sugeridos (lineares entre ótimo→ruim):

perfNet: 100 em ttfb<=800ms, dns<=100ms, tls<=300ms, longTasks_total<=200ms & count<=5; 0 em ttfb>1800ms ou dns>300ms ou tls>800ms ou longTasks_total>4000ms ou count>50.

resources: 100 em img<=700KB, js<=200KB, requests<=60; 0 em img>3MB ou js>1MB ou requests>200.

cacheCdn: 100 se compression>=90% e cacheable>=75% e CDN detectada; 50 sem CDN ou compression<60%; 0 em compression<20%.

images: 100 se webp+avif>=80%, lazy>=70%, wrongDims==0, heroPreloaded=true.

thirdParties: 100 se total_bytes<=150KB e nenhum blocking; 50 com 1 blocking leve; 0 com bytes>1MB ou >=3 blockings.

fonts: 100 se withFontDisplay_pct==100, preloaded_count>=1 quando houver FOIT, subset_hint=true.

pwa: 100 com manifest+SW+a2hs; 50 apenas manifest; 0 nenhum.

a11y: 100 sem violações; 70 ≤5; 0 >50.

seo: 100 se indexable && canonical && og && twitter && schema inclui (Hotel|LodgingBusiness) && hreflangPairs_ok (quando multilíngue).

Observação: não “punir duplamente”. Se uma dimensão não se aplica (ex.: site 100% estático sem PWA), apenas marque como 0 informativo mas sem reduzir o score final global — a agregação final decide o peso real por contexto.

9) Saída em Linguagem Humana (templates)

Cada categoria deve gerar 1 diagnóstico + 1 ação + 1 benefício:

Servidor lento (TTFB) → “O site começa a responder em {ttfb_ms}ms. Ativar cache/CDN reduz a espera — menos desistências no celular.”

Recursos pesados → “A página carrega {bytes_total}MB em {requests} itens. Enxugar scripts e comprimir fotos acelera — mais reservas concluídas.”

Cache/CDN → “Arquivos não estão comprimidos. Ligar brotli/gzip deixa tudo mais leve — abre mais rápido no 4G.”

Imagens → “Poucas fotos em WebP/AVIF. Trocar formatos reduz tamanho — conteúdo aparece antes.”

Terceiros → “Scripts de chat/pixel bloqueiam a tela. Carregar depois mantém a velocidade — botões respondem na hora.”

Fonts → “Fontes esperam baixar para aparecer. Usar font-display: swap evita atraso — leitura imediata.”

PWA → “Sem atalho instalável. Manifesto + Service Worker ajudam quem volta sempre — acesso rápido.”

A11y → “Há problemas de contraste e descrições. Ajustar cores e alt melhora leitura — experiência inclusiva.”

SEO → “Faltam tags sociais e dados do hotel. Adicionar schema.org/Hotel ajuda o Google — mais destaque.”

Selecione 3–5 bullets com maior impacto para exibir no Resumo Executivo.

10) Qualidade, Logs e Observabilidade

Logs: prefixo [BeeVitals][16], com level, url, viewport, tempo total, tamanho HAR, nº de warnings.

Métricas: p95 do tempo por varredura; taxa de erro por domínio; cobertura de compressão.

Feature flags: BV_ENABLE_A11Y, BV_ENABLE_PWA, BV_HEADERS_SAMPLE_SIZE.

11) Segurança & Privacidade

Não coletar dados pessoais; não enviar cookies para endpoints de terceiros.

Restringir navegação a mesma origem da URL solicitada (sem seguir links externos automaticamente).

Respeitar robots.txt apenas para crawling (não aplicável a simples fetch da página requisitada).

12) Testes (obrigatórios)

Unit: parsers (parseTimings, detectCdn, analyzeImages, classifyThirdParties, analyzeFonts, checkPwa, runAxe, analyzeSeo).

Unit: scoreAdvanced com casos limítrofes e pesos por viewport.

Fixtures: 3 domínios de exemplo, salvar JSON de AdvancedSample.

E2E leve: varrer uma URL conhecida e validar shape + ranges.

13) Critérios de Aceite

POST /api/advanced-scan responde 200 com AdvancedSample, subscores e 3–5 bullets.

Tempo médio ≤ 20s por página em rede padrão.

Falhas parciais não derrubam a rota; warnings documentados.

Testes unitários > 80% das funções críticas e E2E leve passando.

14) Convenções de Código

TypeScript estrito; funções puras para scoring e mapeamento de texto.

Nada de valores mágicos: thresholds em src/config/advanced-thresholds.ts.

Limite de dependências: Playwright, axe-core, zod (opcional p/ validação), nenhuma lib pesada de UI neste módulo.

15) Checklist de PR




16) Roadmap imediato (próximos passos)

Integração com Amostragem de Páginas (Módulo Descoberta).

Consolidação no score 2.0 global do relatório.

Export dos bullets no Resumo Executivo.

17) Exemplos de uso
curl -X POST https://beevitals.app/api/advanced-scan \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.exemplohotel.com","role":"home"}'
18) Decisões registradas (ADR)

ADR‑001: mainThread_ms inclui longTasks_total_ms + 60% do TBT (fallback) — motivo: aproximar percepção de travamento.

ADR‑002: Limite de 200 respostas inspecionadas por amostra — motivo: controle de tempo e memória.

ADR‑003: Punição zero para ausência de PWA no score global — motivo: evitar viés contra sites que não precisam de PWA.