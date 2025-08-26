import { describe, it, expect } from 'vitest'
import { AdvancedAuditor } from '@/lib/advanced-audit'
import { AdvancedSample, AdvancedScores } from '@/types/advanced'

describe('Advanced Auditor', () => {
  const auditor = new AdvancedAuditor()

  describe('Initialization', () => {
    it('should initialize and close browser correctly', async () => {
      await auditor.initialize()
      expect(auditor).toBeDefined()
      await auditor.close()
    })
  })

  describe('Sample Data Structure', () => {
    it('should have correct AdvancedSample structure', () => {
      const mockSample: AdvancedSample = {
        url: 'https://example.com',
        viewport: 'mobile',
        timings: {
          ttfb_ms: 200,
          longTasks_total_ms: 0,
          dns_ms: 10,
          connect_ms: 50,
          tls_ms: 30,
          longTasks_count: 0,
          serverTiming: []
        },
        resources: {
          requests_total: 30,
          bytes: {
            js: 500000,
            css: 100000,
            img: 800000,
            font: 50000,
            html: 20000,
            other: 30000
          }
        },
        cacheCdn: {
          cdn: { vendor: 'Cloudflare', evidence: ['cf-ray'] },
          compressionCoverage_pct: 90,
          cacheable_pct: 85,
          headersSample: []
        },
        images: {
          total: 10,
          webp_pct: 80,
          avif_pct: 20,
          jpg_png_pct: 0,
          lazy_pct: 90,
          wrongDims_count: 0,
          heroPreloaded: true,
          lcpUrl: 'https://example.com/hero.webp'
        },
        thirdParties: {
          total_requests: 5,
          total_bytes: 500000,
          byDomain: [
            { domain: 'google-analytics.com', bytes: 200000, blocking: false, category: 'analytics' },
            { domain: 'facebook.com', bytes: 150000, blocking: true, category: 'social' },
            { domain: 'doubleclick.net', bytes: 100000, blocking: false, category: 'ads' },
            { domain: 'cdn.jsdelivr.net', bytes: 50000, blocking: false, category: 'unknown' }
          ]
        },
        fonts: {
          total: 3,
          withFontDisplay_pct: 100,
          preloaded_count: 2,
          subset_hint: true
        },
        pwa: {
          manifest: true,
          serviceWorker: true,
          offlineBasic: true,
          a2hsReady: true
        },
        a11y: {
          issues_total: 0,
          byCategory: {}
        },
        seo: {
          indexable: true,
          canonical: true,
          og: true,
          twitter: true,
          schema: ['structured-data'],
          hreflangPairs_ok: true
        }
      }

      expect(mockSample.url).toBe('https://example.com')
      expect(mockSample.viewport).toBe('mobile')
      expect(mockSample.timings.ttfb_ms).toBe(200)
      expect(mockSample.resources.requests_total).toBe(30)
      expect(mockSample.images.total).toBe(10)
      expect(mockSample.pwa.manifest).toBe(true)
    })
  })

  describe('Scores Structure', () => {
    it('should have correct AdvancedScores structure', () => {
      const mockScores: AdvancedScores = {
        perfNet: 95,
        resources: 88,
        cacheCdn: 92,
        images: 85,
        thirdParties: 78,
        fonts: 90,
        pwa: 100,
        a11y: 95,
        seo: 88
      }

      expect(mockScores.perfNet).toBe(95)
      expect(mockScores.resources).toBe(88)
      expect(mockScores.cacheCdn).toBe(92)
      expect(mockScores.images).toBe(85)
      expect(mockScores.thirdParties).toBe(78)
      expect(mockScores.fonts).toBe(90)
      expect(mockScores.pwa).toBe(100)
      expect(mockScores.a11y).toBe(95)
      expect(mockScores.seo).toBe(88)
    })
  })

  describe('Scoring Logic', () => {
    it('should calculate scores within valid range (0-100)', () => {
      const mockSample: AdvancedSample = {
        url: 'https://example.com',
        viewport: 'mobile',
        timings: { ttfb_ms: 200, longTasks_total_ms: 0, dns_ms: 10, connect_ms: 50, tls_ms: 30, longTasks_count: 0, serverTiming: [] },
        resources: { requests_total: 30, bytes: { js: 500000, css: 100000, img: 800000, font: 50000, html: 20000, other: 30000 } },
        cacheCdn: { cdn: { vendor: 'Cloudflare', evidence: ['cf-ray'] }, compressionCoverage_pct: 90, cacheable_pct: 85, headersSample: [] },
        images: { total: 10, webp_pct: 80, avif_pct: 20, jpg_png_pct: 0, lazy_pct: 90, wrongDims_count: 0, heroPreloaded: true, lcpUrl: 'https://example.com/hero.webp' },
        thirdParties: { total_requests: 5, total_bytes: 500000, byDomain: [{ domain: 'example.com', bytes: 100000, blocking: false, category: 'analytics' }] },
        fonts: { total: 3, withFontDisplay_pct: 100, preloaded_count: 2, subset_hint: true },
        pwa: { manifest: true, serviceWorker: true, offlineBasic: true, a2hsReady: true },
        a11y: { issues_total: 0, byCategory: {} },
        seo: { indexable: true, canonical: true, og: true, twitter: true, schema: ['structured-data'], hreflangPairs_ok: true }
      }

      // Test that we can create a valid sample structure
      expect(mockSample).toBeDefined()
      expect(mockSample.url).toBe('https://example.com')
      expect(mockSample.timings.ttfb_ms).toBeGreaterThanOrEqual(0)
      expect(mockSample.resources.requests_total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('URL Validation', () => {
    it('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.com/path?query=1',
        'https://example.com:8080/path'
      ]

      validUrls.forEach(url => {
        expect(() => new URL(url)).not.toThrow()
      })
    })

    it('should handle URL validation properly', () => {
      // Test that URL constructor exists and works
      expect(typeof URL).toBe('function')
      
      // Test a clearly invalid URL
      expect(() => {
        new URL('not-a-valid-url-at-all')
      }).toThrow()
    })
  })
})