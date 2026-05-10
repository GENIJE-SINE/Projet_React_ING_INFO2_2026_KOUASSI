// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
// Support web + déduplication de React pour éviter les conflits
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Forcer une seule instance de react et react-native
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Dédupliquer react, react-dom, react-native pour éviter le bug "older version of React"
  if (
    moduleName === 'react' ||
    moduleName === 'react-dom' ||
    moduleName === 'react/jsx-runtime' ||
    moduleName === 'react/jsx-dev-runtime'
  ) {
    return context.resolveRequest(
      { ...context, originModulePath: __dirname + '/index.js' },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;