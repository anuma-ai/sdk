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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withAnuma = (nextConfig: Record<string, any> = {}) => {
  return {
    ...nextConfig,
    serverExternalPackages: [
      ...(nextConfig.serverExternalPackages || []),
      "sharp",
      // exceljs pulls in unzipper → fstream which calls process.umask() at
      // module init time, crashing Cloudflare Workers and other edge runtimes.
      // Externalizing prevents the server bundler from including it in SSR.
      "exceljs",
    ],
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
