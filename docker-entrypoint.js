#!/usr/bin/env node

// Load crypto polyfill before starting the app
require('./crypto-polyfill.js');

// Start the application
require('./dist/main.js');
