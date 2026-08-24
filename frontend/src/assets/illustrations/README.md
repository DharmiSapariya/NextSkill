# Illustrations

40 SVG illustrations from three DrawKit packs (Education, Economy & Finance,
Project Manager), recolored into the NextSkill locked palette
(`NextSkill_Final_Color_Usage_Guide_v2`).

## Recoloring approach (v2 — strict flat palette)

Per the locked "NextSkill Illustration Color System": every fill snaps to
exactly one of six flat colors — outline `#171717`, forest `#1E3A2B`
(primary), lime `#EFF87A` (sparse accent), periwinkle `#CFDCFF` (secondary),
cream `#F8F4F0` (light surfaces) — no continuous tinting, no off-palette
colors. Every stroke becomes the outline color unconditionally, regardless
of what color it was in the source; this requires parsing colors in their
actual `fill`/`stroke`/`stop-color` context rather than a blind global
find-and-replace, since the same source hex often appears as both a fill
somewhere and a stroke elsewhere in the same file and now needs to resolve
to two different outputs.

Hue mapping: blue/cyan → periwinkle (dark blue → forest instead, per the
spec's own example); purple/magenta → periwinkle; green → forest;
orange/gold/yellow → lime (coins, stars, badges — genuinely accent-scale in
these packs); red → **forest**, not lime — the spec's literal example says
red maps to lime, but its own repeated, stronger principle is that lime must
stay a sparse accent and never dominate, and in these source packs red is
consistently a large area (a whole coat, a whole robe). A large area
gets the primary/dominant color, the same way a large dark-blue area gets
forest instead of periwinkle. Human skin tones (a narrow, moderately-
saturated red-orange band, distinct from fully-saturated brand reds/oranges)
are left unrecolored, per the spec's explicit carve-out for human
representation.

`scripts/recolor_illustration.py` is the reusable tool this produced —
its own comments explain each rule in more depth.

Only the SVG versions were kept (not the packs' bundled PNG rasters) — SVG
scales cleanly at any size and was more reliable to recolor precisely (exact
color values in markup, not pixels to re-quantize).

## Licensing — verify before shipping

No license file was bundled inside any of the three source zips. DrawKit's
free packs are generally released for personal and commercial use, but that
wasn't confirmed from a license file the way the intro's Aalto Display font
was — check drawkit.com's current terms for these specific packs before
this goes out publicly.

## Structure

- `education/` — 10 files (`education-1.svg` … `education-10.svg`)
- `economy-finance/` — 10 files, named by scene (e.g. `job-looking.svg`,
  `budgetting.svg`, `bike.svg`)
- `project-management/` — 20 files (`pm-1.svg` … `pm-20.svg`)
