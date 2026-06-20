import { renderLayout } from "./layout";
import {
  fetchAuth,
  logout,
  loginUrl,
  htmlEncode,
  escapeAttr,
  statusLabel,
  showSnackbar,
} from "./auth";
import "@m3e/web/heading";
import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/skeleton";
import "@m3e/web/icon";
import "@m3e/web/avatar";
import "@m3e/web/list";
import "@m3e/web/divider";
import "@m3e/web/shape";

interface UserProfile {
  id: number;
  name: string;
  about?: string;
  avatar?: { large?: string; medium?: string };
  bannerImage?: string;
  siteUrl?: string;
  createdAt?: number;
  statistics?: {
    anime?: {
      count?: number;
      episodes?: number;
      minutes?: number;
      meanScore?: number;
      statuses?: { status: string; count: number }[];
    };
  };
  favourites?: { anime?: number; manga?: number; characters?: number; staff?: number; studios?: number };
}

const pageContent = document.getElementById("page-content")!;
const params = new URLSearchParams(window.location.search);
const profileName = params.get("name");
const error = params.get("error");

function renderLoginPrompt(configured: boolean): void {
  pageContent.innerHTML = `
    <div class="page-container profile-login">
      <m3e-card>
        <div class="card-content profile-login-content">
          <m3e-icon name="account_circle" style="font-size:4rem"></m3e-icon>
          <m3e-heading level="2">Sign in with AniList</m3e-heading>
          <p>Connect your AniList account to manage your lists, track progress, and sync your library.</p>
          ${
            configured
              ? `<m3e-button variant="filled" id="login-btn">
                  <m3e-icon slot="icon" name="login"></m3e-icon>
                  Login with AniList
                </m3e-button>`
              : `<p class="error-text">OAuth not configured. Add ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET to your .env file.</p>`
          }
          ${error ? `<p class="error-text">Login failed: ${htmlEncode(error)}</p>` : ""}
        </div>
      </m3e-card>
    </div>
  `;

  document.getElementById("login-btn")?.addEventListener("click", () => {
    window.location.href = loginUrl();
  });
}

function renderProfile(user: UserProfile, isOwn: boolean): void {
  const avatar = user.avatar?.large || user.avatar?.medium || "";
  const banner = user.bannerImage || "";
  const stats = user.statistics?.anime;
  const favs = user.favourites;

  const statusBreakdown = stats?.statuses
    ?.map((s) => `<m3e-chip variant="assist">${htmlEncode(statusLabel(s.status))}: ${s.count}</m3e-chip>`)
    .join("") ?? "";

  pageContent.innerHTML = `
    <div class="profile-page">
      <div class="profile-banner" style="${banner ? `background-image:url('${escapeAttr(banner)}')` : ""}">
        <div class="profile-banner-overlay"></div>
        <div class="profile-header">
          <m3e-shape class="profile-avatar" name="7-sided-cookie"><img  src="${escapeAttr(avatar)}" alt="${htmlEncode(user.name)}" size="large"></img></m3e-shape>
          <div class="profile-title">
            <m3e-heading level="1">${htmlEncode(user.name)}</m3e-heading>
            ${user.siteUrl ? `<a href="${escapeAttr(user.siteUrl)}" target="_blank" rel="noopener">View on AniList</a>` : ""}
          </div>
        </div>
      </div>
      

      <div class="page-container">

        <m3e-heading level="2" style="margin-bottom: 1rem;">About</m3e-heading>

        <m3e-action-list variant="segmented">
          <m3e-list-action>
            <m3e-icon slot="leading" name="movie"></m3e-icon>
            ${stats?.count ?? 0}
            <span slot="supporting-text">Anime</span>
          </m3e-list-action>
          <m3e-list-action>
            <m3e-icon slot="leading" name="smart_display"></m3e-icon>
            ${stats?.episodes ?? 0}
            <span slot="supporting-text">Episodes</span>
          </m3e-list-action>
          <m3e-list-action>
            <m3e-icon slot="leading" name="schedule"></m3e-icon>
            ${stats?.minutes ? Math.round(stats.minutes / 60 / 24 * 10) / 10 : 0}
            <span slot="supporting-text">Days Watched</span>
          </m3e-list-action>
          <m3e-list-action>
            <m3e-icon slot="leading" name="star"></m3e-icon>
            ${stats?.meanScore ? `${stats.meanScore}%` : "—"}
            <span slot="supporting-text">Mean Score</span>
          </m3e-list-action>
        </m3e-action-list>

        ${
          favs
            ? `
        <section class="profile-section">
          <m3e-heading level="3" style="margin-bottom: 1rem;">Favourites</m3e-heading>
          <div class="tags-row">
            ${favs.anime ? `<m3e-chip>Anime: ${favs.anime}</m3e-chip>` : "<m3e-chip>Anime: 0</m3e-chip>"}
            ${favs.characters ? `<m3e-chip>Characters: ${favs.characters}</m3e-chip>` : "<m3e-chip>Characters: 0</m3e-chip>"}
            ${favs.staff ? `<m3e-chip>Staff: ${favs.staff}</m3e-chip>` : "<m3e-chip>Staff: 0</m3e-chip>"}
            ${favs.studios ? `<m3e-chip>Studios: ${favs.studios}</m3e-chip>` : "<m3e-chip>Studios: 0</m3e-chip>"}
          </div>
        </section>`
            : ""
        }

        ${
          statusBreakdown
            ? `
        <section class="profile-section">
          <m3e-heading level="3" style="margin-bottom: 1rem;">List Breakdown</m3e-heading>
          <div class="tags-row">${statusBreakdown}</div>
        </section>`
            : ""
        }

        <section class="profile-section">
          <m3e-heading level="3" style="margin-bottom: 1rem;">Quick Links</m3e-heading>
          <m3e-button-group variant="connected">
            <m3e-button variant="tonal" onclick="window.location.href='/activity?userId=${user.id}'">
              <m3e-icon slot="icon" name="update"></m3e-icon>
              Activity
            </m3e-button>
            <m3e-button variant="tonal" onclick="window.location.href='/library'">
              <m3e-icon slot="icon" name="newsstand"></m3e-icon>
              Library
            </m3e-button>
            <m3e-button variant="tonal" onclick="window.location.href='/explore'">
              <m3e-icon slot="icon" name="explore"></m3e-icon>
              Explore
            </m3e-button>
          </m3e-button-group>
        </section>
      </div>
    </div>
  `;

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await logout();
    window.location.href = "/profile";
  });

  document.getElementById("save-about-btn")?.addEventListener("click", async () => {
    const about = (document.getElementById("about-input") as HTMLTextAreaElement)?.value ?? "";
    try {
      const res = await fetch("/api/profile/about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about }),
      });
      if (!res.ok) throw new Error("Failed to save");
      showSnackbar("About updated!");
    } catch {
      showSnackbar("Failed to update about");
    }
  });
}

(async () => {
  const auth = await fetchAuth();

  if (profileName) {
    renderLayout({ title: profileName, subtitle: "Profile", user: auth.user });
    pageContent.innerHTML = `<div class="page-container"><m3e-skeleton style="height:200px;border-radius:16px" variant="rounded"></m3e-skeleton></div>`;
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(profileName)}`);
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();
      renderProfile(data.user, auth.user?.name === profileName);
    } catch {
      pageContent.innerHTML = `<div class="empty-state"><p>User not found.</p></div>`;
    }
    return;
  }

  if (!auth.user) {
    renderLayout({ title: "Profile", subtitle: "Sign in", user: null });
    renderLoginPrompt(auth.configured);
    return;
  }

  renderLayout({ title: auth.user.name, subtitle: "Your profile", user: auth.user });
  renderProfile(auth.user as UserProfile, true);
})();
