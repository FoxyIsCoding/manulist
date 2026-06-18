export const ANILIST_API = "https://graphql.anilist.co";
export const ANILIST_AUTH_URL = "https://anilist.co/api/v2/oauth/authorize";
export const ANILIST_TOKEN_URL = "https://anilist.co/api/v2/oauth/token";

export const CLIENT_ID = process.env.ANILIST_CLIENT_ID ?? "";
export const CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET ?? "";
export const REDIRECT_URI =
  process.env.ANILIST_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";

export const SESSION_COOKIE = "anilist_token";

export function authConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}
