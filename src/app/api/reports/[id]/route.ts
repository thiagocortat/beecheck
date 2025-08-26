import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        competitors: {
          orderBy: { rank: 'asc' }
        }
      }
    })
    
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Relatório não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      report
    })
    
  } catch (error) {
    console.error('Failed to fetch report:', error)
    
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}