type BabelParserModule = typeof import("@babel/parser");

let loaded: BabelParserModule | null = null;
let pending: Promise<BabelParserModule> | null = null;

/**
 * Load `@babel/parser` on demand; await it before calling `parseJsx`,
 * `parseDocumentDsl` or `renderAnumaJsx` directly (the slide, document and
 * app tools await it themselves).
 */
export async function loadBabelParser(): Promise<void> {
  if (loaded) return;
  pending ??= import("@babel/parser").then(
    (mod) => {
      loaded = mod;
      return mod;
    },
    (err: unknown) => {
      pending = null;
      throw err;
    }
  );
  await pending;
}

export function getBabelParser(caller: string): BabelParserModule {
  if (!loaded) {
    throw new Error(
      `${caller} needs @babel/parser, which is loaded lazily. Call and await loadBabelParser() first.`
    );
  }
  return loaded;
}
