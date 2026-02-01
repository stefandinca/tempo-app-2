const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 1. Force Webpack to use the browser ESM build for @firebase/auth
    // This avoids the 'undici' dependency found in the node-esm build
    config.resolve.alias['@firebase/auth'] = path.join(
      __dirname,
      'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js'
    );

    // 2. Also alias the top-level firebase/auth import if necessary
    // (Though usually the deep alias above is enough)

    // 3. Fallback for Node-only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
