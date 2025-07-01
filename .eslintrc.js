module.exports = {
  env: {
    browser: false,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'commonjs'
  },
  rules: {
    'indent': ['warn', 2],
    'linebreak-style': ['off'],
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'no-unused-vars': ['warn'],
    'no-console': ['off'],
    'no-undef': ['error'],
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'require-atomic-updates': ['off']
  }
};