import { test, expect } from "vitest";
import { computeBasicScore } from "./basic-score";

test("bom de verdade", () => {
  const s = computeBasicScore({
    LCP_ms: 2100,
    INP_ms: 120,
    CLS: 0.03,
    pageWeight_kb: 1200,
    requests: 55,
    seoKey: {
      https: true,
      indexable: true,
      titleOk: true,
      metaOk: true,
      h1Unique: true
    },
    mobileReady: {
      viewportMeta: true,
      tapTargetsOk: true,
      ctaAboveFold: true
    }
  });
  expect(s.final).toBeGreaterThanOrEqual(88);
  expect(s.label).toBe('🟢');
});

test("razoável porém pesado", () => {
  const s = computeBasicScore({
    LCP_ms: 2800,
    INP_ms: 260,
    CLS: 0.12,
    pageWeight_kb: 3200,
    requests: 110,
    seoKey: {
      https: true,
      indexable: true
    },
    mobileReady: {
      viewportMeta: true,
      ctaAboveFold: true
    }
  });
  expect(s.final).toBeLessThan(80);
});

test("bloqueio crítico (sem https)", () => {
  const s = computeBasicScore({
    LCP_ms: 3000,
    INP_ms: 250,
    CLS: 0.1,
    seoKey: {
      https: false,
      indexable: true
    }
  });
  expect(s.afterGates).toBeLessThanOrEqual(40);
  expect(s.label).toBe('🔴');
});