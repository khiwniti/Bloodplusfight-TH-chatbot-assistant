module.exports = {
  env: {
    es2022: true,
    node: true,
    worker: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins: [
    'import'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Code quality
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Import rules
    'import/order': ['error', {
      'groups': [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index'
      ],
      'newlines-between': 'always'
    }],
    'import/no-unresolved': 'off', // Cloudflare Workers imports
    
    // Healthcare specific rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Security rules for healthcare data
    'no-undef': 'error',
    'no-global-assign': 'error',
    'no-implicit-globals': 'error',
    
    // Performance rules
    'no-await-in-loop': 'warn',
    'prefer-template': 'error',
    
    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error'
  },
  globals: {
    // Cloudflare Workers globals
    'addEventListener': 'readonly',
    'caches': 'readonly',
    'crypto': 'readonly',
    'fetch': 'readonly',
    'Request': 'readonly',
    'Response': 'readonly',
    'WebSocket': 'readonly',
    'WebSocketPair': 'readonly',
    'AbortController': 'readonly',
    'AbortSignal': 'readonly',
    'TextEncoder': 'readonly',
    'TextDecoder': 'readonly',
    'URL': 'readonly',
    'URLSearchParams': 'readonly',
    'Headers': 'readonly',
    'FormData': 'readonly',
    'ReadableStream': 'readonly',
    'WritableStream': 'readonly',
    'TransformStream': 'readonly',
    
    // Test globals
    'describe': 'readonly',
    'it': 'readonly',
    'expect': 'readonly',
    'beforeEach': 'readonly',
    'afterEach': 'readonly',
    'beforeAll': 'readonly',
    'afterAll': 'readonly',
    'vi': 'readonly'
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ]
};