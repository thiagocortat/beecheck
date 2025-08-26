import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { analyzeWebsite } from '@/lib/analysis-worker';
import { PageSpeedClient } from '@/lib/pagespeed';
import { toBasicInputs } from '@/lib/normalize-basic';
import { computeBasicScore } from '@/lib/basic-score';

// SEO check function (extracted from analysis-worker)
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

    // Get detailed data for all sites using Basic Analysis 2.0
    const pageSpeedClient = new PageSpeedClient(process.env.PAGESPEED_API_KEY!);
    
    // Use existing scores from database (already calculated with Basic Analysis 2.0)
    const validCompetitors = report.competitors
      .filter(comp => comp.score && comp.score > 0)
      .map(comp => ({
        id: comp.id,
        url: comp.url,
        score: comp.score!,
        basicInputs: null, // Will be populated from existing analysis if needed
        basicScore: null,   // Will be populated from existing analysis if needed
        type: 'competitor' as const,
        status: 'completed' as const,
      }));
    
    console.log(`[BeeCheck][Concorrentes] usando dados já calculados (${validCompetitors.length} concorrentes)`);
    
    const allSites = [
       {
         id: report.id,
         url: report.url,
         score: report.score || 0,
         basicInputs: null,
         basicScore: null,
         type: 'main' as const,
         status: report.status,
       },
       ...validCompetitors,
     ];

    // Ranking simplificado por score (dados detalhados já calculados no analysis-worker)
      const ranking = allSites
        .filter(site => site.status === 'completed')
        .sort((a, b) => {
          // 1. Nota final (desc)
          if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
          
          // 2. Alfabética do domínio como desempate
          return a.url.localeCompare(b.url);
        })
      .map((site, index) => ({
        ...site,
        position: index + 1,
        medal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊',
      }));
    
    console.log(`[BeeCheck][Concorrentes] ranking pronto (${validCompetitors.length} concorrentes)`);

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