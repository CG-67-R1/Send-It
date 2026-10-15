/** UK App Store binary uses a separate bundle id. The Australian app is unchanged. */
module.exports = ({ config }) => {
  const uk = process.env.EXPO_PUBLIC_PACK === 'uk';
  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: uk ? 'com.milroadracer.uk' : config.ios.bundleIdentifier,
    },
  };
};
