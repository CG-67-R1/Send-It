const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Avoid "[RUNTIME NOT READY] TypeError: Cannot read property ..." on device (Hermes/package exports)
config.resolver ??= {};
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
