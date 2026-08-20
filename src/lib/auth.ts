/**
 * JWT auth — simple single-user (Fakhri).
 * Secret dari env, token berlaku 7 hari.
 */
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "vania-memory-manager-fakhri-2026"
);
const ALG = "HS256";

export interface TokenPayload {
  sub: string;
  role: "admin";
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token dari Authorization: Bearer xxx atau cookie.
 */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
