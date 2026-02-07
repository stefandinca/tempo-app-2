const path = require('path');

let withPWA;
try {
  withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    importScripts: ['/firebase-messaging-sw.js'],
  });
} catch (e) {
  // If next-pwa is not installed (e.g. on server with limited node_modules), 
  // provide a fallback that just returns the config
  console.warn("next-pwa not found, continuing without PWA support.");
  withPWA = (config) => config;
}

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Static Export to run as a Node.js server
  // output: 'export',
  basePath: '',
  trailingSlash: true,
  
  images: {
    unoptimized: true,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'firebase', 'jspdf', 'jspdf-autotable'],
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

module.exports = withPWA(nextConfig);