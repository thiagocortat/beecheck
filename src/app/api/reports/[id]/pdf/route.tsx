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

    const executiveSummary = report.executiveSummary ? JSON.parse(report.executiveSummary) : null;
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
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 20px;
    }
    
    .logo {
      font-size: 32px;
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
      padding: 30px;
      text-align: center;
      margin-bottom: 30px;
      border: 2px solid ${scoreColor === 'green' ? '#10b981' : scoreColor === 'yellow' ? '#f59e0b' : '#ef4444'};
    }
    
    .score-badge {
      display: inline-block;
      font-size: 48px;
      font-weight: bold;
      color: ${scoreColor === 'green' ? '#10b981' : scoreColor === 'yellow' ? '#f59e0b' : '#ef4444'};
      margin-bottom: 10px;
    }
    
    .score-label {
      font-size: 18px;
      color: #374151;
      margin-bottom: 15px;
    }
    
    .url {
      font-size: 14px;
      color: #6b7280;
      word-break: break-all;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
      border-left: 4px solid #f59e0b;
      padding-left: 15px;
    }
    
    .quick-wins {
      background: #f0fdf4;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #10b981;
    }
    
    .quick-win-item {
      margin-bottom: 15px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #d1fae5;
    }
    
    .quick-win-title {
      font-weight: bold;
      color: #065f46;
      margin-bottom: 5px;
    }
    
    .quick-win-description {
      color: #374151;
      font-size: 14px;
    }
    
    .business-impact {
      background: #fef3c7;
      border-radius: 12px;
      padding: 20px;
      border-left: 4px solid #f59e0b;
    }
    
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 15px;
    }
    
    .comparison-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 2px solid #e5e7eb;
      text-align: center;
    }
    
    .comparison-title {
      font-weight: bold;
      margin-bottom: 10px;
      color: #374151;
    }
    
    .comparison-score {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .mobile { color: #3b82f6; }
    .desktop { color: #8b5cf6; }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    
    .qr-section {
      margin-top: 20px;
      text-align: center;
    }
    
    @media print {
      body { padding: 20px; }
      .header { margin-bottom: 20px; }
      .section { margin-bottom: 20px; }
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
    <div class="score-label">Nota Geral do Site</div>
    <div class="url">${report.url}</div>
  </div>

  ${executiveSummary?.quickWins ? `
  <div class="section">
    <h2 class="section-title">🚀 Ganhos Rápidos</h2>
    <div class="quick-wins">
      ${executiveSummary.quickWins.map((win: { title: string; description: string }) => `
        <div class="quick-win-item">
          <div class="quick-win-title">${win.title}</div>
          <div class="quick-win-description">${win.description}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${executiveSummary?.businessImpact ? `
  <div class="section">
    <h2 class="section-title">💰 Impacto para Vendas</h2>
    <div class="business-impact">
      <p>${executiveSummary.businessImpact}</p>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2 class="section-title">📱 Mobile vs Desktop</h2>
    <div class="comparison-grid">
      <div class="comparison-card">
        <div class="comparison-title">📱 Mobile</div>
        <div class="comparison-score mobile">${mobileScore || 'N/A'}/100</div>
        <div>Prioridade máxima</div>
      </div>
      <div class="comparison-card">
        <div class="comparison-title">💻 Desktop</div>
        <div class="comparison-score desktop">${desktopScore || 'N/A'}/100</div>
        <div>Complementar</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Relatório gerado em ${new Date(report.createdAt).toLocaleDateString('pt-BR')}</p>
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