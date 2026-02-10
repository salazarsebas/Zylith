import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http";
import { AspClient } from "../../src/asp/client.js";

let server: Server;
let baseUrl: string;

// Simple mock server that echoes requests and returns canned responses
function startMockServer(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const srv = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        const url = req.url ?? "";

        if (req.method === "POST") {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString());

          if (url === "/deposit") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                leaf_index: 0,
                tx_hash: "0xdep123",
                root: "0xroot",
                root_tx_hash: "0xroot123",
              }),
            );
          } else if (url === "/withdraw") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                tx_hash: "0xwith123",
                nullifier_hash: "0xnull123",
              }),
            );
          } else if (url === "/swap") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                tx_hash: "0xswap123",
                new_commitment: "0xnew",
                change_commitment: "0xchange",
              }),
            );
          } else if (url === "/mint") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                tx_hash: "0xmint123",
                position_commitment: "0xpos",
                change_commitment_0: "0xch0",
                change_commitment_1: "0xch1",
              }),
            );
          } else if (url === "/burn") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                status: "ok",
                tx_hash: "0xburn123",
                new_commitment_0: "0xnew0",
                new_commitment_1: "0xnew1",
              }),
            );
          } else {
            res.writeHead(404);
            res.end("Not found");
          }
        } else if (req.method === "GET") {
          if (url === "/tree/root") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ root: "0xroot", leaf_count: 5 }));
          } else if (url?.startsWith("/tree/path/")) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                leaf_index: 0,
                commitment: "0xcomm",
                path_elements: ["0x1", "0x2"],
                path_indices: [0, 1],
                root: "0xroot",
              }),
            );
          } else if (url?.startsWith("/nullifier/")) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                nullifier_hash: "0xnull",
                spent: false,
                circuit_type: null,
                tx_hash: null,
              }),
            );
          } else if (url === "/status") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                healthy: true,
                version: "0.1.0",
                tree: { leaf_count: 5, root: "0xroot" },
                sync: { last_synced_block: 100 },
                contracts: {
                  coordinator: "0xcoord",
                  pool: "0xpool",
                },
              }),
            );
          } else {
            res.writeHead(404);
            res.end("Not found");
          }
        }
      },
    );

    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr !== "string") {
        resolve({ server: srv, url: `http://127.0.0.1:${addr.port}` });
      }
    });
  });
}

describe("AspClient", () => {
  beforeAll(async () => {
    const mock = await startMockServer();
    server = mock.server;
    baseUrl = mock.url;
  });

  afterAll(() => {
    server.close();
  });

  it("deposit sends POST and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.deposit({ commitment: "0xcommitment" });
    expect(res.tx_hash).toBe("0xdep123");
    expect(res.leaf_index).toBe(0);
    expect(res.root).toBe("0xroot");
  });

  it("withdraw sends POST and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.withdraw({
      secret: "1",
      nullifier: "2",
      amount_low: "100",
      amount_high: "0",
      token: "0x123",
      leaf_index: 0,
    });
    expect(res.tx_hash).toBe("0xwith123");
    expect(res.nullifier_hash).toBe("0xnull123");
  });

  it("swap sends POST and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.swap({
      pool_key: { token_0: "0xa", token_1: "0xb", fee: 3000, tick_spacing: 60 },
      input_note: {
        secret: "1",
        nullifier: "2",
        balance_low: "100",
        balance_high: "0",
        token: "0xa",
        leaf_index: 0,
      },
      swap_params: {
        token_in: "0xa",
        token_out: "0xb",
        amount_in: "50",
        amount_out_min: "40",
        amount_out_low: "45",
        amount_out_high: "0",
      },
      output_note: { secret: "3", nullifier: "4" },
      change_note: { secret: "5", nullifier: "6" },
      sqrt_price_limit: "0x0",
    });
    expect(res.tx_hash).toBe("0xswap123");
    expect(res.new_commitment).toBe("0xnew");
    expect(res.change_commitment).toBe("0xchange");
  });

  it("getTreeRoot sends GET and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.getTreeRoot();
    expect(res.root).toBe("0xroot");
    expect(res.leaf_count).toBe(5);
  });

  it("getTreePath sends GET and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.getTreePath(0);
    expect(res.leaf_index).toBe(0);
    expect(res.path_elements).toHaveLength(2);
  });

  it("getNullifier sends GET and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.getNullifier("0xnull");
    expect(res.spent).toBe(false);
  });

  it("getStatus sends GET and returns response", async () => {
    const client = new AspClient(baseUrl);
    const res = await client.getStatus();
    expect(res.healthy).toBe(true);
    expect(res.version).toBe("0.1.0");
  });

  it("handles trailing slash in baseUrl", async () => {
    const client = new AspClient(baseUrl + "/");
    const res = await client.getStatus();
    expect(res.healthy).toBe(true);
  });

  it("handles server errors", async () => {
    // Use a different base URL to hit a non-existent server path
    const client = new AspClient(baseUrl + "/nonexistent");
    await expect(client.getStatus()).rejects.toThrow("404");
  });
});
