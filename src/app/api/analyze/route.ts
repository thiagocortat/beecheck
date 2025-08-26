import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { analyzeWebsite } from '@/lib/analysis-worker'

const analyzeSchema = z.object({
  url: z.string().url('URL inválida'),
  competitors: z.array(z.string().url()).max(3, 'Máximo 3 concorrentes').optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, competitors } = analyzeSchema.parse(body)
    
    // Create report record
    const report = await prisma.report.create({
      data: {
        url,
        status: 'pending'
      }
    })
    
    // Process analysis directly (without Redis queue)
    try {
      await analyzeWebsite({ reportId: report.id, url, competitors })
      
      return NextResponse.json({
        success: true,
        reportId: report.id,
        message: 'Análise concluída com sucesso!'
      })
    } catch (analysisError) {
      console.error('Analysis failed:', analysisError)
      
      // Update report status to failed
      await prisma.report.update({
        where: { id: report.id },
        data: { status: 'failed' }
      })
      
      return NextResponse.json({
        success: false,
        reportId: report.id,
        error: 'Falha na análise do site'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Analysis request failed:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: error.issues 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor. Tente novamente em alguns minutos.' 
      },
      { status: 500 }
    )
  }
}