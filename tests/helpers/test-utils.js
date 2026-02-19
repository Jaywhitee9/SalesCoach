/**
 * Test utilities and helpers
 */

/**
 * Create a mock Fastify request object
 */
export function createMockRequest(overrides = {}) {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    url: '',
    method: 'GET',
    ip: '127.0.0.1',
    user: null,
    ...overrides,
  };
}

/**
 * Create a mock Fastify reply object
 */
export function createMockReply() {
  const reply = {
    _statusCode: 200,
    _sent: null,
    status(code) {
      this._statusCode = code;
      return this;
    },
    code(statusCode) {
      this._statusCode = statusCode;
      return this;
    },
    send(data) {
      this._sent = data;
      return this;
    },
    header(key, value) {
      return this;
    },
  };
  return reply;
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    organization_id: 'test-org-id',
    role: 'rep',
    full_name: 'Test User',
    ...overrides,
  };
}

/**
 * Create a mock lead object
 */
export function createMockLead(overrides = {}) {
  return {
    id: 'lead-123',
    organization_id: 'test-org-id',
    assigned_to: 'test-user-id',
    name: 'Test Lead',
    company: 'Test Company',
    email: 'lead@test.com',
    phone: '+1234567890',
    status: 'new',
    source: 'website',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabase() {
  const mockData = { data: null, error: null };

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(mockData),
    maybeSingle: vi.fn().mockResolvedValue(mockData),
    then: vi.fn((resolve) => resolve(mockData)),
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
    },
    rpc: vi.fn().mockResolvedValue(mockData),
  };
}

/**
 * Wait for a specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random string
 */
export function randomString(length = 10) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone) {
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}
