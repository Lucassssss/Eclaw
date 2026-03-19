/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode: true,
  // output: 'export',
  // trailingSlash: true,
    reactStrictMode: true,
    output: 'export',
    assetPrefix: './',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
}

export default nextConfig
