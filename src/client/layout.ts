import "@m3e/web/theme";
import "@m3e/web/app-bar";
import "@m3e/web/nav-bar";
import "@m3e/web/icon";
import "@m3e/web/icon-button";
import "@m3e/web/chips";
import "@m3e/web/button-group";
import "@m3e/web/avatar";
import type { AuthUser } from "./auth";

export interface LayoutConfig {
  title: string;
  subtitle?: string;
  user?: AuthUser | null;
}

export function renderLayout(config: LayoutConfig): void {
  const body = document.body;
  const pageContent = document.getElementById("page-content");
  if (!pageContent) return;

  while (body.firstChild) body.removeChild(body.firstChild);

  const theme = document.createElement("m3e-theme");
  theme.setAttribute("color", "#13181e");
  theme.setAttribute("scheme", "auto");
  theme.setAttribute("motion", "expressive");
  theme.setAttribute("strong-focus", "");

  const appBar = document.createElement("m3e-app-bar");
  appBar.setAttribute("size", "medium");

  const menuBtn = document.createElement("m3e-icon-button");
  menuBtn.setAttribute("slot", "leading");
  menuBtn.setAttribute("aria-label", "Menu");
  const menuIcon = document.createElement("m3e-icon");
  menuIcon.setAttribute("name", "menu");
  menuBtn.appendChild(menuIcon);
  appBar.appendChild(menuBtn);

  const titleSpan = document.createElement("span");
  titleSpan.setAttribute("slot", "title");
  titleSpan.textContent = config.title;
  appBar.appendChild(titleSpan);

  if (config.subtitle) {
    const subSpan = document.createElement("span");
    subSpan.setAttribute("slot", "subtitle");
    subSpan.textContent = config.subtitle;
    appBar.appendChild(subSpan);
  }

  const settingsBtn = document.createElement("m3e-icon-button");
  settingsBtn.setAttribute("slot", "trailing");
  settingsBtn.setAttribute("aria-label", "Settings");
  settingsBtn.setAttribute("variant", "tonal");
  const settingsIcon = document.createElement("m3e-icon");
  settingsIcon.setAttribute("name", "settings");
  settingsBtn.appendChild(settingsIcon);
  appBar.appendChild(settingsBtn);
  settingsBtn.addEventListener("click", () => {
    window.location.href = "/settings";
  });

  const profileBtn = document.createElement("m3e-icon-button");
  profileBtn.setAttribute("slot", "trailing");
  profileBtn.setAttribute("aria-label", "Profile");
  profileBtn.setAttribute("variant", "tonal");
  profileBtn.setAttribute("width", "wide");
  profileBtn.addEventListener("click", () => {
    window.location.href = config.user ? `/profile` : "/profile";
  });
  const avatarIcon = document.createElement("m3e-icon");
  avatarIcon.setAttribute("name", "account_circle");
  profileBtn.appendChild(avatarIcon);
  appBar.appendChild(profileBtn);

  const navBar = document.createElement("m3e-nav-bar");
  navBar.setAttribute("mode", "extended");

  const navItems = [
    { icon: "globe", label: "Home", path: "/" },
    { icon: "explore", label: "Explore", path: "/explore" },
    { icon: "update", label: "Activity", path: "/activity" },
    { icon: "newsstand", label: "Library", path: "/library" },
  ];

  const currentPath = window.location.pathname;

  for (const item of navItems) {
    const navItem = document.createElement("m3e-nav-item");
    if (currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path))) {
      navItem.setAttribute("selected", "");
    }
    const icon = document.createElement("m3e-icon");
    icon.setAttribute("name", item.icon);
    icon.setAttribute("slot", "icon");
    navItem.appendChild(icon);
    navItem.appendChild(document.createTextNode(` ${item.label}`));
    navItem.addEventListener("click", () => {
      window.location.href = item.path;
    });
    navBar.appendChild(navItem);
  }

  theme.appendChild(appBar);
  theme.appendChild(pageContent);
  theme.appendChild(navBar);
  body.appendChild(theme);
}
