/**
 * MPP session store — Upstash Redis when configured, in-memory fallback.
 *
 * Env (either pair works):
 *   KV_REST_API_URL + KV_REST_API_TOKEN   (legacy Vercel KV / Upstash)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * Without these, sessions live in process memory (fine for local / single-instance).
 */

import type { SessionChannel } from "./mpp-session";

const KEY_PREFIX = "mpp:channel:";
const INDEX_KEY = "mpp:channels";
const DEFAULT_TTL_SEC = 60 * 60; // 1 hour

type RedisLike = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
  sadd: (key: string, ...members: string[]) => Promise<unknown>;
  srem: (key: string, ...members: string[]) => Promise<unknown>;
  smembers: (key: string) => Promise<string[]>;
};

let redis: RedisLike | null | undefined;
let memory = new Map<string, SessionChannel>();

function getRestCreds(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (url && token) return { url, token };
  return null;
}

/** Lightweight REST client — no extra dependency required */
function createRestRedis(url: string, token: string): RedisLike {
  async function cmd<T>(command: unknown[]): Promise<T> {
    const res = await fetch(`${url.replace(/\/$/, "")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Redis REST ${res.status}: ${text}`);
    }
    const data = (await res.json()) as { result: T };
    return data.result;
  }

  return {
    async get<T>(key: string) {
      const raw = await cmd<string | null>(["GET", key]);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as T;
      }
    },
    async set(key, value, opts) {
      const payload = typeof value === "string" ? value : JSON.stringify(value);
      if (opts?.ex) {
        return cmd(["SET", key, payload, "EX", String(opts.ex)]);
      }
      return cmd(["SET", key, payload]);
    },
    async del(...keys) {
      if (keys.length === 0) return 0;
      return cmd(["DEL", ...keys]);
    },
    async sadd(key, ...members) {
      if (members.length === 0) return 0;
      return cmd(["SADD", key, ...members]);
    },
    async srem(key, ...members) {
      if (members.length === 0) return 0;
      return cmd(["SREM", key, ...members]);
    },
    async smembers(key) {
      return (await cmd<string[]>(["SMEMBERS", key])) || [];
    },
  };
}

function getRedis(): RedisLike | null {
  if (redis !== undefined) return redis;
  const creds = getRestCreds();
  if (!creds) {
    redis = null;
    return null;
  }
  try {
    redis = createRestRedis(creds.url, creds.token);
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

export function storeBackend(): "upstash" | "memory" {
  return getRedis() ? "upstash" : "memory";
}

export async function storeGet(channelId: string): Promise<SessionChannel | undefined> {
  const r = getRedis();
  if (r) {
    const ch = await r.get<SessionChannel>(KEY_PREFIX + channelId);
    return ch ?? undefined;
  }
  return memory.get(channelId);
}

export async function storeSave(ch: SessionChannel): Promise<void> {
  const r = getRedis();
  if (r) {
    const ttl = Math.max(
      60,
      Math.ceil((ch.expiresAt - Date.now()) / 1000) || DEFAULT_TTL_SEC
    );
    await r.set(KEY_PREFIX + ch.channelId, ch, { ex: ttl });
    await r.sadd(INDEX_KEY, ch.channelId);
    return;
  }
  memory.set(ch.channelId, ch);
}

export async function storeDelete(channelId: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(KEY_PREFIX + channelId);
    await r.srem(INDEX_KEY, channelId);
    return;
  }
  memory.delete(channelId);
}

export async function storeList(): Promise<SessionChannel[]> {
  const r = getRedis();
  if (r) {
    const ids = await r.smembers(INDEX_KEY);
    const out: SessionChannel[] = [];
    for (const id of ids) {
      const ch = await r.get<SessionChannel>(KEY_PREFIX + id);
      if (ch) out.push(ch);
    }
    return out;
  }
  return Array.from(memory.values());
}
