'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { HumanCard, HumanLabel } from '@/types/humanized'
import { AdvancedSample } from '@/types/advanced'
import {
  pickMobileFirst,
  buildPerfNetCard,
  buildResourcesCard,
  buildCacheCdnCard,
  buildImagesCard,
  buildA11yCard,
  buildSeoCard,
  buildPwaCard,
  buildThirdPartiesCard
} from '@/lib/humanize'
import { Info } from 'lucide-react'

interface HumanizedCardsProps {
  reportData: {
    pages?: AdvancedSample[]
  }
  lcpMs?: number
  inpMs?: number
}

function getLabelColor(label: HumanLabel): string {
  switch (label) {
    case '🟢': return 'bg-green-100 text-green-800 border-green-200'
    case '🟡': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case '🔴': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function HumanCardComponent({ card }: { card: HumanCard }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`${getLabelColor(card.label)} text-lg px-2 py-1`}>
              {card.label}
            </Badge>
            <div title={card.lines.why} className="cursor-help">
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explicação em linguagem humana */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">O que é</h4>
            <p className="text-sm">{card.lines.what}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">Por que importa</h4>
            <p className="text-sm">{card.lines.why}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1">O que fazer agora</h4>
            <p className="text-sm font-medium">{card.lines.doNow}</p>
            {card.lines.detail && (
              <p className="text-xs text-muted-foreground italic mt-2">{card.lines.detail}</p>
            )}
          </div>
        </div>

        {/* Barras de progresso */}
        {card.bars && card.bars.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Métricas</h4>
            {card.bars.map((bar, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{bar.name}</span>
                  <span>
                    {bar.value.toFixed(bar.suffix === 'ms' ? 0 : 1)}
                    {bar.suffix || ''}
                    {bar.max && ` / ${bar.max}${bar.suffix || ''}`}
                  </span>
                </div>
                <Progress 
                  value={bar.max ? Math.min((bar.value / bar.max) * 100, 100) : bar.value} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        )}

        {/* Chips informativos */}
        {card.chips && card.chips.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Informações</h4>
            <div className="flex flex-wrap gap-2">
              {card.chips.map((chip, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {chip.name}: {chip.value}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HumanizedCards({ reportData, lcpMs, inpMs }: HumanizedCardsProps) {
  const sample = pickMobileFirst(reportData)
  
  if (!sample) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Nenhum dado de análise avançada disponível
          </p>
        </CardContent>
      </Card>
    )
  }

  const cards: HumanCard[] = [
    buildPerfNetCard(sample, lcpMs, inpMs),
    buildResourcesCard(sample),
    buildCacheCdnCard(sample),
    buildImagesCard(sample),
    buildA11yCard(sample),
    buildSeoCard(sample),
    buildPwaCard(sample),
    buildThirdPartiesCard(sample)
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Análise Humanizada</h2>
        <p className="text-muted-foreground">
          Entenda os resultados técnicos em linguagem simples
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <HumanCardComponent key={card.key} card={card} />
        ))}
      </div>
    </div>
  )
}