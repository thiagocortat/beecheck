// Teste via API para verificar consistência
const https = require('https');
const http = require('http');

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/test-score',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
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
    req.write(postData);
    req.end();
  });
}

// Dados do relatório da Pousada Suíça Mineira
const reportData = {
  mobile: {
    lcp: 3728.875730338807,
    cls: 0.1432099600181703,
    inp: 235.8493060989654,
    ttfb: 520.0486405568428,
    pageSize: 1961
  },
  desktop: {
    lcp: null, // Não temos dados desktop
    cls: null,
    inp: null,
    ttfb: null,
    pageSize: null
  },
  seo: {
    hasTitle: true,
    hasDescription: true,
    hasH1: true,
    hasHttps: true,
    hasSitemap: null,
    hasRobots: null,
    hasCanonical: null,
    hasSchema: null,
    hasBookingCta: null
  },
  url: 'https://www.pousadasuicamineira.com.br/'
};

console.log('=== TESTE DE CONSISTÊNCIA DO SCORE 2.0 ===');
console.log('URL:', reportData.url);
console.log('\n--- Dados de entrada ---');
console.log('Mobile LCP:', reportData.mobile.lcp, 'ms');
console.log('Mobile CLS:', reportData.mobile.cls);
console.log('Mobile INP:', reportData.mobile.inp, 'ms');
console.log('Mobile TTFB:', reportData.mobile.ttfb, 'ms');
console.log('Mobile Page Size:', reportData.mobile.pageSize, 'KB');
console.log('SEO - Title:', reportData.seo.hasTitle);
console.log('SEO - Description:', reportData.seo.hasDescription);
console.log('SEO - H1:', reportData.seo.hasH1);
console.log('SEO - HTTPS:', reportData.seo.hasHttps);

async function testScore() {
  try {
    const result = await makeRequest('/api/test-score', reportData);
    console.log('\n=== RESULTADO DO TESTE ===');
    console.log('Score final calculado:', result.finalScore);
    console.log('Score salvo no banco:', 80); // Do comando anterior
    
    if (result.finalScore !== 80) {
      console.log('\n🚨 INCONSISTÊNCIA DETECTADA!');
      console.log('Diferença:', Math.abs(result.finalScore - 80));
    } else {
      console.log('\n✅ Scores consistentes!');
    }
    
  } catch (error) {
    console.error('Erro ao testar score:', error);
  }
}

testScore();