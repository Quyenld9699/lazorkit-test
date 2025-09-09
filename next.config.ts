import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    eslint: {
        // Skip ESLint during production builds (next build)
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
