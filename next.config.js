/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  eslint: {
    // Avoid failing the production build on lint errors
    ignoreDuringBuilds: true,
  },

  webpack: (config, { isServer }) => {
    // Allow imports from parent directories
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};
