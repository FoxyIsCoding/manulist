import { SESSION_COOKIE } from "./config";

export function getToken(req: Request): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export function setTokenCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}

export function clearTokenCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
