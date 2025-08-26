'use client'

import { toBasicInputs } from "@/lib/normalize-basic";
import { computeBasicScore } from "@/lib/basic-score";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface BasicScoreCardProps {
  report: any;
}

export function BasicScoreCard({ report }: BasicScoreCardProps) {
  const i = toBasicInputs(report);
  const s = computeBasicScore(i);
  
  // Log de confirmação da UI conforme especificado no patch
  console.log('[BeeCheck][Basica] UI atualizada');

  return (
    <TooltipProvider>
      <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger className="cursor-help">
            <div className="text-3xl font-semibold">{s.final}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p>Pontuação final calculada com base em Core Web Vitals, SEO, e penalidades por problemas críticos. Quanto maior, melhor a experiência do usuário.</p>
          </TooltipContent>
        </Tooltip>
        <div className="text-xl">{s.label}</div>
        <div className="text-sm text-muted-foreground">
          {s.final >= 88 && s.gates.reasons.length === 0 ? 'Excelente! Site otimizado' : 
           s.final >= 70 ? 'Bom desempenho, mas pode melhorar' : 
           'Precisa de melhorias urgentes'}
        </div>
      </div>

      {s.gates.reasons.length > 0 && (
        <div className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-yellow-800">⚠️ Problemas que limitam sua nota:</span>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-yellow-600" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Gates são critérios mínimos de qualidade. Quando não atendidos, limitam a pontuação máxima possível, mesmo que outros aspectos estejam bons.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-1 text-yellow-700">
            {s.gates.reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-yellow-600">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-700">Como calculamos sua nota:</div>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-gray-500" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Cada categoria contribui para a nota final. Performance e SEO têm maior peso, pois impactam diretamente a experiência do usuário e visibilidade.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm">
          {[
            ['🚀 Velocidade no Celular', s.subscores.cwv, 'Quão rápido seu site carrega e responde no mobile'],
            ['📱 Tamanho da Página', s.subscores.weight, 'Se sua página é leve para carregar rápido no 4G'],
            ['⚡ Resposta do Servidor', s.subscores.ttfb, 'Velocidade do seu servidor para começar a enviar a página'],
            ['📲 Experiência Mobile', s.subscores.mobile, 'Se o site funciona bem em telas pequenas'],
            ['🔍 Visibilidade no Google', s.subscores.seo, 'Se o Google consegue encontrar e entender seu site'],
          ].map(([label, value, description]) => (
            <div key={label as string} className="space-y-1">
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <span className="font-medium">{label}</span>
                    <HelpCircle className="w-3 h-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>{description}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-gray-500">{Math.round(value as number)}/100</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    (value as number) >= 80 ? 'bg-green-500' : 
                    (value as number) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} 
                  style={{ width: `${Math.round(value as number)}%` }} 
                />
              </div>
              <div className="text-xs text-gray-600">{description}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-gray-600 mt-4 pt-4 border-t bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-medium">💡 Como funciona o Score 2.0:</div>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <p>O Score 2.0 é uma evolução que considera não apenas métricas técnicas, mas também o impacto real na experiência do usuário e nos resultados de negócio.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="space-y-1">
          <div>• <strong>Mobile First:</strong> Priorizamos a experiência no celular (70% das reservas)</div>
          <div>• <strong>Critérios Essenciais:</strong> HTTPS e indexação são obrigatórios</div>
          <div>• <strong>Nota Final:</strong> Combinamos todos os fatores com foco no que realmente importa para hotéis</div>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
}