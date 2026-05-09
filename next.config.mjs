/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow images from GitHub CDN (for release avatars etc.)
  images: {
    domains: ["avatars.githubusercontent.com", "github.com"],
  },
};

export default nextConfig;
