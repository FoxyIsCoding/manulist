import { renderLayout } from "./layout";
import { fetchAuth } from "./auth";
import "@m3e/web/search";
import "@m3e/web/list";

(async () => {
  const auth = await fetchAuth();
  renderLayout({ title: "ManuList", subtitle: "Manage your world", user: auth.user });
})();

interface AnimeResult {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { medium?: string; large?: string };
  format?: string;
  episodes?: number;
  genres?: string[];
  averageScore?: number;
  season?: string;
  seasonYear?: number;
}

function buildResultItem(anime: AnimeResult): string {
  const title = anime.title?.romaji || anime.title?.english || anime.title?.native || "Unknown";
  const img = anime.coverImage?.medium || anime.coverImage?.large || "";
  const meta = [anime.format, anime.episodes ? `${anime.episodes} eps` : "", anime.averageScore ? `${anime.averageScore}%` : ""]
    .filter(Boolean)
    .join(" · ");
  const year = anime.seasonYear ? ` (${anime.seasonYear})` : "";

  return `
    <m3e-list-action data-id="${anime.id}" onclick="window.location.href='/anime?id=${anime.id}'">
      <img slot="leading" src="${img}" alt="${title}" style="border-radius: 8px;" loading="lazy" />
      ${title}${year}
      <span slot="supporting-text">${meta || "Anime"}</span>
    </m3e-list-action>
  `;
}

const searchView = document.querySelector("m3e-search-view");
const searchList = searchView?.querySelector("m3e-list");

let debounceTimer: ReturnType<typeof setTimeout>;

searchView?.addEventListener("query", (e: Event) => {
  const term = (e as CustomEvent).detail?.term?.trim();
  clearTimeout(debounceTimer);

  if (!term || term.length < 2) {
    if (searchList) searchList.innerHTML = "";
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results = (data?.results ?? []) as AnimeResult[];

      if (searchList) {
        if (results.length === 0) {
          searchList.innerHTML = `<m3e-list-item><span slot="supporting-text">No results for "${term}"</span></m3e-list-item>`;
        } else {
          searchList.innerHTML = results.map(buildResultItem).join("");
        }
      }
    } catch (err) {
      console.error("Search failed:", err);
      if (searchList) {
        searchList.innerHTML = `<m3e-list-item><span slot="supporting-text">Search failed. Try again.</span></m3e-list-item>`;
      }
    }
  }, 300);
});
