const { withPodfile } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const TAG = 'cuentabirras-use-modular-headers';
const ANCHOR = /prepare_react_native_project!/;
const LINE = 'use_modular_headers!';

module.exports = function withUseModularHeaders(config) {
  return withPodfile(config, config => {
    config.modResults.contents = mergeContents({
      src: config.modResults.contents,
      newSrc: LINE,
      tag: TAG,
      anchor: ANCHOR,
      offset: 1,
      comment: '#',
    }).contents;
    return config;
  });
};
