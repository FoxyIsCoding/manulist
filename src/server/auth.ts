import {
  ANILIST_AUTH_URL,
  ANILIST_TOKEN_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  authConfigured,
} from "./config";
import { clearTokenCookie, setTokenCookie } from "./session";
import { VIEWER_QUERY, anilistQuery } from "./anilist";

export function loginRedirect(): Response {
  if (!authConfigured()) {
    return Response.json(
      { error: "AniList OAuth not configured. Set ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET in .env" },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
  });

  return Response.redirect(`${ANILIST_AUTH_URL}?${params}`, 302);
}

export async function authCallback(req: Request): Promise<Response> {
  if (!authConfigured()) {
    return Response.redirect("/profile?error=oauth_not_configured", 302);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return Response.redirect(`/profile?error=${encodeURIComponent(error ?? "no_code")}`, 302);
  }

  try {
    const res = await fetch(ANILIST_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Token exchange failed:", text);
      return Response.redirect("/profile?error=token_exchange_failed", 302);
    }

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      return Response.redirect("/profile?error=no_token", 302);
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/profile",
        "Set-Cookie": setTokenCookie(data.access_token),
      },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return Response.redirect("/profile?error=auth_failed", 302);
  }
}

export function logout(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearTokenCookie(),
    },
  });
}

export async function getViewer(token: string | null): Promise<Response> {
  if (!token) {
    return Response.json({ user: null, configured: authConfigured() });
  }

  try {
    const data = await anilistQuery<{ Viewer: any }>(VIEWER_QUERY, undefined, token);
    const viewer = data.Viewer;
    if (viewer && viewer.favourites) {
      viewer.favourites = {
        anime: viewer.favourites.anime?.pageInfo?.total ?? 0,
        manga: viewer.favourites.manga?.pageInfo?.total ?? 0,
        characters: viewer.favourites.characters?.pageInfo?.total ?? 0,
        staff: viewer.favourites.staff?.pageInfo?.total ?? 0,
        studios: viewer.favourites.studios?.pageInfo?.total ?? 0,
      };
    }
    return Response.json({ user: viewer, configured: authConfigured() });
  } catch (err) {
    console.error("Viewer fetch failed:", err);
    return Response.json(
      { user: null, configured: authConfigured(), error: "invalid_token" },
      { headers: { "Set-Cookie": clearTokenCookie() } },
    );
  }
}
