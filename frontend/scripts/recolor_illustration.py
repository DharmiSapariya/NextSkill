"""Recolors an SVG illustration into the NextSkill brand palette
(NextSkill_Final_Color_Usage_Guide_v2), used to produce everything under
src/assets/illustrations/.

Usage: python3 recolor_illustration.py input.svg output.svg

Technique: hue-bucket each distinct color found in the file into one of the
brand hue families (forest/periwinkle/lime), then render it within that
bucket's own calibrated saturation/lightness band, with the ORIGINAL color's
lightness remapped proportionally into that band. This keeps shape-to-shape
tonal contrast intact — two originally different-lightness shapes (e.g. skin
vs. hair) stay visually distinguishable after recoloring, instead of
collapsing into flat identical blobs the way forcing every color to one of
exactly five flat brand hex values would.

Handles both color formats seen in DrawKit-style exports:
  - #RRGGBB / #RGB hex, inside <style> class blocks (Illustrator SVG export)
  - rgb(r,g,b), inline style="fill:..." and gradient <stop style="stop-color:...">
"""
import colorsys
import re
import sys

BRAND = {
    "forest": "#1E3A2B",
    "periwinkle": "#CFDCFF",
    "lime": "#EFF87A",
    "cream": "#F8F4F0",
    "charcoal": "#171717",
    "white": "#FFFFFF",
}


def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(*[max(0, min(255, round(c))) for c in rgb])


def rgb_to_hsl(rgb):
    r, g, b = [c / 255 for c in rgb]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l


def hsl_to_rgb(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
    return r * 255, g * 255, b * 255


BRAND_HSL = {name: rgb_to_hsl(hex_to_rgb(hexv)) for name, hexv in BRAND.items()}

# Hand-tuned (saturation, lightness-range) per bucket — NOT the brand hex's own
# raw S/L. HSL saturation reads very differently at different lightness levels
# (the same S that looks like a soft pastel at L=0.9 looks like a neon glow at
# L=0.5), so reusing a brand color's exact S across an arbitrary L range
# produced garish results in testing. These are calibrated so every output in
# a bucket reads as "the same family as the swatch" at any input lightness.
BUCKET_STYLE = {
    "forest": (0.35, (0.14, 0.42)),
    "periwinkle": (0.50, (0.68, 0.90)),
    "lime": (0.62, (0.62, 0.83)),
}


def classify(hexv):
    r, g, b = hex_to_rgb(hexv)
    h, s, l = rgb_to_hsl((r, g, b))

    # Near-white: keep as a true neutral highlight, not flattened into periwinkle.
    if l >= 0.93 and s < 0.35:
        return BRAND["white"]
    # Near-black / true gray: charcoal, not colorized (nothing to hue-rotate).
    if s < 0.10:
        if l <= 0.35:
            return BRAND["charcoal"]
        if l >= 0.85:
            return BRAND["cream"]
        # mid-gray: a muted forest tint, so it doesn't stick out as literal gray
        bh = BRAND_HSL["forest"][0]
        return rgb_to_hex(hsl_to_rgb(bh, 0.15, l))

    # Chromatic: bucket by hue, then recolor within that bucket's calibrated
    # saturation/lightness band, remapping original L proportionally into it.
    if 35 <= h < 70:
        bucket = "lime"
    elif 70 <= h < 150:
        bucket = "forest"  # greens
    elif 150 <= h < 255:
        bucket = "periwinkle"  # teal/cyan/blue
    elif 255 <= h < 320:
        bucket = "periwinkle"  # purple/magenta -> cool family
    else:
        bucket = "forest"  # red/orange/pink/skin-tone -> warm family -> forest

    bh = BRAND_HSL[bucket][0]
    bs, (lo, hi) = BUCKET_STYLE[bucket]
    l_out = lo + l * (hi - lo)
    return rgb_to_hex(hsl_to_rgb(bh, bs, l_out))


COLOR_RE = re.compile(r"#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)")


def recolor_svg(text):
    """Returns (recolored_text, {original_token: new_token}) — reused as a
    library function by the batch script that produced src/assets/illustrations/."""
    seen = {}

    def repl(m):
        token = m.group(0)
        if token not in seen:
            if token.startswith("#"):
                hexv = token
            else:
                nums = [int(x) for x in re.findall(r"\d+", token)]
                hexv = rgb_to_hex(tuple(nums))
            new_hex = classify(hexv)
            if token.startswith("rgb"):
                r, g, b = hex_to_rgb(new_hex)
                seen[token] = f"rgb({r},{g},{b})"
            else:
                seen[token] = new_hex
        return seen[token]

    return COLOR_RE.sub(repl, text), seen


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, encoding="utf-8") as f:
        text = f.read()
    new_text, mapping = recolor_svg(text)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(new_text)
    print(f"{src}: {len(mapping)} colors remapped")
