const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

/**
 * Metro configuration for Expo SDK 54 project.
 * Adds a resolver alias for the legacy transform-worker path used by some sub-dependencies.
 */
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  // Map the legacy path to the current transform worker shipped by @expo/metro-config
  '@expo/metro-config/build/transform-worker/transform-worker.js': path.resolve(
    projectRoot,
    'node_modules/@expo/metro-config/build/transform-worker.js'
  ),
};

module.exports = config;
