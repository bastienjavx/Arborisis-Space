/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le package monorepo est livré en TS/CJS : Next le transpile.
  transpilePackages: ['@arborisis/shared'],
  output: 'standalone',
  // Le lint tourne en CI (`npm run lint`) ; on ne bloque pas le build de prod
  // sur des règles cosmétiques (ex. react/no-unescaped-entities).
  eslint: { ignoreDuringBuilds: true },
  // Le worker webpack échoue silencieusement dans l'environnement de build du monorepo.
  experimental: { webpackBuildWorker: false },
};

export default nextConfig;
