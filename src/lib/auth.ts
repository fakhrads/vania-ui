/**
 * JWT auth — single-user.
 * Wajib diset di .env (fail-closed jika missing).
 */
import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing. Authentication cannot proceed.");
  }
  return new TextEncoder().encode(secret);
}

const ALG = "HS256";

export interface TokenPayload {
  sub: string;
  role: "admin";
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token dari Authorization: Bearer *** header.
 */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
