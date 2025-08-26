'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Search, TrendingUp, Smartphone, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { CompetitorComparison } from '@/components/competitor-comparison'
import { AdvancedAnalysis } from '@/components/advanced-analysis'
import { BasicScoreCard } from '@/components/basic/BasicScoreCard'

interface Report {
  id: string
  url: string
  status: string
  score?: number

  competitors?: Array<{
    url: string
    score: number
    rank: number
  }>
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [competitors, setCompetitors] = useState<string[]>(['', '', ''])
  const [showComparison, setShowComparison] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic')

  const normalizeUrl = (inputUrl: string): string => {
    const trimmed = inputUrl.trim()
    if (!trimmed) return ''
    
    // Add https:// if no protocol is specified
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`
    }
    
    return trimmed
  }

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('Por favor, insira uma URL válida')
      return
    }

    setIsAnalyzing(true)
    setReport(null)
    setShowComparison(false)

    // Normalize URLs
    const normalizedUrl = normalizeUrl(url)
    const validCompetitors = competitors
      .map(comp => normalizeUrl(comp))
      .filter(comp => comp && comp !== normalizedUrl)
    const hasCompetitors = validCompetitors.length > 0

    try {
      const endpoint = hasCompetitors ? '/api/compare' : '/api/analyze'
      const body = hasCompetitors 
        ? { mainUrl: normalizedUrl, competitors: validCompetitors }
        : { url: normalizedUrl }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        setReportId(result.reportId)
        setShowComparison(hasCompetitors)
        toast.success(
          hasCompetitors 
            ? `Análise comparativa iniciada! Analisando ${validCompetitors.length + 1} sites...`
            : 'Análise iniciada! Aguarde os resultados...'
        )
        pollReport(result.reportId)
      } else {
        toast.error(result.error || 'Erro ao iniciar análise')
        setIsAnalyzing(false)
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.')
      setIsAnalyzing(false)
    }
  }

  const pollReport = async (id: string) => {
    const maxAttempts = 60 // 5 minutes
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/reports/${id}`)
        const data = await response.json()

        if (data.success && data.report) {
          const reportData = data.report
          
          if (reportData.status === 'completed') {
            setReport(reportData)
            setIsAnalyzing(false)
            toast.success('Análise concluída!')
            return
          }
          
          if (reportData.status === 'failed') {
            toast.error('Análise falhou. Tente novamente.')
            setIsAnalyzing(false)
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          toast.error('Análise demorou muito. Verifique novamente mais tarde.')
          setIsAnalyzing(false)
        }
      } catch (error) {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          toast.error('Erro ao verificar status da análise.')
          setIsAnalyzing(false)
        }
      }
    }

    poll()
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🐝 BeeCheck</h1>
          <p className="text-xl text-gray-600">Análise de Performance para Hotéis</p>
          <p className="text-sm text-gray-500 mt-2">
            Descubra como melhorar seu site e aumentar suas reservas
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <Button
              variant={activeTab === 'basic' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('basic')}
              className="mr-1"
            >
              Análise Básica
            </Button>
            <Button
              variant={activeTab === 'advanced' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('advanced')}
            >
              Análise Avançada
            </Button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'advanced' ? (
          <AdvancedAnalysis reportId={reportId || undefined} />
        ) : (
          <>
            {/* Analysis Form */}
            {!report && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Analisar Site do Hotel
                  </CardTitle>
                  <CardDescription>
                    Insira a URL do seu hotel e até 3 concorrentes para comparação
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="url">URL do seu hotel *</Label>
                <Input
                  id="url"
                  placeholder="https://seuhotel.com.br"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isAnalyzing}
                />
              </div>
              
              <div>
                <Label htmlFor="competitors">Concorrentes (opcional)</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Compare com até 3 concorrentes para ver seu posicionamento no mercado
                </p>
                {competitors.map((competitor, index) => (
                  <div key={index} className="mb-2">
                    <Input
                      placeholder={`URL do concorrente ${index + 1} (ex: https://concorrente.com)`}
                      value={competitor}
                      onChange={(e) => {
                        const newCompetitors = [...competitors]
                        newCompetitors[index] = e.target.value
                        setCompetitors(newCompetitors)
                      }}
                      disabled={isAnalyzing}
                      className="w-full mt-2"
                    />
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !url}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Iniciar Análise
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analisando seu site...</h3>
                <p className="text-gray-600 mb-4">
                  Estamos verificando performance, SEO e experiência mobile. Isso leva alguns minutos.
                </p>
                <Progress value={33} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {report && (
          <div className="space-y-6">
            {/* Basic Score 2.0 */}
            <Card>
              <CardHeader>
                <CardTitle>Análise Básica</CardTitle>
                <CardDescription>
                  Score 2.0 com foco mobile e critérios rigorosos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BasicScoreCard report={report} />
              </CardContent>
            </Card>



            {/* Competitor Comparison */}
            {showComparison && reportId && (
              <CompetitorComparison reportId={reportId} />
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                onClick={() => {
                  setReport(null)
                  setReportId(null)
                  setUrl('')
                  setCompetitors(['', '', ''])
                  setShowComparison(false)
                }}
                variant="outline"
                className="flex-1"
              >
                Nova Análise
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  if (reportId) {
                    window.open(`/api/reports/${reportId}/download`, '_blank')
                  }
                }}
                disabled={!reportId}
              >
                Baixar Relatório PDF
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
