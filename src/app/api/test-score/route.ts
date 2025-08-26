import { NextRequest, NextResponse } from 'next/server'
import { toBasicInputs } from '@/lib/normalize-basic'
import { computeBasicScore } from '@/lib/basic-score'

export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    
    console.log('=== TESTE DE CONSISTÊNCIA DO SCORE 2.0 ===')
    console.log('URL:', reportData.url)
    console.log('\n--- Dados de entrada ---')
    console.log('Mobile LCP:', reportData.lcpMobile, 'ms')
    console.log('Mobile CLS:', reportData.clsMobile)
    console.log('Mobile INP:', reportData.inpMobile, 'ms')
    console.log('Mobile TTFB:', reportData.ttfbMobile, 'ms')
    console.log('Mobile Page Size:', reportData.pageSizeMobile, 'KB')
    console.log('SEO - Title:', reportData.hasTitle)
    console.log('SEO - Description:', reportData.hasDescription)
    console.log('SEO - H1:', reportData.hasH1)
    console.log('SEO - HTTPS:', reportData.hasHttps)
    
    const basicInputs = toBasicInputs(reportData)
    console.log('\n--- BasicInputs normalizados ---')
    console.log(JSON.stringify(basicInputs, null, 2))
    
    const basicScore = computeBasicScore(basicInputs)
    console.log('\n--- Score 2.0 calculado ---')
    console.log('Score final:', basicScore.final)
    console.log('Score raw:', basicScore.raw)
    console.log('After gates:', basicScore.afterGates)
    console.log('After penalties:', basicScore.afterPenalties)
    console.log('Gates cap:', basicScore.gates.cap)
    console.log('Gates reasons:', basicScore.gates.reasons)
    console.log('Label:', basicScore.label)
    
    console.log('\n--- Subscores ---')
    console.log('CWV:', basicScore.subscores.cwv.toFixed(1))
    console.log('Weight:', basicScore.subscores.weight.toFixed(1))
    console.log('TTFB:', basicScore.subscores.ttfb.toFixed(1))
    console.log('Mobile:', basicScore.subscores.mobile.toFixed(1))
    console.log('SEO:', basicScore.subscores.seo.toFixed(1))
    
    return NextResponse.json({
      success: true,
      basicInputs,
      basicScore,
      finalScore: basicScore.final
    })
    
  } catch (error) {
    console.error('Erro ao calcular score:', error)
    return NextResponse.json(
      { error: 'Erro ao calcular score', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}