import { timingSafeEqual } from "node:crypto";

import { attachDatabasePool } from "@neon/functions";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const originSecret = process.env.ORIGIN_SECRET;

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!originSecret) throw new Error("ORIGIN_SECRET is required");

const expectedSecret = Buffer.from(originSecret);
const pool = new Pool({ connectionString, max: 3 });
attachDatabasePool(pool);

function isAuthorized(request: Request) {
  const header = request.headers.get("x-secret");
  if (!header) return false;
  const provided = Buffer.from(header);
  return provided.byteLength === expectedSecret.byteLength && timingSafeEqual(provided, expectedSecret);
}

const healthFunction = {
  async fetch(request: Request): Promise<Response> {
    if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
    const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
    return Response.json({ ok: result.rows[0]?.ok === 1, database: "reachable" });
  },
};

export default healthFunction;
