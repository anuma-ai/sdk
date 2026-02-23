/**
 * Next.js configuration plugin for @reverbia/sdk
 *
 * Use this to automatically configure Webpack aliases and server exclusions
 * needed for the SDK's dependencies.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withReverbia } from "@reverbia/sdk/next";
 *
 * const nextConfig = {
 *   // your config...
 * };
 *
 * export default withReverbia(nextConfig);
 * ```
 *
 * @module
 */
export const withReverbia = (nextConfig: any = {}) => {
  return {
    ...nextConfig,
    serverExternalPackages: [...(nextConfig.serverExternalPackages || []), "sharp"],
    webpack: (config: any, options: any) => {
      const { isServer } = options;

      // Client-side: Mock node-only packages to avoid bundling errors
      if (!isServer) {
        config.resolve.alias = {
          ...config.resolve.alias,
          sharp: false,
        };
      }

      // Treat .node files as resources (file paths) instead of modules to parse
      config.module.rules.push({
        test: /\.node$/,
        type: "asset/resource",
      });

      // Fallbacks for node modules that might be imported by dependencies
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        "node:fs": false,
        "node:path": false,
      };

      // Apply user's custom webpack config if provided
      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
};
