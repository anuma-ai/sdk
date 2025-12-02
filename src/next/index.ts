/**
 * Next.js configuration plugin for @reverbia/sdk
 *
 * Use this to automatically configure Webpack aliases and server exclusions
 * needed for the SDK's AI dependencies (transformers.js, onnxruntime, etc).
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
 */
export const withReverbia = (nextConfig: any = {}) => {
  return {
    ...nextConfig,
    serverExternalPackages: [
      ...(nextConfig.serverExternalPackages || []),
      "onnxruntime-node",
      "@huggingface/transformers",
      "sharp",
    ],
    webpack: (config: any, options: any) => {
      const { isServer } = options;

      // Client-side: Mock node-only packages to avoid bundling errors
      if (!isServer) {
        config.resolve.alias = {
          ...config.resolve.alias,
          "onnxruntime-node": false,
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

      // Replace the SDK's bundled node-specific transformers file with the installed package
      // which supports browser environments correctly.
      config.plugins.push(
        new options.webpack.NormalModuleReplacementPlugin(
          /transformers\.node-BSHUG7OY\.mjs/,
          "@huggingface/transformers"
        )
      );

      // Apply user's custom webpack config if provided
      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
};
