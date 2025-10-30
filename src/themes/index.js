import classic from "./classic.json" with { type: "json" };
import neon from "./neon.json" with { type: "json" };
import haunted from "./haunted.json" with { type: "json" };
import modern from "./modern.json" with { type: "json" };

const THEME_MAP = new Map([classic, neon, haunted, modern].map((theme) => [theme.id, theme]));

export function listThemes() {
  return Array.from(THEME_MAP.values());
}

export function getTheme(id) {
  return THEME_MAP.get(id) ?? THEME_MAP.get("classic");
}

export function createThemeManager(initialId = "classic") {
  let active = getTheme(initialId);
  const listeners = new Set();

  function setTheme(id) {
    const next = getTheme(id);
    if (!next || next.id === active.id) return active;
    active = next;
    listeners.forEach((listener) => listener(active));
    return active;
  }

  return {
    get theme() {
      return active;
    },
    setTheme,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    list() {
      return listThemes();
    },
  };
}
