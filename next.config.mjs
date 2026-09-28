/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_OPS_RELEASE: /^[a-f0-9]{7,40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA || process.env.ROOTS_RELEASE_SHA || "")
      ? (process.env.VERCEL_GIT_COMMIT_SHA || process.env.ROOTS_RELEASE_SHA).toLowerCase()
      : "local",
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
