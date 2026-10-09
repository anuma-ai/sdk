import { describe, expectTypeOf, it } from "vitest";

import type { MemoryCreate as ExpoMemoryCreate } from "../../../expo/index";
import type { MemoryCreate as ReactMemoryCreate } from "../../../react/index";
import type { MemoryCreate as ExportedMemoryCreate } from "../index";
import type { MemoryCreate, MemoryListOptions, MemoryStore } from "./types";

describe("MemoryStore public input types", () => {
  it("restricts manual creation to app-editable fields", () => {
    expectTypeOf<keyof MemoryCreate>().toEqualTypeOf<
      | "content"
      | "scope"
      | "factType"
      | "eventTime"
      | "embedding"
      | "embeddingModel"
      | "geohash"
      | "kind"
      | "kindValue"
      | "level"
    >();
    expectTypeOf<Parameters<MemoryStore["create"]>[0]>().toEqualTypeOf<MemoryCreate>();
    expectTypeOf<Parameters<MemoryStore["createMany"]>[0]>().toEqualTypeOf<MemoryCreate[]>();
    expectTypeOf<ExportedMemoryCreate>().toEqualTypeOf<MemoryCreate>();
    expectTypeOf<ReactMemoryCreate>().toEqualTypeOf<MemoryCreate>();
    expectTypeOf<ExpoMemoryCreate>().toEqualTypeOf<MemoryCreate>();
  });

  it("excludes folder filters from the backend-independent list", () => {
    expectTypeOf<Extract<keyof MemoryListOptions, "folderId">>().toEqualTypeOf<never>();
  });
});
