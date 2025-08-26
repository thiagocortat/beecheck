'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Zap, Globe, Shield, Image, Cpu, Palette, Search, Smartphone } from 'lucide-react'
import { AdvancedAuditResult } from '@/types/advanced'
import { HumanizedCards } from '@/components/advanced/HumanizedCards'

interface AdvancedAnalysisProps {
  reportId?: string
}

export function AdvancedAnalysis({ reportId }: AdvancedAnalysisProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AdvancedAuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAdvancedScan = async () => {
    if (!url) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/advanced-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      
      if (!response.ok) {
        throw new Error('Falha na análise avançada')
      }
      
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Análise Avançada com Playwright
          </CardTitle>
          <CardDescription>
            Auditoria técnica profunda com métricas de performance, acessibilidade, SEO e PWA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://exemplo.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={handleAdvancedScan} 
              disabled={loading || !url}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                'Analisar'
              )}
            </Button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle>Score Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  <span className={getScoreColor(result.overallScore)}>
                    {result.overallScore}/100
                  </span>
                </div>
                <Badge variant={getScoreBadgeVariant(result.overallScore)}>
                  {result.overallScore >= 80 ? 'Excelente' : 
                   result.overallScore >= 60 ? 'Bom' : 'Precisa Melhorar'}
                </Badge>
              </div>
              <Progress value={result.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          {/* Detailed Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Cpu className="h-4 w-4" />
                  Performance & Rede
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.perfNet)}>
                    {result.scores.perfNet}
                  </span>
                </div>
                <Progress value={result.scores.perfNet} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  TTFB: {result.sample.timings.ttfb_ms}ms
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  Recursos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.resources)}>
                    {result.scores.resources}
                  </span>
                </div>
                <Progress value={result.scores.resources} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.resources.requests_total} requisições
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" />
                  Cache & CDN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.cacheCdn)}>
                    {result.scores.cacheCdn}
                  </span>
                </div>
                <Progress value={result.scores.cacheCdn} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  CDN: {result.sample.cacheCdn.cdn?.vendor || 'Não detectado'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Image className="h-4 w-4" />
                  Imagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.images)}>
                    {result.scores.images}
                  </span>
                </div>
                <Progress value={result.scores.images} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.images.total} imagens, {result.sample.images.webp_pct}% WebP
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  Acessibilidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.a11y)}>
                    {result.scores.a11y}
                  </span>
                </div>
                <Progress value={result.scores.a11y} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.a11y.issues_total} problemas
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Search className="h-4 w-4" />
                  SEO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.seo)}>
                    {result.scores.seo}
                  </span>
                </div>
                <Progress value={result.scores.seo} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.seo.indexable ? 'Indexável' : 'Não indexável'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4" />
                  PWA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.pwa)}>
                    {result.scores.pwa}
                  </span>
                </div>
                <Progress value={result.scores.pwa} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.pwa.a2hsReady ? 'A2HS Ready' : 'Não PWA'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4" />
                  Fontes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.fonts)}>
                    {result.scores.fonts}
                  </span>
                </div>
                <Progress value={result.scores.fonts} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.fonts.total} fontes
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  Terceiros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getScoreColor(result.scores.thirdParties)}>
                    {result.scores.thirdParties}
                  </span>
                </div>
                <Progress value={result.scores.thirdParties} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {result.sample.thirdParties.byDomain.length} domínios
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Humanized Analysis Cards */}
          <div className="space-y-4">
            <HumanizedCards reportData={{ pages: [result.sample] }} />
          </div>



          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Timing de Rede</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>DNS: {result.sample.timings.dns_ms}ms</li>
                    <li>Conexão: {result.sample.timings.connect_ms}ms</li>
                    <li>TLS: {result.sample.timings.tls_ms}ms</li>
                    <li>TTFB: {result.sample.timings.ttfb_ms}ms</li>
                    <li>Long Tasks: {result.sample.timings.longTasks_count}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recursos por Tipo</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>JavaScript: {Math.round(result.sample.resources.bytes.js / 1024)}KB</li>
                    <li>CSS: {Math.round(result.sample.resources.bytes.css / 1024)}KB</li>
                    <li>Imagens: {Math.round(result.sample.resources.bytes.img / 1024)}KB</li>
                    <li>Fontes: {Math.round(result.sample.resources.bytes.font / 1024)}KB</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}