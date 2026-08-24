# Illustrations

40 SVG illustrations from three DrawKit packs (Education, Economy & Finance,
Project Manager), recolored into the NextSkill locked palette
(`NextSkill_Final_Color_Usage_Guide_v2`).

## Recoloring approach

Every distinct color in each source file was hue-bucketed into one of the
brand families — forest (warm/red/green hues), periwinkle (cool/blue/purple
hues), or lime (yellow hues) — then rendered within that bucket's own
calibrated saturation and lightness band, with the *original* color's
lightness remapped proportionally into that band. That preserves shape-to-
shape contrast from the source art (so e.g. skin vs. hair vs. clothing stay
visually distinct) while every output color still reads as unmistakably
"the same family" as the brand swatch, regardless of how light or dark the
original was. True near-white and near-black/gray values are left as
white/charcoal rather than force-colorized.

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
