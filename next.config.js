const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Static Export
  output: 'export',
  
  // Set the base path for subdirectory hosting
  basePath: '/v2',

  // Ensure paths end with a slash (good for static hosting compatibility)
  trailingSlash: true,
  
  // Disable server-side image optimization (requires Node.js server)
  images: {
    unoptimized: true,
  },

  // Keep existing webpack config for Firebase/Undici fix
  webpack: (config, { isServer }) => {
    config.resolve.alias['@firebase/auth'] = path.join(
      __dirname,
      'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js'
    );

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