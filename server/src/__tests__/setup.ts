// Suppress console noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}

// Set required env vars for server modules
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.CASHFREE_CLIENT_ID = 'cf_test_key'
process.env.CASHFREE_SECRET_KEY = 'test_cashfree_secret'
process.env.NODE_ENV = 'test'
