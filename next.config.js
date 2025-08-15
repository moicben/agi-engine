/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Avoid failing the production build on lint errors
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    // Allow imports from parent directories
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
