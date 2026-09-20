// Minimal, dependency-free lint config for CI — no build step for the app itself.
const browserGlobals = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', localStorage: 'readonly',
  fetch: 'readonly', console: 'readonly', alert: 'readonly', confirm: 'readonly', prompt: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
  requestAnimationFrame: 'readonly', URL: 'readonly', Blob: 'readonly', Worker: 'readonly',
  Notification: 'readonly', matchMedia: 'readonly', history: 'readonly', location: 'readonly',
  crypto: 'readonly', structuredClone: 'readonly', globalThis: 'readonly', postMessage: 'readonly',
  onmessage: 'writable', Chart: 'readonly',
};

const serviceWorkerGlobals = {
  self: 'readonly', caches: 'readonly', fetch: 'readonly', clients: 'readonly',
  importScripts: 'readonly', skipWaiting: 'readonly', Response: 'readonly', Request: 'readonly',
  registration: 'readonly', URL: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly',
};

module.exports = [
  {
    files: ['public/app.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      'no-undef': 'error',
      // Most top-level functions are invoked from inline onclick="" handlers in index.html,
      // so ESLint can't see the usage — this rule would be all false positives here.
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: serviceWorkerGlobals,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'warn',
    },
  },
];
