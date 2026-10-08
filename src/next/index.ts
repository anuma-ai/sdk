/**
 * Next.js configuration plugin for @anuma/sdk
 *
 * Use this to automatically configure Webpack aliases and server exclusions
 * needed for the SDK's dependencies.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withAnuma } from "@anuma/sdk/next";
 *
 * const nextConfig = {
 *   // your config...
 * };
 *
 * export default withAnuma(nextConfig);
 * ```
 *
 * @module
 */
interface WebpackConfig {
  resolve: {
    alias: Record<string, unknown>;
    fallback: Record<string, unknown>;
  };
  module: {
    rules: Array<Record<string, unknown>>;
  };
}

interface WebpackOptions {
  isServer: boolean;
}

interface NextConfig {
  serverExternalPackages?: string[];
  webpack?: (config: WebpackConfig, options: WebpackOptions) => WebpackConfig;
  [key: string]: unknown;
}

export const withAnuma = (nextConfig: NextConfig = {}) => {
  return {
    ...nextConfig,
    serverExternalPackages: [...(nextConfig.serverExternalPackages ?? []), "sharp", "exceljs"],
    webpack: (config: WebpackConfig, options: WebpackOptions) => {
      const { isServer } = options;

      if (!isServer) {
        config.resolve.alias = {
          ...config.resolve.alias,
          sharp: false,
        };
      }

      config.module.rules.push({
        test: /\.node$/,
        type: "asset/resource",
      });

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        "node:fs": false,
        "node:path": false,
      };

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
};
