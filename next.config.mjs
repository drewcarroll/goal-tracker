/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Source lives under src/interfaces for the presentation/route layer.
  // The App Router pages are located in src/interfaces/web/app.
  images: {
    // Google account avatars are served from *.googleusercontent.com.
    remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }],
  },
};

export default nextConfig;
