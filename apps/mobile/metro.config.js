const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(root, 'node_modules'),
    ],
    extraNodeModules: {
      'i18next': path.resolve(__dirname, 'node_modules/i18next'),
      'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
