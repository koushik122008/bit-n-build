/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix for Windows path issues
  trailingSlash: true,
  experimental: {
    // Enable case-sensitive file resolving
    typedRoutes: false,
  },
};

module.exports = nextConfig;
