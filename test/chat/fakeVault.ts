interface WireRecord {
  kind: string;
  id: string;
  conversation_id: string;
  sort_key: number;
  created_at: number;
  updated_at: number;
  is_deleted: boolean;
  payload: string;
}

interface Entry {
  record: WireRecord;
  version: number;
  seq: number;
}

export interface FakeVaultAttachment {
  id: string;
  size: number;
  state: "pending" | "committed";
  ownerKind?: string;
  ownerId?: string;
  createdAt: number;
}

export interface FakeVaultRequest {
  host: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Uint8Array<ArrayBuffer> | null;
}

export type FakeVaultFault = (
  request: FakeVaultRequest
) => Response | undefined | Promise<Response | undefined>;

const accountId = 8801;
const presignTtlMs = 15 * 60_000;
const defaultChangeKinds = ["conversation", "message", "summary", "project", "memory_links"];
const legacyKinds = new Set([
  "conversation",
  "message",
  "summary",
  "project",
  "memory_links",
  "setting",
  "app_file",
  "saved_tool",
]);
const revivable = new Set(["app_file", "saved_tool"]);

function problem(status: number, code: string): Response {
  return Response.json({ detail: code, code }, { status });
}

/** An in-memory vault over HTTP, with presigned R2 storage, for SDK tests that drive `createRemoteChatStore`. */
export function createFakeVault(options: { mediaAttachments?: boolean } = {}) {
  let clock = Date.UTC(2026, 10, 19);
  let attachmentSeq = 0;
  let changeSeq = 0;
  let keyId = "";
  const records = new Map<string, Entry>();
  const attachments = new Map<string, FakeVaultAttachment>();
  const blobs = new Map<string, Uint8Array<ArrayBuffer>>();
  const requests: FakeVaultRequest[] = [];
  const faults: FakeVaultFault[] = [];
  const kinds = new Set([...legacyKinds, ...(options.mediaAttachments ? ["media"] : [])]);
  const ownerKinds = new Set([
    "message",
    "summary",
    ...(options.mediaAttachments ? ["media", "app_file"] : []),
  ]);

  const presign = (id: string, method: string) => ({
    url: `https://r2.test/chat/${accountId}/${id}?expires=${clock + presignTtlMs}`,
    method,
    headers:
      method === "PUT"
        ? {
            "Content-Length": String(attachments.get(id)!.size),
            "Content-Type": "application/octet-stream",
          }
        : {},
    expires_at: new Date(clock + presignTtlMs).toISOString(),
  });

  const wireAttachment = (row: FakeVaultAttachment) => ({
    attachment_id: row.id,
    size_bytes: row.size,
    state: row.state,
    ...(row.ownerKind ? { owner_kind: row.ownerKind, owner_id: row.ownerId } : {}),
    created_at: new Date(row.createdAt).toISOString(),
    ...(row.state === "committed" ? { committed_at: new Date(clock).toISOString() } : {}),
  });

  const snapshot = (entry: Entry) => ({
    record: entry.record,
    version: entry.version,
    server_updated_at: new Date(clock).toISOString(),
  });

  const removeAttachment = (id: string) => {
    attachments.delete(id);
    blobs.delete(id);
  };

  const r2 = (request: FakeVaultRequest, url: URL): Response => {
    const id = url.pathname.split("/").pop()!;
    if (clock > Number(url.searchParams.get("expires")))
      return new Response("<Code>AccessDenied</Code>", { status: 403 });
    if (request.method === "PUT") {
      const row = attachments.get(id);
      if (
        !row ||
        request.headers["content-type"] !== "application/octet-stream" ||
        request.body?.length !== row.size
      )
        return new Response("<Code>SignatureDoesNotMatch</Code>", { status: 403 });
      blobs.set(id, request.body);
      return new Response(null, { status: 200 });
    }
    const blob = blobs.get(id);
    return blob
      ? new Response(blob.slice())
      : new Response("<Code>NoSuchKey</Code>", { status: 404 });
  };

  const write = (w: { record: WireRecord; expected_version: number }) => {
    const key = `${w.record.kind}/${w.record.id}`;
    const entry = {
      record: w.record.is_deleted ? { ...w.record, payload: "" } : w.record,
      version: w.expected_version + 1,
      seq: ++changeSeq,
    };
    records.set(key, entry);
    if (w.record.is_deleted)
      for (const row of [...attachments.values()])
        if (row.ownerKind === w.record.kind && row.ownerId === w.record.id)
          removeAttachment(row.id);
    return snapshot(entry);
  };

  const api = (request: FakeVaultRequest, url: URL): Response => {
    const path = url.pathname.replace("/api/private-chats", "");
    const body =
      request.body && request.body.length > 0
        ? (JSON.parse(new TextDecoder().decode(request.body)) as Record<string, unknown>)
        : {};
    if (path === "/account")
      return Response.json({
        account_id: accountId,
        key_id: keyId,
        state: "active",
        record_count: records.size,
        storage_bytes: 0,
        vector_count: 0,
        term_search: false,
        ...(options.mediaAttachments ? { media_attachments: true } : {}),
      });
    const recordPath = /^\/records\/(\w+)\/([^/]+)$/.exec(path);
    if (recordPath && request.method === "GET") {
      if (!kinds.has(recordPath[1])) return problem(422, "validation_failed");
      const entry = records.get(`${recordPath[1]}/${decodeURIComponent(recordPath[2])}`);
      return entry ? Response.json(snapshot(entry)) : problem(404, "not_found");
    }
    if (path === "/records" && request.method === "GET") {
      const kind = url.searchParams.get("kind")!;
      if (!kinds.has(kind)) return problem(422, "validation_failed");
      const parent = url.searchParams.get("conversation_id") ?? "";
      const withDeleted = url.searchParams.get("include_deleted") === "true";
      return Response.json({
        items: [...records.values()]
          .filter(
            (e) =>
              e.record.kind === kind &&
              e.record.conversation_id === parent &&
              (withDeleted || !e.record.is_deleted)
          )
          .sort((a, b) => b.record.sort_key - a.record.sort_key)
          .map(snapshot),
      });
    }
    if (path === "/records/get") {
      const refs = body.refs as { kind: string; id: string }[];
      if (refs.some((r) => !kinds.has(r.kind))) return problem(422, "validation_failed");
      return Response.json({
        items: refs.flatMap((r) => {
          const entry = records.get(`${r.kind}/${r.id}`);
          return entry ? [snapshot(entry)] : [];
        }),
      });
    }
    if (path === "/records/batch") {
      const writes = body.writes as { record: WireRecord; expected_version: number }[];
      if (writes.some((w) => !kinds.has(w.record.kind))) return problem(422, "validation_failed");
      for (const w of writes) {
        const current = records.get(`${w.record.kind}/${w.record.id}`);
        if (
          (current?.version ?? 0) !== w.expected_version ||
          (current?.record.is_deleted && !w.record.is_deleted && !revivable.has(w.record.kind))
        )
          return problem(409, "version_conflict");
      }
      keyId = body.key_id as string;
      return Response.json({ items: writes.map(write) });
    }
    if (path === "/changes") {
      const wanted = url.searchParams.get("kinds")?.split(",") ?? defaultChangeKinds;
      if (wanted.some((k) => !kinds.has(k))) return problem(422, "validation_failed");
      const after = Number(url.searchParams.get("cursor") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const ordered = [...records.values()]
        .filter((e) => e.seq > after && wanted.includes(e.record.kind))
        .sort((a, b) => a.seq - b.seq);
      const items = ordered.slice(0, limit);
      const last = items[items.length - 1];
      return Response.json({
        items: items.map(snapshot),
        ...(ordered.length > limit ? { next_cursor: String(last.seq) } : {}),
        changes_cursor: String(last?.seq ?? after),
      });
    }
    if (path === "/attachments" && request.method === "POST") {
      const id = (++attachmentSeq).toString(16).padStart(32, "0");
      attachments.set(id, {
        id,
        size: body.size_bytes as number,
        state: "pending",
        createdAt: clock,
      });
      return Response.json(
        { attachment: wireAttachment(attachments.get(id)!), upload: presign(id, "PUT") },
        { status: 201 }
      );
    }
    const commitPath = /^\/attachments\/([0-9a-f]{32})\/commit$/.exec(path);
    if (commitPath) {
      if (!ownerKinds.has(body.owner_kind as string)) return problem(422, "validation_failed");
      const row = attachments.get(commitPath[1]);
      if (!row) return problem(404, "not_found");
      if (row.state === "committed")
        return row.ownerKind === body.owner_kind && row.ownerId === body.owner_id
          ? Response.json({ attachment: wireAttachment(row) })
          : problem(409, "attachment_conflict");
      if (blobs.get(row.id)?.length !== row.size) return problem(409, "attachment_not_uploaded");
      const owner = records.get(`${body.owner_kind as string}/${body.owner_id as string}`);
      if (!owner || owner.record.is_deleted) return problem(409, "attachment_owner_not_found");
      Object.assign(row, {
        state: "committed",
        ownerKind: body.owner_kind,
        ownerId: body.owner_id,
      });
      return Response.json({ attachment: wireAttachment(row) });
    }
    const attachmentPath = /^\/attachments\/([0-9a-f]{32})$/.exec(path);
    if (attachmentPath) {
      const row = attachments.get(attachmentPath[1]);
      if (!row) return problem(404, "not_found");
      if (request.method === "DELETE") {
        removeAttachment(row.id);
        return new Response(null, { status: 204 });
      }
      return Response.json({
        attachment: wireAttachment(row),
        ...(row.state === "committed" ? { download: presign(row.id, "GET") } : {}),
      });
    }
    return problem(404, "not_found");
  };

  const fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    const raw = init.body;
    const request: FakeVaultRequest = {
      host: url.host,
      method: init.method ?? "GET",
      path: url.pathname + url.search,
      headers: Object.fromEntries(
        Object.entries((init.headers as Record<string, string>) ?? {}).map(([k, v]) => [
          k.toLowerCase(),
          v,
        ])
      ),
      body:
        typeof raw === "string"
          ? new TextEncoder().encode(raw)
          : raw instanceof Uint8Array
            ? raw.slice()
            : null,
    };
    requests.push(request);
    for (let i = 0; i < faults.length; i++) {
      const response = await faults[i](request);
      if (response) {
        faults.splice(i, 1);
        return response;
      }
    }
    return url.host === "r2.test" ? r2(request, url) : api(request, url);
  };

  return {
    fetch: fetch as typeof globalThis.fetch,
    records,
    attachments,
    blobs,
    requests,
    faults,
    now: () => clock,
    advance: (ms: number) => {
      clock += ms;
    },
    record: (kind: string, id: string) => records.get(`${kind}/${id}`),
    uploads: () => requests.filter((r) => r.host === "r2.test" && r.method === "PUT"),
  };
}

export type FakeVault = ReturnType<typeof createFakeVault>;
