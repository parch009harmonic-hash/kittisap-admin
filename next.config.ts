import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const nestedRoot = path.join(process.cwd(), "kittisap-admin");
const turbopackRoot = fs.existsSync(path.join(nestedRoot, "next.config.ts"))
  ? nestedRoot
  : process.cwd();

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
