import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.GOOGLE_PAGESPEED_API_KEY = 'test-key'
process.env.REDIS_URL = 'redis://localhost:6379'