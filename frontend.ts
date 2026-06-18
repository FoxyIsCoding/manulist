import "@m3e/web/theme";
import "@m3e/web/app-bar";
import "@m3e/web/nav-bar";
import "@m3e/web/button";
import "@m3e/web/icon";
import "@m3e/web/icon-button";
import "@m3e/web/card";
import "@m3e/web/heading";

document.querySelectorAll("m3e-button[toggle]").forEach((btn) => {
  btn.addEventListener("change", (e) => {
    const target = e.target as HTMLElement;
    const isSelected = target.hasAttribute("selected");
    const labelSlot = target.querySelector('[slot="icon"] ~ :not([slot])') as HTMLElement | null;
    if (labelSlot) {
      labelSlot.textContent = isSelected ? "Liked" : "Off";
    }
  });
});
