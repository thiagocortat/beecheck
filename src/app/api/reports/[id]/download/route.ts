import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Dynamic imports for different environments
const getPuppeteer = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Use puppeteer-core with chromium-min for Vercel
    const puppeteer = await import('puppeteer-core');
    const chromium = await import('@sparticuz/chromium-min');
    return { puppeteer: puppeteer.default, chromium: chromium.default };
  } else {
    // Development: Use regular puppeteer with bundled Chrome
    const puppeteer = await import('puppeteer');
    return { puppeteer: puppeteer.default, chromium: null };
  }
};

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
      const isProduction = process.env.NODE_ENV === 'production';
      const { puppeteer, chromium } = await getPuppeteer();
      
      if (isProduction && chromium) {
        // Production: Use puppeteer-core with chromium-min for Vercel
        const brotliPath = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar';
        
        browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--single-process'
          ],
          executablePath: await chromium.executablePath(brotliPath),
          headless: true
        });
      } else {
        // Development: Use regular puppeteer with bundled Chrome
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ],
          headless: true
        });
      }

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

      return new NextResponse(Buffer.from(pdf), {
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