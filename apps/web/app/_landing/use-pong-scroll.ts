"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

export function usePongScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const render = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - innerHeight);
      const progress = clamp(-rect.top / distance);
      const mobile = innerWidth < 700;

      if (reduceMotion.matches) {
        section.dataset.ready = "true";
        section.dataset.reduced = "true";
        section.style.setProperty("--journey", "1");
        section.style.setProperty("--liquid", "1");
        return;
      }

      delete section.dataset.reduced;
      section.dataset.ready = "true";

      const flight = clamp((progress - 0.035) / 0.54);
      const xStart = mobile ? -innerWidth * 0.3 : -innerWidth * 0.38;
      const x = xStart * (1 - ease(flight));
      const startY = mobile ? -innerHeight * 0.27 : -innerHeight * 0.16;
      // The target rim sits at 68vh, so the shot and its cup share one endpoint.
      const endY = innerHeight * 0.18;
      const arc = Math.sin(flight * Math.PI) * (mobile ? innerHeight * 0.29 : innerHeight * 0.37);
      const topDown = ease(clamp((progress - 0.54) / 0.16));
      const y = (startY + (endY - startY) * flight - arc) * (1 - topDown);
      const impact = clamp((progress - 0.57) / 0.1);
      const zoom = clamp((progress - 0.7) / 0.18);
      const cupReveal = ease(clamp((progress - 0.1) / 0.25));
      const scale = 0.74 + flight * 0.42 - impact * 0.55;
      const followRelease = ease(clamp((progress - 0.36) / 0.18));
      const followX = -x * 0.18 * (1 - followRelease);

      section.style.setProperty("--journey", progress.toFixed(4));
      section.style.setProperty("--ball-x", `${x.toFixed(1)}px`);
      section.style.setProperty("--ball-y", `${y.toFixed(1)}px`);
      section.style.setProperty("--ball-scale", scale.toFixed(3));
      section.style.setProperty("--ball-spin", `${Math.round(flight * 1080)}deg`);
      section.style.setProperty("--ball-fade", String(1 - ease(impact)));
      section.style.setProperty("--cup-reveal", cupReveal.toFixed(3));
      section.style.setProperty("--impact", ease(impact).toFixed(3));
      section.style.setProperty("--top-down", topDown.toFixed(3));
      section.style.setProperty("--follow-x", `${followX.toFixed(1)}px`);
      section.style.setProperty(
        "--camera",
        (
          1 +
          ease(clamp((progress - 0.2) / 0.42)) * 0.14 +
          ease(zoom) * (mobile ? 7.2 : 9.2)
        ).toFixed(3)
      );
      section.style.setProperty("--liquid", ease(clamp((progress - 0.82) / 0.13)).toFixed(3));
      section.style.setProperty("--copy-fade", String(1 - ease(clamp((progress - 0.05) / 0.19))));
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    render();
    addEventListener("scroll", requestRender, { passive: true });
    addEventListener("resize", requestRender, { passive: true });
    reduceMotion.addEventListener("change", requestRender);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      removeEventListener("scroll", requestRender);
      removeEventListener("resize", requestRender);
      reduceMotion.removeEventListener("change", requestRender);
    };
  }, [ref]);
}
