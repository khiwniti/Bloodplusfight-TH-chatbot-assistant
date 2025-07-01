// Set up Jest environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.PORT = '3000';
process.env.CHANNEL_ACCESS_TOKEN = 'mock-token';
process.env.CHANNEL_SECRET = 'mock-secret';
process.env.USE_MONGODB = 'false';
process.env.ENABLE_CACHE = 'true';
process.env.ENABLE_RESEARCH = 'true';
process.env.OPENROUTER_API_KEY = 'mock-api-key';
process.env.OPENROUTER_MODEL = 'test-model';

// Silence console during tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock axios for API calls
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  }),
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
    readyState: 1,
  },
  Schema: jest.fn().mockReturnValue({
    index: jest.fn().mockReturnThis(),
  }),
  model: jest.fn().mockReturnValue({
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  }),
}));

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});