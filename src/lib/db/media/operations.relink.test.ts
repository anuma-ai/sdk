// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Media } from "./models";
import type { MediaType } from "./types";
import { getMediaByTypeOp, relinkMisclassifiedVideosOp, updateMediaOp } from "./operations";

const WALLET = "0xwallet";

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `relink-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

async function insertMedia(
  db: Database,
  fields: {
    mediaId: string;
    mediaType: MediaType;
    mimeType: string;
    name?: string;
    walletAddress?: string;
    isDeleted?: boolean;
  }
): Promise<void> {
  const collection = db.get<Media>("media");
  const now = Date.now();
  await db.write(async () => {
    await collection.create((m) => {
      m._setRaw("media_id", fields.mediaId);
      m._setRaw("wallet_address", fields.walletAddress ?? WALLET);
      m._setRaw("name", fields.name ?? fields.mediaId);
      m._setRaw("mime_type", fields.mimeType);
      m._setRaw("media_type", fields.mediaType);
      m._setRaw("size", 0);
      m._setRaw("role", "assistant");
      m._setRaw("is_deleted", fields.isDeleted ?? false);
      m._setRaw("created_at", now);
      m._setRaw("updated_at", now);
    });
  });
}

async function mediaTypeOf(db: Database, mediaId: string): Promise<string> {
  const [record] = await db
    .get<Media>("media")
    .query()
    .fetch()
    .then((rs) => rs.filter((r) => r.mediaId === mediaId));
  return record!.mediaType;
}

describe("relinkMisclassifiedVideosOp", () => {
  let db: Database;
  beforeEach(() => {
    db = makeDatabase();
  });

  it("flips image records with a video mime to video, leaves real images", async () => {
    await insertMedia(db, {
      mediaId: "vid-as-image",
      mediaType: "image",
      mimeType: "video/mp4",
      name: "mcp-image-123.mp4",
    });
    await insertMedia(db, {
      mediaId: "real-image",
      mediaType: "image",
      mimeType: "image/png",
      name: "mcp-image-456.png",
    });

    const count = await relinkMisclassifiedVideosOp({ database: db }, WALLET);

    expect(count).toBe(1);
    expect(await mediaTypeOf(db, "vid-as-image")).toBe("video");
    expect(await mediaTypeOf(db, "real-image")).toBe("image");
  });

  it("catches videos with a generic/wrong mime via the name extension", async () => {
    // Old path stored these mimes even though the bytes are video.
    await insertMedia(db, {
      mediaId: "octet",
      mediaType: "image",
      mimeType: "application/octet-stream",
      name: "mcp-image-1.mp4",
    });
    await insertMedia(db, {
      mediaId: "image-mp4",
      mediaType: "image",
      mimeType: "image/mp4",
      name: "mcp-image-2.webm",
    });

    const count = await relinkMisclassifiedVideosOp({ database: db }, WALLET);

    expect(count).toBe(2);
    expect(await mediaTypeOf(db, "octet")).toBe("video");
    expect(await mediaTypeOf(db, "image-mp4")).toBe("video");
  });

  it("repairs a generic mime to a video/<ext> so it stays classified as video", async () => {
    await insertMedia(db, {
      mediaId: "octet",
      mediaType: "image",
      mimeType: "application/octet-stream",
      name: "mcp-image-3.mp4",
    });

    await relinkMisclassifiedVideosOp({ database: db }, WALLET);

    const [record] = await db
      .get<Media>("media")
      .query()
      .fetch()
      .then((rs) => rs.filter((r) => r.mediaId === "octet"));
    expect(record!.mimeType).toBe("video/mp4");
    // Idempotent on a second pass (already video).
    expect(await relinkMisclassifiedVideosOp({ database: db }, WALLET)).toBe(0);
  });

  it("renames the mcp-image- prefix to mcp-video-", async () => {
    await insertMedia(db, {
      mediaId: "v1",
      mediaType: "image",
      mimeType: "video/webm",
      name: "mcp-image-789.webm",
    });

    await relinkMisclassifiedVideosOp({ database: db }, WALLET);

    const [record] = await db
      .get<Media>("media")
      .query()
      .fetch()
      .then((rs) => rs.filter((r) => r.mediaId === "v1"));
    expect(record!.name).toBe("mcp-video-789.webm");
    expect(record!.mediaType).toBe("video");
  });

  it("is idempotent — a second run finds nothing to relink", async () => {
    await insertMedia(db, {
      mediaId: "v1",
      mediaType: "image",
      mimeType: "video/mp4",
      name: "mcp-image-1.mp4",
    });

    expect(await relinkMisclassifiedVideosOp({ database: db }, WALLET)).toBe(1);
    expect(await relinkMisclassifiedVideosOp({ database: db }, WALLET)).toBe(0);
  });

  it("is scoped to the wallet and skips deleted records", async () => {
    await insertMedia(db, {
      mediaId: "other-wallet",
      mediaType: "image",
      mimeType: "video/mp4",
      walletAddress: "0xother",
    });
    await insertMedia(db, {
      mediaId: "deleted",
      mediaType: "image",
      mimeType: "video/mp4",
      isDeleted: true,
    });

    expect(await relinkMisclassifiedVideosOp({ database: db }, WALLET)).toBe(0);
    expect(await mediaTypeOf(db, "other-wallet")).toBe("image");
  });

  it("relinked records surface in the video library, not images", async () => {
    await insertMedia(db, {
      mediaId: "vid",
      mediaType: "image",
      mimeType: "video/mp4",
      name: "mcp-image-9.mp4",
    });

    await relinkMisclassifiedVideosOp({ database: db }, WALLET);

    const images = await getMediaByTypeOp({ database: db }, WALLET, "image");
    const videos = await getMediaByTypeOp({ database: db }, WALLET, "video");
    expect(images.find((m) => m.mediaId === "vid")).toBeUndefined();
    expect(videos.find((m) => m.mediaId === "vid")).toBeDefined();
  });
});

describe("updateMediaOp mediaType", () => {
  it("can re-categorize a record's media type", async () => {
    const db = makeDatabase();
    await insertMedia(db, { mediaId: "m1", mediaType: "image", mimeType: "video/mp4" });

    const updated = await updateMediaOp({ database: db }, "m1", { mediaType: "video" });

    expect(updated?.mediaType).toBe("video");
  });
});
