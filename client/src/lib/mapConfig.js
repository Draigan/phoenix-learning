// Shared settings for the flat (non-globe) map games.
//
// ComposableMap renders into a fixed 800×600 viewBox, so a projection scale is
// only correct relative to that box. Anything wider than 800 units gets clipped
// at the left and right edges.

import { geoEqualEarth, geoMercator } from 'd3-geo'

export const VIEWBOX = { width: 800, height: 600 }

export const PROJECTION_CONFIGS = {
  // Equal Earth fits the whole planet inside the viewBox (fitted scale 133 with
  // a 40px margin). Mercator can't: to fill the 800 width it needs scale ~95,
  // and anything larger pushes the Pacific edges off screen — which is why the
  // old world view at scale 162 was missing a third of the map.
  world:    { projection: 'geoEqualEarth', scale: 133, center: [0,   0]  },

  // Regional views stay on Mercator — hand-tuned framing, already on screen.
  europe:   { projection: 'geoMercator',   scale: 650, center: [8,   48] },
  americas: { projection: 'geoMercator',   scale: 280, center: [-83,  5] },
  africa:   { projection: 'geoMercator',   scale: 380, center: [20,   5] },
  asia:     { projection: 'geoMercator',   scale: 230, center: [95,  30] },
}

// ComposableMap wants the projection name and its config as separate props.
export function getMapProjection(regionId) {
  const { projection, ...config } = PROJECTION_CONFIGS[regionId] ?? PROJECTION_CONFIGS.world
  return { projection, config, viewBox: VIEWBOX }
}

const PROJECTION_FACTORIES = { geoEqualEarth, geoMercator }

// Rebuilds the projection ComposableMap makes internally (same order of
// operations), so we can measure how large a country will actually be drawn —
// used to size map labels to the country they sit on.
export function buildProjection(regionId) {
  const { projection, config } = getMapProjection(regionId)
  return PROJECTION_FACTORIES[projection]()
    .translate([VIEWBOX.width / 2, VIEWBOX.height / 2])
    .center(config.center)
    .scale(config.scale)
}

export const OCEAN_COLOR  = '#a8d4f0'
export const BORDER_COLOR = '#88bbdd'

// State colours. These have to stay clearly apart from every colour in
// MAP_COLORS below and from each other — the old amber hint sat right between
// the palette's pastel yellow and orange, which is why it barely read as a
// highlight. HINT_* are mirrored in index.css (@keyframes hintPulse); the test
// suite checks the two stay in step.
export const VISITED_COLOR    = '#22c55e'   // green — stops already reached
export const WRONG_COLOR      = '#ef4444'   // red — a wrong tap
export const HINT_COLOR       = '#4c1d95'   // deep violet — furthest from every map colour
export const HINT_PULSE_COLOR = '#e9d5ff'   // pale violet it pulses to

export const MAP_COLORS = ['#86d98f', '#f0d070', '#f0a060', '#78b4f0', '#c090e0', '#e87878']

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// A few disputed territories in the world-atlas data carry no ISO id at all
// (Somaliland, Kosovo, N. Cyprus, Indian Ocean Ter., Siachen Glacier). Indexing
// MAP_COLORS by NaN gave them an undefined fill, which React drops from the
// attributes — leaving them rendered solid black. Fall back to the name.
export function countryColor(geoId, fallbackKey = '') {
  const numeric = parseInt(geoId, 10)
  const index = Number.isNaN(numeric) ? hashString(fallbackKey || String(geoId)) : numeric
  return MAP_COLORS[index % MAP_COLORS.length]
}
