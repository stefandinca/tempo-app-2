const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only enable Static Export and Base Path in Production
  output: isProd ? 'export' : undefined,
  basePath: '',
  trailingSlash: isProd,
  
  images: {
    unoptimized: true,
  },

  // Transpile firebase packages to ensure they are processed by Babel/SWC
  transpilePackages: ['firebase', '@firebase/auth', '@firebase/firestore', '@firebase/storage'],

  webpack: (config, { isServer, webpack }) => {
    // Force alias to the browser-compatible ESM builds
    config.resolve.alias['@firebase/auth'] = path.join(
      __dirname,
      'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js'
    );

    // Force Firebase Storage to use browser version (not Node.js version that requires undici)
    config.resolve.alias['@firebase/storage'] = path.join(
      __dirname,
      'node_modules/@firebase/storage/dist/index.esm2017.js'
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

    // Ignore undici module entirely (it's a Node.js-only fetch implementation)
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^undici$/,
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;