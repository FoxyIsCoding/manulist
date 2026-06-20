import index from "./src/pages/index.html";
import test from "./src/pages/test.html";
import anime from "./src/pages/anime.html";
import explore from "./src/pages/explore.html";
import activity from "./src/pages/activity.html";
import profile from "./src/pages/profile.html";
import library from "./src/pages/library.html";

import {
  SEARCH_QUERY,
  DETAIL_QUERY,
  OG_QUERY,
  USER_QUERY,
  ACTIVITY_QUERY,
  EXPLORE_QUERY,
  LIBRARY_QUERY,
  SAVE_LIST_MUTATION,
  DELETE_LIST_MUTATION,
  TOGGLE_FAVOURITE_MUTATION,
  UPDATE_ABOUT_MUTATION,
  anilistQuery,
  currentSeason,
} from "./src/server/anilist";
import { loginRedirect, authCallback, logout, getViewer } from "./src/server/auth";
import { getToken } from "./src/server/session";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stripAnimeDescription(desc: string): string {
  return desc
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/__/g, "")
    .replace(/~.*?~/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SORT_MAP: Record<string, string[]> = {
  trending: ["TRENDING_DESC"],
  popular: ["POPULARITY_DESC"],
  top: ["SCORE_DESC"],
  seasonal: ["POPULARITY_DESC"],
};

Bun.serve({
  routes: {
    "/": index,
    "/explore": explore,
    "/activity": activity,
    "/profile": profile,
    "/library": library,
    "/anime": anime,
    "/test": test,

    "/api/auth/login": {
      GET: () => loginRedirect(),
    },
    "/api/auth/callback": {
      GET: (req) => authCallback(req),
    },
    "/api/auth/logout": {
      POST: () => logout(),
    },
    "/api/auth/me": {
      GET: (req) => getViewer(getToken(req)),
    },

    "/api/search": {
      GET: async (req) => {
        const url = new URL(req.url);
        const q = url.searchParams.get("q")?.trim();
        if (!q || q.length < 2) {
          return Response.json({ results: [] });
        }

        try {
          const data = await anilistQuery<{ Page: { media: unknown[] } }>(SEARCH_QUERY, {
            search: q,
            page: 1,
            perPage: 15,
          });
          return Response.json({ results: data.Page.media ?? [] });
        } catch (err) {
          console.error("Search error:", err);
          return new Response("AniList API error", { status: 502 });
        }
      },
    },

    "/api/anime/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id ?? "", 10);
        if (isNaN(id) || id <= 0) {
          return Response.json({ error: "Invalid ID" }, { status: 400 });
        }

        try {
          const token = getToken(req);
          const data = await anilistQuery<{ Media: unknown }>(DETAIL_QUERY, { id }, token);
          if (!data.Media) {
            return Response.json({ error: "Not found" }, { status: 404 });
          }
          return Response.json({ anime: data.Media });
        } catch (err) {
          console.error("Detail error:", err);
          return new Response("AniList API error", { status: 502 });
        }
      },
    },

    "/api/user/:name": {
      GET: async (req) => {
        const name = req.params.name;
        if (!name) {
          return Response.json({ error: "Name required" }, { status: 400 });
        }

        try {
          const data = await anilistQuery<{ User: any }>(USER_QUERY, { name });
          if (!data.User) {
            return Response.json({ error: "User not found" }, { status: 404 });
          }
          const user = data.User;
          if (user && user.favourites) {
            user.favourites = {
              anime: user.favourites.anime?.pageInfo?.total ?? 0,
              manga: user.favourites.manga?.pageInfo?.total ?? 0,
              characters: user.favourites.characters?.pageInfo?.total ?? 0,
              staff: user.favourites.staff?.pageInfo?.total ?? 0,
              studios: user.favourites.studios?.pageInfo?.total ?? 0,
            };
          }
          return Response.json({ user });
        } catch (err) {
          console.error("User error:", err);
          return new Response("AniList API error", { status: 502 });
        }
      },
    },

    "/api/explore": {
      GET: async (req) => {
        const url = new URL(req.url);
        const tab = url.searchParams.get("tab") ?? "trending";
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const genre = url.searchParams.get("genre") ?? undefined;

        const sort = SORT_MAP[tab] ?? SORT_MAP.trending;
        const variables: Record<string, unknown> = {
          page: Math.max(1, page),
          perPage: 24,
          sort,
        };

        if (tab === "seasonal") {
          const { season, year } = currentSeason();
          variables.season = season;
          variables.seasonYear = year;
        }
        if (genre) variables.genre = genre;

        try {
          const data = await anilistQuery<{ Page: { media: unknown[]; pageInfo: unknown } }>(
            EXPLORE_QUERY,
            variables,
          );
          return Response.json({
            media: data.Page.media ?? [],
            pageInfo: data.Page.pageInfo,
            tab,
            season: tab === "seasonal" ? currentSeason() : null,
          });
        } catch (err) {
          console.error("Explore error:", err);
          return new Response("AniList API error", { status: 502 });
        }
      },
    },

    "/api/activity": {
      GET: async (req) => {
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const userId = url.searchParams.get("userId");
        const token = getToken(req);

        try {
          const data = await anilistQuery<{ Page: { activities: unknown[]; pageInfo: unknown } }>(
            ACTIVITY_QUERY,
            {
              page: Math.max(1, page),
              userId: userId ? parseInt(userId, 10) : undefined,
            },
            token,
          );
          return Response.json({
            activities: data.Page.activities ?? [],
            pageInfo: data.Page.pageInfo,
          });
        } catch (err) {
          console.error("Activity error:", err);
          return new Response("AniList API error", { status: 502 });
        }
      },
    },

    "/api/library": {
      GET: async (req) => {
        const token = getToken(req);
        if (!token) {
          return Response.json({ error: "Login required" }, { status: 401 });
        }

        const url = new URL(req.url);
        const status = url.searchParams.get("status") ?? undefined;
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const userId = url.searchParams.get("userId");

        try {
          const viewer = await anilistQuery<{ Viewer: { id: number } }>(
            `query { Viewer { id } }`,
            undefined,
            token,
          );

          const data = await anilistQuery<{ Page: { mediaList: unknown[]; pageInfo: unknown } }>(
            LIBRARY_QUERY,
            {
              userId: userId ? parseInt(userId, 10) : viewer.Viewer.id,
              status: status || undefined,
              page: Math.max(1, page),
              perPage: 50,
            },
            token,
          );

          return Response.json({
            entries: data.Page.mediaList ?? [],
            pageInfo: data.Page.pageInfo,
          });
        } catch (err) {
          console.error("Library error:", err);
          return new Response("AniList API error", { status: 502 });
        }
      },
    },

    "/api/list": {
      POST: async (req) => {
        const token = getToken(req);
        if (!token) {
          return Response.json({ error: "Login required" }, { status: 401 });
        }

        try {
          const body = (await req.json()) as Record<string, unknown>;
          const data = await anilistQuery<{ SaveMediaListEntry: unknown }>(
            SAVE_LIST_MUTATION,
            body,
            token,
          );
          return Response.json({ entry: data.SaveMediaListEntry });
        } catch (err) {
          console.error("Save list error:", err);
          return Response.json({ error: String(err) }, { status: 400 });
        }
      },
    },

    "/api/list/:id": {
      DELETE: async (req) => {
        const token = getToken(req);
        if (!token) {
          return Response.json({ error: "Login required" }, { status: 401 });
        }

        const id = parseInt(req.params.id ?? "", 10);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid ID" }, { status: 400 });
        }

        try {
          const data = await anilistQuery<{ DeleteMediaListEntry: { deleted: boolean } }>(
            DELETE_LIST_MUTATION,
            { id },
            token,
          );
          return Response.json({ deleted: data.DeleteMediaListEntry.deleted });
        } catch (err) {
          console.error("Delete list error:", err);
          return Response.json({ error: String(err) }, { status: 400 });
        }
      },
    },

    "/api/favourite": {
      POST: async (req) => {
        const token = getToken(req);
        if (!token) {
          return Response.json({ error: "Login required" }, { status: 401 });
        }

        try {
          const { animeId } = (await req.json()) as { animeId: number };
          const data = await anilistQuery<{ ToggleFavourite: unknown }>(
            TOGGLE_FAVOURITE_MUTATION,
            { animeId },
            token,
          );
          return Response.json({ result: data.ToggleFavourite });
        } catch (err) {
          console.error("Favourite error:", err);
          return Response.json({ error: String(err) }, { status: 400 });
        }
      },
    },

    "/api/profile/about": {
      POST: async (req) => {
        const token = getToken(req);
        if (!token) {
          return Response.json({ error: "Login required" }, { status: 401 });
        }

        try {
          const { about } = (await req.json()) as { about: string };
          const data = await anilistQuery<{ UpdateUser: unknown }>(
            UPDATE_ABOUT_MUTATION,
            { about },
            token,
          );
          return Response.json({ user: data.UpdateUser });
        } catch (err) {
          console.error("Update about error:", err);
          return Response.json({ error: String(err) }, { status: 400 });
        }
      },
    },

    "/*": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Manulist running at http://localhost:3000");
