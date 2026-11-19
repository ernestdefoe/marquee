const config = require('flarum-webpack-config');

const NS = 'ernestdefoe-marquee';

/*
 * Lazy chunks need ids no other extension can have: Flarum finds a chunk's URL
 * by its id alone and every extension's chunks share one loading global, so
 * webpack's default 3-digit ids collide across extensions. As in Garage.
 */
class NamespacedChunkIds {
  apply(compiler) {
    compiler.hooks.compilation.tap('NamespacedChunkIds', (compilation) => {
      compilation.hooks.chunkIds.tap('NamespacedChunkIds', (chunks) => {
        for (const chunk of chunks) {
          if (chunk.id === null) {
            chunk.id = `${NS}:${chunk.name || chunk.debugId}`;
            chunk.ids = [chunk.id];
          }
        }
      });
    });
  }
}

module.exports = (...args) => {
  let base = config();
  if (typeof base === 'function') base = base(...args);

  // No shared chunks: each window carries what it uses, so every chunk lives
  // in dist/forum (where Flarum serves them) and opening one is one request.
  const split = base.optimization?.splitChunks || {};
  base.optimization = {
    ...base.optimization,
    chunkIds: false,
    splitChunks: { ...split, cacheGroups: { ...(split.cacheGroups || {}), default: false } },
  };
  base.output = { ...base.output, chunkLoadingGlobal: 'webpackChunk_ernestdefoe_marquee' };
  base.plugins = [...(base.plugins || []), new NamespacedChunkIds()];

  return base;
};
