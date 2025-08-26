// src/lib/normalize-basic.ts
import type { BasicInputs } from "./basic-score";

export function toBasicInputs(report: any): BasicInputs {
  // tenta mobile field (CrUX via PSI); senão lab; senão desktop
  const m = report?.mobile ?? report?.field?.mobile ?? report?.lab?.mobile ?? report?.desktop ?? {};
  const perf = m.metrics || m; // ser tolerante ao shape

  const pageWeight_kb =
    (perf.pageWeight_kb) ??
    (perf.totalByteWeight_kb) ??
    (typeof perf.totalByteWeight === 'number' ? Math.round(perf.totalByteWeight/1024) : undefined) ??
    report?.pageSizeMobile ?? // Fallback para estrutura do banco
    report?.pageSizeDesktop;

  const inputs: BasicInputs = {
    LCP_ms: perf.LCP_ms ?? perf.lcp_ms ?? perf.lcp ?? report?.lcpMobile ?? report?.lcpDesktop,
    INP_ms: perf.INP_ms ?? perf.inp_ms ?? perf.inp ?? report?.inpMobile ?? report?.inpDesktop,
    CLS:    perf.CLS ?? perf.cls ?? report?.clsMobile ?? report?.clsDesktop,
    TTFB_ms: perf.TTFB_ms ?? perf.ttfb ?? report?.ttfbMobile ?? report?.ttfbDesktop,
    pageWeight_kb,
    requests: perf.requests ?? perf.requestCount,
    mobileReady: {
      viewportMeta: report?.audits?.viewportMeta ?? m?.audits?.viewportMeta ?? true,
      tapTargetsOk: report?.audits?.tapTargetsOk ?? m?.audits?.tapTargetsOk ?? true,
      ctaAboveFold: report?.audits?.ctaAboveFold ?? m?.audits?.ctaAboveFold ?? true
    },
    seoKey: {
      indexable: report?.seo?.indexable ?? report?.hasTitle ?? true, // Fallback para hasTitle
      https: (report?.url ? String(report.url).startsWith('https://') : true) || report?.hasHttps,
      titleOk: report?.seo?.titleOk ?? report?.hasTitle ?? true,
      metaOk: report?.seo?.metaOk ?? report?.hasDescription ?? true,
      h1Unique: report?.seo?.h1Unique ?? report?.hasH1 ?? true
    },
    hasBlockingThirdParty: report?.thirdParties?.blocking ?? false
  };
  return inputs;
}