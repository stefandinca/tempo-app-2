const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only enable Static Export and Base Path in Production
  output: isProd ? 'export' : undefined,
  basePath: isProd ? '/v2' : '',
  trailingSlash: isProd,
  
  images: {
    unoptimized: true,
  },

  // Transpile firebase packages to ensure they are processed by Babel/SWC
  transpilePackages: ['firebase', '@firebase/auth', '@firebase/firestore'],

  webpack: (config) => {
    // Force alias to the browser-compatible ESM build
    config.resolve.alias['@firebase/auth'] = path.join(
      __dirname,
      'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js'
    );

    // Apply fallbacks for Node.js modules globally
    config.resolve.fallback = {
      ...config.resolve.fallback,
      undici: false, // Explicitly disable undici
      net: false,
      tls: false,
      fs: false,
      child_process: false,
      http: false,
      https: false,
      stream: false,
      crypto: false,
    };

    return config;
  },
};

module.exports = nextConfig;