"use client";

import { Palette } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "saranankara-store-theme";
const THEME_CHANGE_EVENT = "saranankara-theme-change";

type StoreTheme = "classic" | "graphite";

function setDocumentTheme(theme: StoreTheme) {
  if (theme === "graphite") document.documentElement.dataset.storeTheme = "graphite";
  else delete document.documentElement.dataset.storeTheme;
}

function getThemeSnapshot(): StoreTheme {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "graphite" ? "graphite" : "classic";
}

function subscribeToTheme(onStoreChange: () => void) {
  const onThemeChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener("storage", onStorage);
  };
}

function updateTheme(theme: StoreTheme) {
  setDocumentTheme(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent<StoreTheme>(THEME_CHANGE_EVENT, { detail: theme }));
}

export function ColorThemeSwitch({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const theme = useSyncExternalStore<StoreTheme>(subscribeToTheme, getThemeSnapshot, () => "classic");

  useEffect(() => {
    setDocumentTheme(theme);
  }, [theme]);

  const isGraphite = theme === "graphite";

  return <button
    type="button"
    className={`color-theme-switch ${compact ? "is-compact" : ""} ${className}`.trim()}
    aria-label={isGraphite ? "Use classic green colours" : "Use graphite colours"}
    aria-pressed={isGraphite}
    onClick={() => updateTheme(isGraphite ? "classic" : "graphite")}
  >
    <Palette aria-hidden="true" size={16}/>
    <span className="color-theme-switch-label">{compact ? "Graphite colours" : "Graphite"}</span>
    <span className="color-theme-switch-track" aria-hidden="true"><span/></span>
  </button>;
}
