// src/lib/basic-score.ts
export type BasicInputs = {
  LCP_ms?: number; INP_ms?: number; CLS?: number;
  TTFB_ms?: number; pageWeight_kb?: number; requests?: number;
  mobileReady?: { viewportMeta?: boolean; tapTargetsOk?: boolean; ctaAboveFold?: boolean };
  seoKey?: { indexable?: boolean; https?: boolean; titleOk?: boolean; metaOk?: boolean; h1Unique?: boolean };
  hasBlockingThirdParty?: boolean;
};
export type GateResult = { cap: number; reasons: string[] };
export type Penalty = { id: string; pts: number; reason: string };
export type ScoreDetail = {
  raw: number; afterGates: number; afterPenalties: number; final: number;
  gates: GateResult; penalties: Penalty[];
  subscores: { cwv: number; weight: number; ttfb: number; mobile: number; seo: number };
  label: '🟢' | '🟡' | '🔴';
};

const clamp = (n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const lerp = (x:number, x0:number, x1:number, y0:number, y1:number)=>{
  if (x<=x0) return y0; if (x>=x1) return y1;
  const t=(x-x0)/(x1-x0); return y0 + t*(y1-y0);
};
const scoreLowerBetter=(v:number|undefined, good:number, ok:number, bad:number)=>{
  if (v==null) return 50;
  if (v<=good) return 100;
  if (v<=ok)   return lerp(v, good, ok, 100, 75);
  if (v<=bad)  return lerp(v, ok, bad, 75, 50);
  return 20;
};
const scoreCLS=(v:number|undefined)=>{
  if (v==null) return 50;
  if (v<=0.10) return 100;
  if (v<=0.25) return lerp(v, 0.10, 0.25, 100, 60);
  return 25;
};

export function computeSubscores(i: BasicInputs) {
  const cwv = clamp(
    scoreLowerBetter(i.LCP_ms, 2500, 4000, 6000)*0.5 +
    scoreLowerBetter(i.INP_ms, 200, 500, 800)*0.3 +
    scoreCLS(i.CLS)*0.2
  );
  const weight = clamp(
    scoreLowerBetter(i.pageWeight_kb, 1500, 2500, 4000)*0.7 +
    scoreLowerBetter(i.requests, 60, 80, 120)*0.3
  );
  const ttfb   = scoreLowerBetter(i.TTFB_ms, 800, 1800, 2500);
  const mobile = clamp(
    (i.mobileReady?.viewportMeta===false ? 40 : 100)*0.5 +
    (i.mobileReady?.tapTargetsOk===false ? 60 : 100)*0.2 +
    (i.mobileReady?.ctaAboveFold===false ? 70 : 100)*0.3
  );
  const seo = clamp(
    (i.seoKey?.indexable===false ? 30 : 100)*0.35 +
    (i.seoKey?.https===false ? 40 : 100)*0.25 +
    (i.seoKey?.titleOk===false ? 70 : 100)*0.2 +
    (i.seoKey?.metaOk===false ? 70 : 100)*0.2
  );
  return { cwv, weight, ttfb, mobile, seo };
}

export function applyGates(i: BasicInputs): GateResult {
  const reasons:string[]=[]; let cap=100;
  if (i.seoKey?.https===false)     { cap=Math.min(cap,40); reasons.push('Sem HTTPS'); }
  if (i.seoKey?.indexable===false) { cap=Math.min(cap,45); reasons.push('Página não indexável'); }
  if (i.LCP_ms!=null && i.LCP_ms>4000) { cap=Math.min(cap,65); reasons.push('LCP > 4s (lento no celular)'); }
  if (i.INP_ms!=null && i.INP_ms>500)  { cap=Math.min(cap,65); reasons.push('INP > 500ms (toque lento)'); }
  if (i.CLS!=null   && i.CLS>0.25)     { cap=Math.min(cap,70); reasons.push('CLS > 0,25 (tela instável)'); }
  if (i.pageWeight_kb!=null && i.pageWeight_kb>4000){ cap=Math.min(cap,75); reasons.push('Página > 4MB'); }
  if (i.requests!=null      && i.requests>120)      { cap=Math.min(cap,80); reasons.push('Muitos arquivos (>120)'); }
  if (i.mobileReady?.viewportMeta===false){ cap=Math.min(cap,70); reasons.push('Sem viewport mobile'); }
  if (i.mobileReady?.ctaAboveFold===false){ cap=Math.min(cap,85); reasons.push('CTA fora da primeira dobra'); }
  return { cap, reasons };
}

export function computePenalties(i: BasicInputs): Penalty[] {
  const p:Penalty[]=[];
  if (i.pageWeight_kb!=null && i.pageWeight_kb>2000) p.push({id:'heavy-page',pts:-5,reason:'Página pesada (>2MB)'});
  if (i.requests!=null && i.requests>80)             p.push({id:'too-many-requests',pts:-3,reason:'Muitos arquivos (>80)'});
  if (i.TTFB_ms!=null && i.TTFB_ms>1800)            p.push({id:'slow-ttfb',pts:-5,reason:'Servidor lento (>1800ms)'});
  if (i.hasBlockingThirdParty)                      p.push({id:'blocking-3p',pts:-4,reason:'Script de terceiros bloqueando'});
  if (i.seoKey?.titleOk===false || i.seoKey?.metaOk===false) p.push({id:'weak-snippets',pts:-3,reason:'Título/descrição fracos'});
  if (i.seoKey?.h1Unique===false)                   p.push({id:'h1-dup',pts:-2,reason:'H1 ausente/duplicado'});
  if (i.mobileReady?.tapTargetsOk===false)          p.push({id:'tap-targets',pts:-3,reason:'Áreas de toque pequenas'});
  return p;
}

export function computeBasicScore(i: BasicInputs): ScoreDetail {
  const subscores = computeSubscores(i);
  const raw = clamp(subscores.cwv*0.45 + subscores.weight*0.20 + subscores.ttfb*0.15 + subscores.mobile*0.10 + subscores.seo*0.10);
  const gates = applyGates(i);
  const afterGates = Math.min(raw, gates.cap);
  const penaltySum = computePenalties(i).reduce((s,p)=>s+p.pts,0);
  const afterPenalties = clamp(afterGates + penaltySum);
  const final = clamp(Math.round(Math.pow(afterPenalties/100, 1.25) * 100)); // deflação no topo
  const label = (final>=88 && gates.reasons.length===0) ? '🟢' : (final>=70 ? '🟡' : '🔴');
  
  // Log de confirmação conforme especificado no patch
  console.log(`[BeeCheck][Basica] core aplicado - raw: ${raw.toFixed(1)}, teto: ${gates.cap}, final: ${final}, gates: [${gates.reasons.join(', ')}]`);
  
  return { raw, afterGates, afterPenalties, final, gates, penalties: computePenalties(i), subscores, label };
}