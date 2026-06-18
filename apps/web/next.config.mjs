/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le package monorepo est livré en TS/CJS : Next le transpile.
  transpilePackages: ['@arborisis/shared'],
  output: 'standalone',
};

export default nextConfig;
