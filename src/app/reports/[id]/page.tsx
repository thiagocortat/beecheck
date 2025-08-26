import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getScoreColor, getScoreEmoji } from '@/lib/scoring';
import { Download, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import Link from 'next/link';
import { toBasicInputs } from '@/lib/normalize-basic';
import { computeBasicScore } from '@/lib/basic-score';

interface ReportPageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { competitors: true },
  });

  if (!report) {
    notFound();
  }


  const technicalDetails = report.technicalReport ? JSON.parse(report.technicalReport) : null;
  // Calculate score using Basic Score 2.0 for consistency
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
  const currentScore = basicScore.final;
  
  const scoreColor = getScoreColor(currentScore);
  const scoreEmoji = getScoreEmoji(currentScore);

  const getScoreBadgeVariant = (color: string) => {
    switch (color) {
      case 'green': return 'default';
      case 'yellow': return 'secondary';
      case 'red': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4">
            <span className="text-2xl">🐝</span>
            <span className="font-bold text-xl">BeeCheck</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatório de Performance</h1>
          <p className="text-gray-600 break-all">{report.url}</p>
        </div>

        {/* Score Overview */}
        <Card className="mb-8 border-2" style={{ borderColor: scoreColor === 'green' ? '#10b981' : scoreColor === 'yellow' ? '#f59e0b' : '#ef4444' }}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-6xl mb-4">{scoreEmoji}</div>
              <div className="text-4xl font-bold mb-2" style={{ color: scoreColor === 'green' ? '#10b981' : scoreColor === 'yellow' ? '#f59e0b' : '#ef4444' }}>
                {currentScore}/100
              </div>
              <Badge variant={getScoreBadgeVariant(scoreColor)} className="text-lg px-4 py-1">
                {scoreColor === 'green' ? 'Excelente' : scoreColor === 'yellow' ? 'Pode Melhorar' : 'Precisa de Atenção'}
              </Badge>
              <div className="flex justify-center gap-4 mt-6">
                <Button asChild>
                  <Link href={`/api/reports/${report.id}/download`}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={report.url} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visitar Site
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile vs Desktop Comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                Mobile (Prioridade)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {currentScore}/100
              </div>
              <Progress value={currentScore} className="mb-2" />
              <p className="text-sm text-gray-600">
                A maioria dos hóspedes acessa pelo celular
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-purple-600" />
                Desktop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {currentScore}/100
              </div>
              <Progress value={currentScore} className="mb-2" />
              <p className="text-sm text-gray-600">
                Importante para pesquisa e comparação
              </p>
            </CardContent>
          </Card>
        </div>



        {/* Technical Details */}
        {technicalDetails && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>📊 Detalhes Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Core Web Vitals */}
                <div>
                  <h4 className="font-semibold mb-3">Core Web Vitals</h4>
                  <div className="space-y-2">
                    {technicalDetails.coreWebVitals && Object.entries(technicalDetails.coreWebVitals).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm">{key.toUpperCase()}</span>
                        <Badge variant="outline">{typeof value === 'object' ? JSON.stringify(value) : value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h4 className="font-semibold mb-3">Performance</h4>
                  <div className="space-y-2">
                    {technicalDetails.performance && Object.entries(technicalDetails.performance).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <Badge variant="outline">{typeof value === 'object' ? JSON.stringify(value) : value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competitors */}
        {report.competitors.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>🏆 Comparativo com Concorrentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.competitors.map((competitor: any, index: number) => (
                  <div key={competitor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <div>
                        <p className="font-medium">{competitor.url}</p>
                        <p className="text-sm text-gray-600">Analisado em {new Date(competitor.analyzedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <Badge variant={getScoreBadgeVariant(getScoreColor(competitor.overallScore))}>
                      {competitor.overallScore}/100
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>Relatório gerado em {new Date(report.createdAt).toLocaleDateString('pt-BR')} às {new Date(report.createdAt).toLocaleTimeString('pt-BR')}</p>
          <p className="mt-2">BeeCheck - Transformando dados em mais reservas</p>
        </div>
      </div>
    </div>
  );
}