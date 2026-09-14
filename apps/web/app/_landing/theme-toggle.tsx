"use client";

import { useEffect, useState } from "react";
import styles from "./landing.module.css";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("beermacs-theme", next);
  }

  return (
    <button
      className={styles.themeToggle}
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className={styles.themeTrack} aria-hidden="true">
        <span className={styles.themeThumb}>{theme === "dark" ? "☾" : "☀"}</span>
      </span>
      <span className={styles.themeLabel}>{theme}</span>
    </button>
  );
}
