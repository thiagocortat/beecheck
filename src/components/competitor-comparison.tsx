'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getScoreColor } from '@/lib/scoring';
import { Trophy, TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';

interface CompetitorComparisonProps {
  reportId: string;
}

interface RankingItem {
  id: string;
  url: string;
  score: number;
  type: 'main' | 'competitor';
  position: number;
  medal: string;
  basicInputs?: {
    lcp?: number;
    inp?: number;
    ttfb?: number;
    pageWeight?: number;
    requests?: number;
  };
  basicScore?: {
    final: number;
    gates: {
      reasons: string[];
    };
    subscores?: {
      cwv?: number;
    };
  };
}

interface ComparisonInsights {
  mainPosition: number | null;
  totalSites: number;
  betterThanCount: number;
  averageCompetitorScore: number;
  scoreDifference: number;
  isAboveAverage: boolean;
}

interface ComparisonData {
  ranking: RankingItem[];
  insights: ComparisonInsights;
  report: {
    status: string;
    overallScore: number;
  };
}

export function CompetitorComparison({ reportId }: CompetitorComparisonProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = async () => {
    try {
      const response = await fetch(`/api/compare?reportId=${reportId}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Erro ao carregar comparativo');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
    
    // Polling para atualizações em tempo real
    const interval = setInterval(() => {
      if (data?.report.status !== 'completed') {
        fetchComparison();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [reportId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            Comparativo com Concorrentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <span className="ml-2">Analisando concorrentes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            Comparativo com Concorrentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchComparison} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { ranking, insights } = data;
  const mainSite = ranking.find(item => item.type === 'main');

  const getScoreBadgeVariant = (color: string) => {
    switch (color) {
      case 'green': return 'default';
      case 'yellow': return 'secondary';
      case 'red': return 'destructive';
      default: return 'outline';
    }
  };

  const getTrendIcon = () => {
    if (insights.scoreDifference > 10) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (insights.scoreDifference < -10) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  // Função para obter cor do selo baseada na nota
  const getScoreBadge = (score: number) => {
    if (score >= 88) return '🟢 Excelente';
    if (score >= 70) return '🟡 Bom';
    return '🔴 Precisa melhorar';
  };
  
  // Função para obter mensagem de performance
  const getPerformanceMessage = (score: number, isMain: boolean) => {
    if (isMain) return 'Seu site';
    if (score >= 88) return 'Site muito bem otimizado';
    if (score >= 70) return 'Site com boa performance';
    return 'Site com oportunidades de melhoria';
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Insights Overview */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Trophy className="w-5 h-5" />
              Posição no Ranking
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Compare seu hotel com concorrentes usando o Score 2.0. Veja onde você está no ranking e identifique oportunidades de melhoria.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600 mb-1">
                {mainSite?.position || 'N/A'}º
              </div>
              <p className="text-sm text-gray-600">Posição Geral</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getTrendIcon()}
                <span className="text-2xl font-bold">
                  {insights.scoreDifference > 0 ? '+' : ''}{insights.scoreDifference}
                </span>
              </div>
              <p className="text-sm text-gray-600">vs Média dos Concorrentes</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {insights.betterThanCount}
              </div>
              <p className="text-sm text-gray-600">Concorrentes Superados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" title="Pesos, gates e penalidades idênticos à Análise Básica.">
            <Trophy className="h-5 w-5" />
            Concorrentes (Análise Básica)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Posição
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ranking baseado na pontuação Score 2.0</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-3">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Hotel
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Nome do domínio e link para o site</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-3">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Score 2.0
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Pontuação de 0 a 100 baseada em performance, SEO, segurança e usabilidade mobile</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-3">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Diferença
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Diferença de pontos em relação ao seu hotel</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="text-left p-3">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        Status
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Avaliação qualitativa da performance e limitadores identificados</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item) => {
                  const mainSite = ranking.find(s => s.type === 'main');
                  const scoreDelta = mainSite ? item.score - mainSite.score : 0;
                  const deltaColor = scoreDelta > 2 ? 'text-red-600' : scoreDelta < -2 ? 'text-green-600' : 'text-gray-500';
                  const deltaIcon = scoreDelta > 2 ? '↑' : scoreDelta < -2 ? '↓' : '~';
                  const isMainSite = item.type === 'main';
                  
                  return (
                    <tr key={item.id} className={`border-b hover:bg-gray-50 ${isMainSite ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.medal}</span>
                          <span className="font-semibold text-lg">#{item.position}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{new URL(item.url).hostname.replace('www.', '')}</span>
                            {isMainSite && <Badge className="bg-blue-100 text-blue-800 text-xs">Seu Hotel</Badge>}
                          </div>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate max-w-xs">
                            {item.url}
                          </a>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{item.score}</span>
                            <span className="text-sm text-gray-600">/100</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-xs text-gray-600">{getScoreBadge(item.score)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Classificação baseada na pontuação: 88+ Excelente, 70+ Bom, &lt;70 Precisa melhorar</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="p-3">
                        {!isMainSite ? (
                          <div className="flex flex-col gap-1">
                            <span className={`font-semibold ${deltaColor}`}>
                              {deltaIcon} {Math.abs(scoreDelta)} pontos
                            </span>
                            <span className="text-xs text-gray-600">
                              {scoreDelta > 0 ? 'Acima de você' : scoreDelta < 0 ? 'Abaixo de você' : 'Mesmo nível'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 font-medium">Referência</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{getPerformanceMessage(item.score, isMainSite)}</span>
                          {item.basicScore?.gates?.reasons && item.basicScore.gates.reasons.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded cursor-help">
                                  ⚠️ {item.basicScore.gates.reasons.length} limitador{item.basicScore.gates.reasons.length > 1 ? 'es' : ''}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-1">
                                  <p className="font-semibold">Problemas que limitam a pontuação:</p>
                                  {item.basicScore.gates.reasons.slice(0, 3).map((reason, idx) => (
                                    <p key={idx} className="text-xs">• {reason}</p>
                                  ))}
                                  {item.basicScore.gates.reasons.length > 3 && (
                                    <p className="text-xs text-gray-400">...e mais {item.basicScore.gates.reasons.length - 3}</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Resumo comparativo */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              {(() => {
                const mainSite = ranking.find(s => s.type === 'main');
                if (!mainSite) return 'Dados do site principal não disponíveis.';
                
                const competitors = ranking.filter(s => s.type === 'competitor');
                const betterThanCount = competitors.filter(c => c.score < mainSite.score).length;
                const worseThanCount = competitors.filter(c => c.score > mainSite.score).length;
                
                const status = betterThanCount > worseThanCount ? 'à frente' : 'atrás';
                const count = Math.max(betterThanCount, worseThanCount);
                
                // Calcular principais diferenças
                const differences = [];
                const avgCompetitorLcp = competitors.reduce((sum, c) => sum + (c.basicInputs?.lcp || 0), 0) / competitors.length;
                const avgCompetitorWeight = competitors.reduce((sum, c) => sum + (c.basicInputs?.pageWeight || 0), 0) / competitors.length;
                
                if (mainSite.basicInputs?.lcp && avgCompetitorLcp) {
                  const lcpDiff = mainSite.basicInputs.lcp - avgCompetitorLcp;
                  if (Math.abs(lcpDiff) > 0.5) {
                    differences.push(`LCP ${lcpDiff > 0 ? '+' : ''}${lcpDiff.toFixed(1)}s`);
                  }
                }
                
                if (mainSite.basicInputs?.pageWeight && avgCompetitorWeight) {
                  const weightDiff = (mainSite.basicInputs.pageWeight - avgCompetitorWeight) / 1024 / 1024;
                  if (Math.abs(weightDiff) > 0.5) {
                    differences.push(`página ${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)}MB`);
                  }
                }
                
                // Verificar gates específicos dos concorrentes
                const competitorsWithoutHttps = competitors.filter(c => 
                  c.basicScore?.gates?.reasons?.some(r => r.includes('HTTPS'))
                );
                if (competitorsWithoutHttps.length > 0) {
                  differences.push(`sem HTTPS (${competitorsWithoutHttps.map(c => new URL(c.url).hostname).join(', ')})`);
                }
                
                const diffText = differences.length > 0 ? ` Principais diferenças: ${differences.slice(0, 3).join(', ')}.` : '';
                
                return `Seu site está ${status} de ${count} concorrente${count !== 1 ? 's' : ''}.${diffText}`;
              })()
            }
            </p>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            A comparação privilegia mobile e usa os mesmos critérios da sua nota básica.
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Resumo da Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Pontos Fortes</h4>
              <ul className="space-y-2 text-sm">
                {insights.isAboveAverage && (
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Performance acima da média do mercado
                  </li>
                )}
                {insights.betterThanCount > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Supera {insights.betterThanCount} concorrente{insights.betterThanCount > 1 ? 's' : ''}
                  </li>
                )}
                {mainSite && mainSite.position <= 2 && (
                  <li className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    Entre os 2 melhores do ranking
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Oportunidades</h4>
              <ul className="space-y-2 text-sm">
                {!insights.isAboveAverage && (
                  <li className="flex items-center gap-2">
                    <span className="text-amber-600">⚠</span>
                    Performance abaixo da média ({insights.averageCompetitorScore})
                  </li>
                )}
                {mainSite && mainSite.position > 2 && (
                  <li className="flex items-center gap-2">
                    <span className="text-amber-600">⚠</span>
                    Potencial para subir no ranking
                  </li>
                )}
                {insights.scoreDifference < 0 && (
                  <li className="flex items-center gap-2">
                    <span className="text-red-600">✗</span>
                    Precisa melhorar {Math.abs(insights.scoreDifference)} pontos
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}