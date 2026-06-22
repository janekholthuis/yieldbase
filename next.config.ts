import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake barrel imports of the heavy icon/chart libraries so only the
    // icons/chart pieces actually used land in each route's bundle (lucide-react
    // is imported across almost every view; recharts is large).
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
