import jwt from "jsonwebtoken";
import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-jwt-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // default 7 days
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d"; // default 30 days

export function signJwt(payload: Record<string, unknown>, expiresIn?: string) {
  const opts: jwt.SignOptions = {};
  opts.expiresIn = expiresIn || JWT_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function signRefreshToken(payload: Record<string, unknown>) {
  // mark token as refresh token
  return signJwt({ ...payload, type: "refresh" }, JWT_REFRESH_EXPIRES_IN);
}

export function verifyJwt(token: string): { ok: true; payload: any } | { ok: false; error: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { ok: true, payload: decoded };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Invalid token" };
  }
}

export default { signJwt, signRefreshToken, verifyJwt };
