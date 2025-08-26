// Redis configuration disabled for now
// This file is kept for future Redis integration

export interface AnalysisJobData {
  reportId: string
  url: string
  competitors?: string[]
}

// Placeholder functions for Redis-less operation
export const redis = null
export const analysisQueue = null
export const createAnalysisWorker = null