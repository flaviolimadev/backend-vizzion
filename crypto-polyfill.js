// Crypto polyfill for Node.js environments that don't have crypto module
const crypto = require('crypto');

// Ensure crypto.randomUUID is available
if (!crypto.randomUUID) {
  crypto.randomUUID = function() {
    return crypto.randomBytes(16).toString('hex');
  };
}

// Make crypto available globally
globalThis.crypto = crypto;

module.exports = crypto;
