import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getScoreColor, getScoreEmoji } from '@/lib/scoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const report = await prisma.report.findUnique({
      where: { id },
      include: { competitors: true }
    });

    if (!report) {
      return new NextResponse('Relatório não encontrado', { status: 404 });
    }

    if (report.status !== 'completed') {
      return new NextResponse('Relatório ainda não foi concluído', { status: 400 });
    }


    const scoreColor = getScoreColor(report.score || 0);
    const scoreEmoji = getScoreEmoji(report.score || 0);
    
    // Calculate mobile and desktop scores from available metrics
    const calculateDeviceScore = (lcp: number | null, cls: number | null, inp: number | null, ttfb: number | null, pageSize: number | null) => {
      if (!lcp || !cls || !inp || !ttfb || !pageSize) return null;
      
      const lcpScore = lcp <= 2500 ? 100 : Math.max(0, 100 - ((lcp - 2500) / 1500) * 50);
      const clsScore = cls <= 0.1 ? 100 : Math.max(0, 100 - ((cls - 0.1) / 0.15) * 50);
      const inpScore = inp <= 200 ? 100 : Math.max(0, 100 - ((inp - 200) / 300) * 50);
      const ttfbScore = ttfb <= 200 ? 100 : Math.max(0, 100 - ((ttfb - 200) / 400) * 50);
      const pageSizeScore = pageSize <= 1000 ? 100 : Math.max(0, 100 - ((pageSize - 1000) / 2000) * 50);
      
      return Math.round((lcpScore + clsScore + inpScore + ttfbScore + pageSizeScore) / 5);
    };
    
    const mobileScore = calculateDeviceScore(report.lcpMobile, report.clsMobile, report.inpMobile, report.ttfbMobile, report.pageSizeMobile);
    const desktopScore = calculateDeviceScore(report.lcpDesktop, report.clsDesktop, report.inpDesktop, report.ttfbDesktop, report.pageSizeDesktop);

    // Use Basic Score 2.0 for consistency
    const { toBasicInputs } = await import('@/lib/normalize-basic');
    const { computeBasicScore } = await import('@/lib/basic-score');
    
    const basicInputs = toBasicInputs({
      mobile: {
        lcp: report.lcpMobile,
        cls: report.clsMobile,
        inp: report.inpMobile,
        ttfb: report.ttfbMobile,
        pageSize: report.pageSizeMobile
      },
      desktop: {
        lcp: report.lcpDesktop,
        cls: report.clsDesktop,
        inp: report.inpDesktop,
        ttfb: report.ttfbDesktop,
        pageSize: report.pageSizeDesktop
      },
      seo: {
        hasTitle: report.hasTitle,
        hasDescription: report.hasDescription,
        hasH1: report.hasH1,
        hasHttps: report.hasHttps,
        hasSitemap: report.hasSitemap,
        hasRobots: report.hasRobots,
        hasCanonical: report.hasCanonical,
        hasSchema: report.hasSchema,
        hasBookingCta: report.hasBookingCta
      },
      url: report.url
    });
    
    const basicScore = computeBasicScore(basicInputs);
    
    // Format metrics for display
    const formatMetric = (value: number | null, unit: string = '') => {
      if (value === null || value === undefined) return 'N/A';
      return `${Math.round(value)}${unit}`;
    };
    
    const formatBytes = (bytes: number | null) => {
      if (!bytes) return 'N/A';
      if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
      return `${Math.round(bytes / 1024)}KB`;
    };

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório BeeCheck - ${report.url}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 30px;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 20px;
    }
    
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 8px;
    }
    
    .tagline {
      color: #6b7280;
      font-size: 14px;
    }
    
    .score-section {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 16px;
      padding: 25px;
      text-align: center;
      margin-bottom: 25px;
      border: 2px solid ${scoreColor === 'green' ? '#10b981' : scoreColor === 'yellow' ? '#f59e0b' : '#ef4444'};
    }
    
    .score-badge {
      display: inline-block;
      font-size: 42px;
      font-weight: bold;
      color: ${scoreColor === 'green' ? '#10b981' : scoreColor === 'yellow' ? '#f59e0b' : '#ef4444'};
      margin-bottom: 8px;
    }
    
    .score-label {
      font-size: 16px;
      color: #374151;
      margin-bottom: 12px;
    }
    
    .url {
      font-size: 13px;
      color: #6b7280;
      word-break: break-all;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 12px;
      border-left: 4px solid #f59e0b;
      padding-left: 12px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 15px;
      border: 1px solid #e5e7eb;
    }
    
    .metric-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .metric-description {
      font-size: 12px;
      color: #6b7280;
    }
    
    .cwv-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .cwv-card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      border: 2px solid #e5e7eb;
      text-align: center;
    }
    
    .cwv-title {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    
    .cwv-value {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .cwv-mobile { color: #3b82f6; }
    .cwv-desktop { color: #8b5cf6; }
    
    .recommendations {
      background: #f0fdf4;
      border-radius: 12px;
      padding: 18px;
      border-left: 4px solid #10b981;
      margin-bottom: 20px;
    }
    
    .recommendation-item {
      margin-bottom: 12px;
      padding: 10px;
      background: white;
      border-radius: 6px;
      border: 1px solid #d1fae5;
    }
    
    .recommendation-title {
      font-weight: 600;
      color: #065f46;
      margin-bottom: 4px;
      font-size: 14px;
    }
    
    .recommendation-description {
      color: #374151;
      font-size: 13px;
    }
    
    .seo-checklist {
      background: #fef3c7;
      border-radius: 12px;
      padding: 18px;
      border-left: 4px solid #f59e0b;
    }
    
    .seo-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .seo-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 12px;
    }
    
    .comparison-card {
      background: white;
      border-radius: 12px;
      padding: 18px;
      border: 2px solid #e5e7eb;
      text-align: center;
    }
    
    .comparison-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #374151;
      font-size: 14px;
    }
    
    .comparison-score {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .mobile { color: #3b82f6; }
    .desktop { color: #8b5cf6; }
    
    .gates-section {
      background: #fef2f2;
      border-radius: 12px;
      padding: 18px;
      border-left: 4px solid #ef4444;
      margin-bottom: 20px;
    }
    
    .gate-item {
      margin-bottom: 8px;
      font-size: 14px;
      color: #7f1d1d;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 11px;
    }
    
    .qr-section {
      margin-top: 15px;
      text-align: center;
    }
    
    @media print {
      body { padding: 15px; font-size: 12px; }
      .header { margin-bottom: 15px; }
      .section { margin-bottom: 15px; }
      .score-badge { font-size: 36px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🐝 BeeCheck</div>
    <div class="tagline">Análise de Performance para Hotéis</div>
  </div>

  <div class="score-section">
    <div class="score-badge">${scoreEmoji} ${report.score}/100</div>
    <div class="score-label">Nota Geral do Site (Score 2.0)</div>
    <div class="url">${report.url}</div>
  </div>

  <!-- Core Web Vitals -->
  <div class="section">
    <h2 class="section-title">⚡ Core Web Vitals</h2>
    <div class="cwv-grid">
      <div class="cwv-card">
        <div class="cwv-title">LCP (Carregamento)</div>
        <div class="cwv-value cwv-mobile">${formatMetric(report.lcpMobile, 'ms')}</div>
        <div class="metric-description">Mobile</div>
        <div class="cwv-value cwv-desktop">${formatMetric(report.lcpDesktop, 'ms')}</div>
        <div class="metric-description">Desktop</div>
      </div>
      <div class="cwv-card">
        <div class="cwv-title">CLS (Estabilidade)</div>
        <div class="cwv-value cwv-mobile">${formatMetric(report.clsMobile)}</div>
        <div class="metric-description">Mobile</div>
        <div class="cwv-value cwv-desktop">${formatMetric(report.clsDesktop)}</div>
        <div class="metric-description">Desktop</div>
      </div>
      <div class="cwv-card">
        <div class="cwv-title">INP (Interatividade)</div>
        <div class="cwv-value cwv-mobile">${formatMetric(report.inpMobile, 'ms')}</div>
        <div class="metric-description">Mobile</div>
        <div class="cwv-value cwv-desktop">${formatMetric(report.inpDesktop, 'ms')}</div>
        <div class="metric-description">Desktop</div>
      </div>
    </div>
  </div>

  <!-- Performance Metrics -->
  <div class="section">
    <h2 class="section-title">🚀 Métricas de Performance</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">TTFB (Tempo de Resposta)</div>
        <div class="metric-value mobile">${formatMetric(report.ttfbMobile, 'ms')}</div>
        <div class="metric-description">Mobile • Ideal: &lt;800ms</div>
        <div class="metric-value desktop">${formatMetric(report.ttfbDesktop, 'ms')}</div>
        <div class="metric-description">Desktop • Ideal: &lt;800ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Tamanho da Página</div>
        <div class="metric-value mobile">${formatBytes(report.pageSizeMobile)}</div>
        <div class="metric-description">Mobile • Ideal: &lt;1.5MB</div>
        <div class="metric-value desktop">${formatBytes(report.pageSizeDesktop)}</div>
        <div class="metric-description">Desktop • Ideal: &lt;2.5MB</div>
      </div>
    </div>
  </div>

  <!-- SEO Checklist -->
  <div class="section">
    <h2 class="section-title">🔍 Checklist SEO</h2>
    <div class="seo-checklist">
      <div class="seo-item">
        <span class="seo-icon">${report.hasTitle ? '✅' : '❌'}</span>
        <span>Título da página (meta title)</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">${report.hasDescription ? '✅' : '❌'}</span>
        <span>Descrição da página (meta description)</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">${report.hasH1 ? '✅' : '❌'}</span>
        <span>Cabeçalho principal (H1)</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">${report.hasHttps ? '✅' : '❌'}</span>
        <span>Conexão segura (HTTPS)</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">${report.hasCanonical ? '✅' : '❌'}</span>
        <span>URL canônica</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">${report.hasSchema ? '✅' : '❌'}</span>
        <span>Dados estruturados (Schema)</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">${report.hasBookingCta ? '✅' : '❌'}</span>
        <span>Botão de reserva visível</span>
      </div>
    </div>
  </div>

  ${basicScore.gates.reasons.length > 0 ? `
  <!-- Problemas Críticos -->
  <div class="section">
    <h2 class="section-title">⚠️ Problemas que Limitam sua Nota</h2>
    <div class="gates-section">
      ${basicScore.gates.reasons.map(reason => `
        <div class="gate-item">• ${reason}</div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Recomendações -->
  <div class="section">
    <h2 class="section-title">💡 Recomendações Prioritárias</h2>
    <div class="recommendations">
      ${basicScore.subscores.cwv < 80 ? `
      <div class="recommendation-item">
        <div class="recommendation-title">🎯 Otimizar Core Web Vitals</div>
        <div class="recommendation-description">Melhorar LCP, CLS e INP para aumentar conversões e ranking no Google</div>
      </div>
      ` : ''}
      ${basicScore.subscores.ttfb < 80 ? `
      <div class="recommendation-item">
        <div class="recommendation-title">⚡ Acelerar Servidor</div>
        <div class="recommendation-description">Implementar cache e CDN para reduzir tempo de resposta</div>
      </div>
      ` : ''}
      ${basicScore.subscores.weight < 80 ? `
      <div class="recommendation-item">
        <div class="recommendation-title">📦 Reduzir Tamanho da Página</div>
        <div class="recommendation-description">Comprimir imagens e minificar código para carregamento mais rápido</div>
      </div>
      ` : ''}
      ${basicScore.subscores.mobile < 80 ? `
      <div class="recommendation-item">
        <div class="recommendation-title">📱 Melhorar Experiência Mobile</div>
        <div class="recommendation-description">Otimizar para dispositivos móveis onde acontecem 70% das reservas</div>
      </div>
      ` : ''}
      ${basicScore.subscores.seo < 80 ? `
      <div class="recommendation-item">
        <div class="recommendation-title">🔍 Aprimorar SEO</div>
        <div class="recommendation-description">Completar meta tags e dados estruturados para melhor visibilidade</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- Comparação Mobile vs Desktop -->
  <div class="section">
    <h2 class="section-title">📱 Mobile vs Desktop</h2>
    <div class="comparison-grid">
      <div class="comparison-card">
        <div class="comparison-title">📱 Mobile</div>
        <div class="comparison-score mobile">${report.score}/100</div>
        <div class="metric-description">Prioridade máxima • 70% das reservas</div>
      </div>
      <div class="comparison-card">
        <div class="comparison-title">💻 Desktop</div>
        <div class="comparison-score desktop">${report.score}/100</div>
        <div class="metric-description">Complementar • Pesquisa e comparação</div>
      </div>
    </div>
  </div>

  <!-- Impacto nos Negócios -->
  <div class="section">
    <h2 class="section-title">💰 Impacto nos Negócios</h2>
    <div class="seo-checklist">
      <div style="margin-bottom: 12px; font-weight: 600; color: #92400e;">Melhorias de performance podem resultar em:</div>
      <div class="seo-item">
        <span class="seo-icon">📈</span>
        <span>+15% a +25% em conversões (reservas)</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">🔍</span>
        <span>Melhor posicionamento no Google</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">📱</span>
        <span>Menos desistências no mobile</span>
      </div>
      <div class="seo-item">
        <span class="seo-icon">⭐</span>
        <span>Melhor experiência do usuário</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Relatório gerado em ${new Date(report.createdAt).toLocaleDateString('pt-BR')} • Score 2.0</p>
    <p>BeeCheck - Transformando dados em mais reservas</p>
    <div class="qr-section">
      <p>Acesse o relatório completo em: ${process.env.NEXT_PUBLIC_APP_URL}/reports/${report.id}</p>
    </div>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF HTML:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}