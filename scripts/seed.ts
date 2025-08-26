import { PrismaClient } from '@prisma/client';
import { PageSpeedClient } from '../src/lib/pagespeed';
import { calculateOverallScore } from '../src/lib/scoring';


const prisma = new PrismaClient();
const pageSpeedClient = new PageSpeedClient(process.env.GOOGLE_PAGESPEED_API_KEY!);

const EXAMPLE_URLS = [
  'https://www.copacabanapalace.com.br',
  'https://www.fasano.com.br',
  'https://www.emiliano.com.br',
  'https://www.hotel-unique.com',
  'https://www.grandhyatt.com/pt/hotel/sao-paulo/grand-hyatt-sao-paulo.html'
];

async function seedDatabase() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // Limpar dados existentes
    await prisma.competitor.deleteMany();
    await prisma.report.deleteMany();
    console.log('✅ Dados existentes removidos');

    // Criar relatórios de exemplo
    for (const url of EXAMPLE_URLS.slice(0, 3)) {
      console.log(`📊 Analisando ${url}...`);
      
      try {
        // Criar relatório pendente
        const report = await prisma.report.create({
          data: {
            url,
            status: 'processing',
            score: 0,
          },
        });

        // Simular análise (em produção seria feito pelo worker)
        const mobileResults = await pageSpeedClient.analyzeUrl(url, 'mobile');
        const desktopResults = await pageSpeedClient.analyzeUrl(url, 'desktop');

        if (mobileResults && desktopResults) {
          // Preparar dados consolidados
          const consolidatedData = {
            mobile: mobileResults,
            desktop: desktopResults,
            seo: {
              hasTitle: true,
              hasDescription: true,
              hasH1: true,
              hasHttps: url.startsWith('https'),
              hasSitemap: true,
              hasRobots: true,
              hasCanonical: true,
              hasSchema: false,
              hasBookingCta: true,
            },
          };

          // Calcular scores
          const overallScore = calculateOverallScore(consolidatedData);
          const mobileScore = calculateOverallScore({
            ...consolidatedData,
            desktop: consolidatedData.mobile // Usar apenas mobile para score mobile
          });
          const desktopScore = calculateOverallScore({
            ...consolidatedData,
            mobile: consolidatedData.desktop // Usar apenas desktop para score desktop
          });

          // Gerar relatórios
          const technicalDetails = 'Technical report generation removed';

          // Atualizar relatório
          await prisma.report.update({
            where: { id: report.id },
            data: {
              status: 'completed',
              score: mobileScore,

              technicalReport: JSON.stringify(technicalDetails),
              completedAt: new Date(),
              // Core Web Vitals
              lcpMobile: consolidatedData.mobile.lcp,
              lcpDesktop: consolidatedData.desktop.lcp,
              clsMobile: consolidatedData.mobile.cls,
              clsDesktop: consolidatedData.desktop.cls,
              inpMobile: consolidatedData.mobile.inp,
              inpDesktop: consolidatedData.desktop.inp,
              // Performance
              ttfbMobile: consolidatedData.mobile.ttfb,
              ttfbDesktop: consolidatedData.desktop.ttfb,
              pageSizeMobile: consolidatedData.mobile.pageSize,
              pageSizeDesktop: consolidatedData.desktop.pageSize,
              // SEO
              hasTitle: consolidatedData.seo.hasTitle,
              hasDescription: consolidatedData.seo.hasDescription,
              hasH1: consolidatedData.seo.hasH1,
              hasHttps: consolidatedData.seo.hasHttps,
              hasSitemap: consolidatedData.seo.hasSitemap,
              hasRobots: consolidatedData.seo.hasRobots,
              hasCanonical: consolidatedData.seo.hasCanonical,
              hasSchema: consolidatedData.seo.hasSchema,
              hasBookingCta: consolidatedData.seo.hasBookingCta
            },
          });

          console.log(`✅ ${url} - Score: ${overallScore}/100`);
        } else {
          // Marcar como erro se não conseguiu analisar
          await prisma.report.update({
            where: { id: report.id },
            data: {
              status: 'failed',
            },
          });
          console.log(`❌ ${url} - Erro na análise`);
        }
      } catch (error) {
        console.error(`❌ Erro ao analisar ${url}:`, error);
      }

      // Aguardar um pouco entre as requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🎉 Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };