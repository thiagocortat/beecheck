import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return new NextResponse('Relatório não encontrado', { status: 404 });
    }

    if (report.status !== 'completed') {
      return new NextResponse('Relatório ainda não foi concluído', { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const htmlUrl = `${baseUrl}/api/reports/${id}/pdf`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      });

      const page = await browser.newPage();
      
      await page.goto(htmlUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      const domain = new URL(report.url).hostname.replace('www.', '');
      const filename = `beecheck-${domain}-${new Date().toISOString().split('T')[0]}.pdf`;

      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (puppeteerError) {
      if (browser) {
        await browser.close();
      }
      throw puppeteerError;
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return new NextResponse('Erro ao gerar PDF', { status: 500 });
  }
}