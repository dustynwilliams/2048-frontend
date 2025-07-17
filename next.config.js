/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable API routes
  // Handle environment variables
  env: {
    PG_CONNECTION_STRING: process.env.PG_CONNECTION_STRING,
  },
}

module.exports = nextConfig 