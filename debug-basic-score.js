// Debug script para verificar o que está acontecendo com o BasicScoreCard
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function debugBasicScore() {
  try {
    console.log('=== DEBUG BASIC SCORE CARD ===');
    
    // Buscar o relatório da Pousada Suíça Mineira
    const reportResponse = await makeRequest('/api/reports/cmet0qkod000iz0fkvmaqosny');
    
    if (reportResponse.success) {
      const report = reportResponse.report;
      console.log('\n--- Dados do relatório (como recebido pela página principal) ---');
      console.log('URL:', report.url);
      console.log('Score salvo:', report.score);
      console.log('LCP Mobile:', report.lcpMobile);
      console.log('CLS Mobile:', report.clsMobile);
      console.log('INP Mobile:', report.inpMobile);
      console.log('TTFB Mobile:', report.ttfbMobile);
      console.log('Page Size Mobile:', report.pageSizeMobile);
      console.log('Has Title:', report.hasTitle);
      console.log('Has Description:', report.hasDescription);
      console.log('Has H1:', report.hasH1);
      console.log('Has HTTPS:', report.hasHttps);
      
      console.log('\n--- Estrutura esperada pelo toBasicInputs ---');
      console.log('report.mobile:', report.mobile || 'UNDEFINED');
      console.log('report.field:', report.field || 'UNDEFINED');
      console.log('report.lab:', report.lab || 'UNDEFINED');
      console.log('report.desktop:', report.desktop || 'UNDEFINED');
      console.log('report.seo:', report.seo || 'UNDEFINED');
      
      console.log('\n--- Testando toBasicInputs via API ---');
      const testData = {
        // Estrutura atual do banco
        url: report.url,
        score: report.score,
        lcpMobile: report.lcpMobile,
        clsMobile: report.clsMobile,
        inpMobile: report.inpMobile,
        ttfbMobile: report.ttfbMobile,
        pageSizeMobile: report.pageSizeMobile,
        hasTitle: report.hasTitle,
        hasDescription: report.hasDescription,
        hasH1: report.hasH1,
        hasHttps: report.hasHttps
      };
      
      const testResponse = await fetch('http://localhost:3000/api/test-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      const testResult = await testResponse.json();
      console.log('Score calculado com dados do banco:', testResult.finalScore || 'ERRO');
      
    } else {
      console.error('Erro ao buscar relatório:', reportResponse.error);
    }
    
  } catch (error) {
    console.error('Erro no debug:', error);
  }
}

debugBasicScore();