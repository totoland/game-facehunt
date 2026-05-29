/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // avoid double-invoking effects (SSE/timer) in dev
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
