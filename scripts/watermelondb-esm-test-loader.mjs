/** Resolve two legacy WatermelonDB directories for the built ESM test only. */
const directoryImports = new Set([
  "@nozbe/watermelondb/decorators",
  "@nozbe/watermelondb/Schema/migrations",
]);

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code !== "ERR_UNSUPPORTED_DIR_IMPORT" || !directoryImports.has(specifier)) {
      throw error;
    }
    return nextResolve(`${specifier}/index.js`, context);
  }
}
