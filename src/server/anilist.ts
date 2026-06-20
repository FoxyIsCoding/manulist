import { ANILIST_API } from "./config";

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: { message: string }[];
}

export async function anilistQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    try {
      const errJson = await res.json() as any;
      console.error("AniList API error response body:", JSON.stringify(errJson, null, 2));
      if (errJson.errors?.length) {
        throw new Error(`AniList API error ${res.status}: ${errJson.errors.map((e: any) => e.message).join("; ")}`);
      }
    } catch {
      // Ignore JSON parse error, fallback to throwing generic status error
    }
    throw new Error(`AniList API error: ${res.status}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("No data returned from AniList");
  }
  return json.data;
}

export const SEARCH_QUERY = `
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

export const DETAIL_QUERY = `
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
    isFavourite
    mediaListEntry {
      id
      status
      progress
      score
      repeat
      priority
      private
      notes
      startedAt { year month day }
      completedAt { year month day }
      updatedAt
    }
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

export const VIEWER_QUERY = `
query {
  Viewer {
    id
    name
    about
    avatar { large medium }
    bannerImage
    siteUrl
    createdAt
    options { titleLanguage displayAdultContent }
    statistics {
      anime {
        count
        episodes: episodesWatched
        minutes: minutesWatched
        meanScore
        standardDeviation
        genres { genre count }
        statuses { status count }
        formats { format count }
      }
    }
    favourites {
      anime { pageInfo { total } }
      manga { pageInfo { total } }
      characters { pageInfo { total } }
      staff { pageInfo { total } }
      studios { pageInfo { total } }
    }
  }
}
`;

export const USER_QUERY = `
query ($name: String) {
  User(name: $name) {
    id
    name
    about
    avatar { large medium }
    bannerImage
    siteUrl
    createdAt
    statistics {
      anime {
        count
        episodes: episodesWatched
        minutes: minutesWatched
        meanScore
        statuses { status count }
      }
    }
    favourites {
      anime { pageInfo { total } }
      manga { pageInfo { total } }
      characters { pageInfo { total } }
      staff { pageInfo { total } }
      studios { pageInfo { total } }
    }
  }
}
`;

export const ACTIVITY_QUERY = `
query ($page: Int, $userId: Int) {
  Page(page: $page, perPage: 25) {
    pageInfo { hasNextPage total }
    activities(userId: $userId, sort: ID_DESC) {
      ... on ListActivity {
        id
        type
        status
        progress
        createdAt
        isLocked
        user { id name avatar { medium } siteUrl }
        media {
          id
          type
          title { romaji english }
          coverImage { medium }
          format
        }
      }
      ... on TextActivity {
        id
        text
        createdAt
        isLocked
        user { id name avatar { medium } siteUrl }
      }
      ... on MessageActivity {
        id
        message
        createdAt
        isLocked
        messenger { id name avatar { medium } siteUrl }
        recipient { id name avatar { medium } }
      }
    }
  }
}
`;

export const EXPLORE_QUERY = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $genre: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage total }
    media(type: ANIME, sort: $sort, season: $season, seasonYear: $seasonYear, genre: $genre, isAdult: false) {
      id
      title { romaji english }
      coverImage { medium large }
      format
      episodes
      averageScore
      popularity
      season
      seasonYear
      status
      genres
    }
  }
}
`;

export const LIBRARY_QUERY = `
query ($userId: Int, $status: MediaListStatus, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage total }
    mediaList(userId: $userId, type: ANIME, status: $status, sort: UPDATED_TIME_DESC) {
      id
      status
      progress
      score
      repeat
      notes
      updatedAt
      media {
        id
        title { romaji english }
        coverImage { medium }
        episodes
        averageScore
        format
        status
      }
    }
  }
}
`;

export const SAVE_LIST_MUTATION = `
mutation ($id: Int, $mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float, $scoreRaw: Int, $notes: String, $repeat: Int, $priority: Int, $private: Boolean) {
  SaveMediaListEntry(id: $id, mediaId: $mediaId, status: $status, progress: $progress, score: $score, scoreRaw: $scoreRaw, notes: $notes, repeat: $repeat, priority: $priority, private: $private) {
    id
    status
    progress
    score
    notes
    repeat
    priority
    private
    updatedAt
  }
}
`;

export const DELETE_LIST_MUTATION = `
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) {
    deleted
  }
}
`;

export const TOGGLE_FAVOURITE_MUTATION = `
mutation ($animeId: Int) {
  ToggleFavourite(animeId: $animeId) {
    anime { id isFavourite favourites }
  }
}
`;

export const UPDATE_ABOUT_MUTATION = `
mutation ($about: String) {
  UpdateUser(about: $about) {
    id
    about
  }
}
`;

/** Lightweight query for Open Graph / Twitter Card meta tags on anime detail pages. */
export const OG_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    coverImage { extraLarge large }
    description
  }
}
`;

export function currentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let season: string;
  if (month >= 1 && month <= 3) season = "WINTER";
  else if (month >= 4 && month <= 6) season = "SPRING";
  else if (month >= 7 && month <= 9) season = "SUMMER";
  else season = "FALL";
  return { season, year };
}
