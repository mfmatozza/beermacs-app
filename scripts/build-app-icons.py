#!/usr/bin/env python3
"""Regenerate apps/mobile/assets/* from the master Beermacs mark.

Local tool, not part of CI. Requires Pillow (`pip3 install --user Pillow`).
Run it whenever the master logo changes:

    python3 scripts/build-app-icons.py brand/beermacs-mark.png

Why a script rather than hand-exported files: the mark will be revised, and
five derived sizes with three different background rules is exactly the kind of
thing that silently drifts when done by hand. In particular:

  * icon.png must have NO alpha channel. Apple rejects app icons with one
    (that is the ITMS-90717 rejection), and a transparent PNG that looks fine
    in Finder fails at upload time.
  * Android adaptive icons are masked to a circle inscribed in the middle ~66%
    of the canvas, so the foreground needs far more padding than the iOS icon
    or the mark gets its corners shaved.
  * The monochrome layer (Android themed icons) is a silhouette, not a
    desaturation — colour has to be discarded entirely.
"""

import sys
from pathlib import Path

from PIL import Image

# The app's ground, from apps/mobile/tailwind.config.js (stout-900). The mark
# has a heavy black outline and a cream inner stroke: on a light ground the
# cream body disappears, on near-black the cream ring carries the shape.
GROUND = (10, 9, 8)

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "apps" / "mobile" / "assets"


def trimmed(src: Path) -> Image.Image:
    """The mark, cropped to its own ink."""
    im = Image.open(src).convert("RGBA")
    box = im.getchannel("A").getbbox()
    if box is None:
        raise SystemExit(f"{src} is fully transparent")
    return im.crop(box)


def fit(mark: Image.Image, canvas: int, coverage: float) -> Image.Image:
    """Centre `mark` on a transparent square, scaled to `coverage` of the side."""
    target = int(canvas * coverage)
    w, h = mark.size
    scale = target / max(w, h)
    resized = mark.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.paste(resized, ((canvas - resized.width) // 2, (canvas - resized.height) // 2), resized)
    return out


def on_ground(layer: Image.Image) -> Image.Image:
    """Flatten onto the brand ground and DROP the alpha channel."""
    bg = Image.new("RGBA", layer.size, GROUND + (255,))
    return Image.alpha_composite(bg, layer).convert("RGB")


def silhouette(layer: Image.Image) -> Image.Image:
    """White-on-transparent silhouette for Android's themed-icon layer."""
    alpha = layer.getchannel("A")
    out = Image.new("RGBA", layer.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    white = Image.new("RGBA", layer.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "brand" / "beermacs-mark.png"
    mark = trimmed(src)
    print(f"master {src.name}: {Image.open(src).size} → trimmed {mark.size}")

    # The mark itself, transparent, for in-app use (the centre tab button).
    mark_out = fit(mark, 512, 1.0)
    mark_out.save(ASSETS / "logo-mark.png")

    # iOS / store icon. Opaque, no alpha, modest padding.
    on_ground(fit(mark, 1024, 0.80)).save(ASSETS / "icon.png")

    # Splash. Transparent; Expo scales it and paints the background itself.
    fit(mark, 1024, 0.86).save(ASSETS / "splash-icon.png")

    # Android adaptive. Foreground needs the safe-zone padding.
    fit(mark, 1024, 0.60).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGB", (1024, 1024), GROUND).save(ASSETS / "android-icon-background.png")
    silhouette(fit(mark, 1024, 0.60)).save(ASSETS / "android-icon-monochrome.png")

    # Web favicon.
    on_ground(fit(mark, 196, 0.84)).save(ASSETS / "favicon.png")

    for name in sorted(p.name for p in ASSETS.glob("*.png")):
        im = Image.open(ASSETS / name)
        print(f"  {name:34} {im.size[0]:>4}x{im.size[1]:<4} {im.mode}")


if __name__ == "__main__":
    main()
