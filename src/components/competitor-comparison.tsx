'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getScoreColor } from '@/lib/scoring';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Insights Overview */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Trophy className="w-5 h-5" />
            Posição no Ranking
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
          <CardTitle>🏆 Ranking Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ranking.map((item) => {
              const scoreColor = getScoreColor(item.score);
              const isMainSite = item.type === 'main';
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isMainSite 
                      ? 'bg-amber-50 border-amber-200 shadow-md' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{item.medal}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {new URL(item.url).hostname.replace('www.', '')}
                        </span>
                        {isMainSite && (
                          <Badge variant="outline" className="text-xs">
                            Seu Site
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={item.score} className="w-32 h-2" />
                        <span className="text-sm text-gray-600">{item.score}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold mb-1" style={{ 
                      color: scoreColor === 'green' ? '#10b981' : 
                             scoreColor === 'yellow' ? '#f59e0b' : '#ef4444' 
                    }}>
                      {item.score}
                    </div>
                    <Badge variant={getScoreBadgeVariant(scoreColor)} className="text-xs">
                      {item.position}º lugar
                    </Badge>
                  </div>
                </div>
              );
            })}
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
  );
}