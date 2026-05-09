/**
 * lib/auth/tokens.ts
 *
 * Simple API token system for desktop ↔ web authentication.
 *
 * Tokens are prefixed "apex_tok_" and stored hashed in a JSON file.
 * For production, replace with a real DB + JWT system.
 */

import { createHash, randomBytes }  from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path           from "path";

const STORE_PATH = process.env.APEX_TOKEN_STORE
  ?? path.join(process.cwd(), "uploads", ".tokens.json");

const TOKEN_PREFIX = "apex_tok_";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenRecord {
  hash:        string;          // SHA-256 of the raw token
  userId:      string;
  label:       string;
  createdAt:   string;
  lastUsedAt:  string | null;
}

type TokenStore = Record<string, TokenRecord>;

// ─── Store I/O ────────────────────────────────────────────────────────────────

async function loadStore(): Promise<TokenStore> {
  if (!existsSync(STORE_PATH)) return {};
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as TokenStore;
  } catch { return {}; }
}

async function saveStore(store: TokenStore): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generate a new token for a user and persist its hash. */
export async function createToken(userId: string, label = "desktop"): Promise<string> {
  const raw   = TOKEN_PREFIX + randomBytes(24).toString("hex");
  const hash  = hashToken(raw);
  const store = await loadStore();

  store[hash] = {
    hash,
    userId,
    label,
    createdAt:  new Date().toISOString(),
    lastUsedAt: null,
  };

  await saveStore(store);
  return raw;
}

/** Validate a token; returns userId or null. Updates lastUsedAt. */
export async function validateToken(token: string): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const hash  = hashToken(token);
  const store = await loadStore();
  const rec   = store[hash];
  if (!rec) return null;

  // Update last used (fire and forget)
  store[hash].lastUsedAt = new Date().toISOString();
  saveStore(store).catch(() => {});

  return rec.userId;
}

/** Extract token from request headers — supports X-Api-Token and Bearer. */
export function extractToken(headers: Headers): string | null {
  const direct = headers.get("x-api-token");
  if (direct) return direct;

  const bearer = headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);

  return null;
}

/** Helper — throws if token is invalid. Returns userId. */
export async function requireAuth(headers: Headers): Promise<string> {
  const token = extractToken(headers);
  if (!token) throw new Error("Требуется аутентификация");

  const userId = await validateToken(token);
  if (!userId) throw new Error("Недействительный токен");

  return userId;
}
