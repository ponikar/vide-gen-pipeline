import "./src/env";

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
	typescript: { ignoreBuildErrors: true },
	eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
