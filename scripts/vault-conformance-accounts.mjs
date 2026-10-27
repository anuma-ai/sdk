import { createServer } from "node:http";

const port = Number(process.env.VAULT_CONFORMANCE_ACCOUNTS_PORT ?? 18081);
const token = process.env.VAULT_CONFORMANCE_ACCOUNTS_TOKEN ?? "conformance";

createServer((request, response) => {
  const path = /^\/v1\/accounts\/privy\/([^/?]+)$/.exec(request.url ?? "");
  if (request.headers.authorization !== `Bearer ${token}` || !path) {
    response.writeHead(404).end();
    return;
  }
  const id = /^did:privy:conformance-(\d+)$/.exec(decodeURIComponent(path[1]))?.[1];
  response
    .writeHead(200, { "Content-Type": "application/json" })
    .end(JSON.stringify({ success: true, data: { account: id ? { id: Number(id) } : null } }));
}).listen(port, "127.0.0.1", () => {
  console.log(`vault conformance accounts listening on ${port}`);
});
