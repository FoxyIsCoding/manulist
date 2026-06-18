import index from "./src/pages/index.html";
import test from "./src/pages/test.html";
import anime from "./src/pages/anime.html";

const ANILIST_API = "https://graphql.anilist.co";

const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      coverImage { medium large }
      format
      episodes
      genres
      averageScore
      season
      seasonYear
    }
  }
}
`;

const DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { extraLarge large medium }
    bannerImage
    description
    episodes
    duration
    status
    season
    seasonYear
    format
    genres
    tags { name rank isMediaSpoiler }
    averageScore
    meanScore
    popularity
    favourites
    studios(isMain: true) { nodes { name id } }
    staff(page: 1, perPage: 15) {
      edges {
        role
        node { id name { full } image { medium } }
      }
    }
    characters(page: 1, perPage: 15) {
      edges {
        role
        node { id name { full } image { medium } }
        voiceActors(language: JAPANESE) {
          id name { full } image { medium }
        }
      }
    }
    trailer { id site thumbnail }
    externalLinks { url site type color icon }
    source
    rankings { rank type allTime context }
    streamingEpisodes { title thumbnail url site }
    relations {
      edges {
        relationType
        node { id title { romaji } format coverImage { medium } averageScore }
      }
    }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    siteUrl
  }
}
`;

Bun.serve({
  routes: {
    "/": index,
    "/*": index,
    "/test": test,
    "/anime": anime,
    "/api/search": {
      GET: async (req) => {
        const url = new URL(req.url);
        const q = url.searchParams.get("q")?.trim();
        if (!q || q.length < 2) {
          return Response.json({ results: [] });
        }

        const res = await fetch(ANILIST_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: SEARCH_QUERY,
            variables: { search: q, page: 1, perPage: 10 },
          }),
        });

        if (!res.ok) {
          return new Response("AniList API error", { status: res.status });
        }

        const data = await res.json();
        const media = data?.data?.Page?.media ?? [];
        return Response.json({ results: media });
      },
    },
    "/api/anime/:id": {
      GET: async (req) => {
        const id = parseInt(req.params.id ?? "", 10);
        if (isNaN(id) || id <= 0) {
          return Response.json({ error: "Invalid ID" }, { status: 400 });
        }

        const res = await fetch(ANILIST_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: DETAIL_QUERY,
            variables: { id },
          }),
        });

        if (!res.ok) {
          return new Response("AniList API error", { status: res.status });
        }

        const data = await res.json();
        const media = data?.data?.Media ?? null;
        if (!media) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        return Response.json({ anime: media });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Manulist running at http://localhost:3000");
