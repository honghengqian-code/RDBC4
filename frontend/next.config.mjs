/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained server (.next/standalone) with just the
  // needed node_modules, so the Docker runtime image doesn't need `npm install`.
  output: "standalone",
};

export default nextConfig;
