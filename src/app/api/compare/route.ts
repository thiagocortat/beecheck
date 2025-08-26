import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { analyzeWebsite } from '@/lib/analysis-worker';

const compareSchema = z.object({
  mainUrl: z.string().url('URL principal deve ser válida'),
  competitors: z.array(z.string().url('URLs dos concorrentes devem ser válidas')).max(3, 'Máximo 3 concorrentes'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mainUrl, competitors } = compareSchema.parse(body);

    // Criar relatório principal
    const mainReport = await prisma.report.create({
      data: {
        url: mainUrl,
        status: 'pending',
        score: 0,
      },
    });

    // Processar análise principal diretamente
    try {
      await analyzeWebsite({
        reportId: mainReport.id,
        url: mainUrl,
        competitors: competitors,
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      await prisma.report.update({
        where: { id: mainReport.id },
        data: { status: 'failed' }
      });
    }

    // Criar relatórios dos concorrentes
    const competitorReports = [];
    for (const competitorUrl of competitors) {
      const competitorReport = await prisma.competitor.create({
          data: {
            url: competitorUrl,
            reportId: mainReport.id,
            score: 0,
          },
        });
      competitorReports.push(competitorReport);

      // Processar análise do concorrente diretamente
      try {
        await analyzeWebsite({
          reportId: competitorReport.id,
          url: competitorUrl
        });
        
        // Atualizar score do concorrente no banco
        const updatedCompetitor = await prisma.report.findUnique({
          where: { id: competitorReport.id }
        });
        
        if (updatedCompetitor) {
          await prisma.competitor.update({
            where: { id: competitorReport.id },
            data: { score: updatedCompetitor.score }
          });
        }
      } catch (error) {
        console.error(`Competitor analysis failed for ${competitorUrl}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      reportId: mainReport.id,
      message: 'Análise comparativa iniciada com sucesso',
      competitors: competitorReports.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos', 
          details: error.issues.map(issue => issue.message) 
        },
        { status: 400 }
      );
    }

    console.error('Erro na análise comparativa:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'ID do relatório é obrigatório' },
        { status: 400 }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        competitors: {
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Relatório não encontrado' },
        { status: 404 }
      );
    }

    // Calcular ranking
    const allSites = [
      {
        id: report.id,
        url: report.url,
        score: report.score,
        type: 'main' as const,
        status: report.status,
      },
      ...report.competitors.map(comp => ({
        id: comp.id,
        url: comp.url,
        score: comp.score,
        type: 'competitor' as const,
        status: 'completed' as const,
      })),
    ];

    // Ordenar por score (maior para menor)
    const ranking = allSites
      .filter(site => site.status === 'completed')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((site, index) => ({
        ...site,
        position: index + 1,
        medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊',
      }));

    // Calcular insights
    const mainSite = ranking.find(site => site.type === 'main');
    const competitors = ranking.filter(site => site.type === 'competitor');
    const betterThanCount = competitors.filter((comp: any) => mainSite && (comp.score || 0) < (mainSite.score || 0)).length;
    const averageCompetitorScore = competitors.length > 0 
      ? Math.round(competitors.reduce((sum: number, comp: any) => sum + (comp.score || 0), 0) / competitors.length)
      : 0;

    const insights = {
      mainPosition: mainSite?.position || null,
      totalSites: ranking.length,
      betterThanCount,
      averageCompetitorScore,
      scoreDifference: mainSite ? (mainSite.score || 0) - averageCompetitorScore : 0,
      isAboveAverage: mainSite ? (mainSite.score || 0) > averageCompetitorScore : false,
    };

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        url: report.url,
        status: report.status,
        score: report.score,
        createdAt: report.createdAt,
        completedAt: report.completedAt,
      },
      ranking,
      insights,
    });
  } catch (error) {
    console.error('Erro ao buscar comparativo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}