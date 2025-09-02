// Crypto polyfill for Node.js environments that don't have crypto module
if (typeof globalThis.crypto === 'undefined') {
  const crypto = require('crypto');
  globalThis.crypto = crypto;
}

// Ensure crypto.randomUUID is available
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = function() {
    return require('crypto').randomUUID();
  };
}

module.exports = globalThis.crypto;
