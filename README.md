# BeeCheck 🐝

Uma ferramenta completa de análise de performance e SEO para hotéis, com foco em Core Web Vitals e comparação com concorrentes.

## 🚀 Funcionalidades

- **Análise Completa**: Core Web Vitals, Performance e SEO
- **Scoring Inteligente**: Sistema de pontuação de 0-100 com pesos personalizados
- **Comparação com Concorrentes**: Análise comparativa com até 3 concorrentes
- **Relatórios Executivos**: Relatórios em PDF com insights acionáveis
- **Processamento Assíncrono**: Análises em background com Redis/BullMQ
- **Interface Moderna**: UI responsiva com shadcn/ui e Tailwind CSS

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Prisma, PostgreSQL
- **Queue**: Redis, BullMQ
- **APIs**: Google PageSpeed Insights
- **PDF**: Puppeteer
- **Deploy**: Vercel (recomendado)

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL
- Redis
- Google PageSpeed Insights API Key

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/beecheck.git
cd beecheck
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/beecheck?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Google PageSpeed Insights API
PAGESPEED_API_KEY="sua_api_key_aqui"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="BeeCheck"
```

4. **Configure o banco de dados**
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. **Inicie os serviços**

**Terminal 1 - Aplicação:**
```bash
npm run dev
```

**Terminal 2 - Worker (processamento de análises):**
```bash
npm run worker
```

## 🔑 Obtendo API Key do Google PageSpeed

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API "PageSpeed Insights API"
4. Crie uma credencial do tipo "API Key"
5. Adicione a chave no arquivo `.env`

## 📊 Como Usar

### Análise Simples
1. Acesse `http://localhost:3000`
2. Insira a URL do hotel
3. Clique em "Analisar"
4. Aguarde os resultados

### Análise Comparativa
1. Insira a URL principal
2. Adicione até 3 URLs de concorrentes
3. Clique em "Analisar"
4. Veja o ranking e comparação

### Relatórios PDF
- Clique em "Baixar Relatório" na página de resultados
- Relatório executivo com insights acionáveis
- Anexo técnico com métricas detalhadas

## 🏗️ Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── api/               # API Routes
│   │   ├── analyze/       # Análise individual
│   │   ├── compare/       # Análise comparativa
│   │   └── reports/       # Busca e download de relatórios
│   ├── reports/[id]/      # Página de relatório
│   └── page.tsx           # Página principal
├── components/            # Componentes React
├── lib/                   # Utilitários e lógica de negócio
│   ├── analysis-worker.ts # Worker BullMQ
│   ├── pagespeed.ts       # Cliente Google PageSpeed
│   ├── scoring.ts         # Sistema de pontuação
│   └── report-generator.ts # Geração de relatórios
prisma/
├── schema.prisma          # Schema do banco
scripts/
├── seed.ts               # Dados de exemplo
```

## 📈 Sistema de Pontuação

O BeeCheck usa um sistema de pontuação ponderado:

- **Core Web Vitals (40%)**
  - LCP (Largest Contentful Paint)
  - CLS (Cumulative Layout Shift)
  - INP (Interaction to Next Paint)

- **Performance (35%)**
  - TTFB (Time to First Byte)
  - Tamanho da página
  - Score do Lighthouse

- **SEO (25%)**
  - Meta tags
  - HTTPS
  - Schema markup
  - CTA de reserva

## 🔄 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia aplicação
npm run worker           # Inicia worker de análises

# Banco de dados
npm run db:generate      # Gera cliente Prisma
npm run db:push          # Aplica schema ao banco
npm run db:migrate       # Cria migração
npm run db:seed          # Popula com dados de exemplo

# Build e deploy
npm run build            # Build para produção
npm run start            # Inicia versão de produção
npm run lint             # Verifica código
```

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório no Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Variáveis de Ambiente para Produção

```env
DATABASE_URL="sua_url_postgresql_producao"
REDIS_URL="sua_url_redis_producao"
PAGESPEED_API_KEY="sua_api_key"
NEXT_PUBLIC_APP_URL="https://seu-dominio.com"
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🐛 Problemas Conhecidos

- **Timeout em análises**: Algumas URLs podem demorar mais que o esperado
- **Rate limiting**: Google PageSpeed tem limites de requisições
- **PDF em produção**: Puppeteer pode precisar de configuração específica

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique os [Issues](https://github.com/seu-usuario/beecheck/issues) existentes
2. Crie um novo issue com detalhes do problema
3. Inclua logs e informações do ambiente

---

**Desenvolvido com ❤️ para a indústria hoteleira brasileira**
