// Geometry prep for the flat map games: the drawn path for every country, plus
// — for the countries the games actually use — a point guaranteed to sit inside
// the country and a label size fitted to it.
//
// Kept out of the components so it can be built once per region and reused, and
// so it can be exercised directly.

import { feature as topojsonFeature } from 'topojson-client'
import { geoCentroid, geoContains, geoBounds, geoPath } from 'd3-geo'
import worldData from 'world-atlas/countries-50m.json'
import { COUNTRY_DATA } from '../data/countries'
import { buildProjection } from './mapConfig'

// Roughly the advance width of one character in a bold sans face, as a fraction
// of the font size.
const CHAR_WIDTH_EM = 0.55
export const LABEL_MIN = 4.5
export const LABEL_MAX = 11

// How much of a country's width its name is allowed to take up.
const LABEL_FILL = 0.85

const CENTER_GRID = 24

// A country's largest landmass. Overseas territories otherwise drag everything
// off the mainland: France reaches to French Guiana and Réunion, the US to
// Alaska and Guam, Norway to Svalbard.
export function mainlandOf(path, feature) {
  if (feature.geometry?.type !== 'MultiPolygon') return feature

  let biggest = null, biggestArea = -1
  for (const coordinates of feature.geometry.coordinates) {
    const polygon = { type: 'Polygon', coordinates }
    const area = path.area(polygon)
    if (area > biggestArea) { biggestArea = area; biggest = polygon }
  }
  return biggest ? { type: 'Feature', properties: {}, geometry: biggest } : feature
}

// A point guaranteed to sit inside the country — where the plane lands, where
// the route line ends, and where the name is written.
//
// A plain centroid fails twice over. Averaged across every territory it can
// leave the country altogether (France's lands in Spain), and even on the
// mainland alone a bent country like Vietnam has its centroid out at sea. So:
// take the mainland, and if its centroid isn't inside it, sweep a grid for the
// interior point nearest to that centroid.
export function visualCenter(mainland) {
  const centroid = geoCentroid(mainland)
  if (geoContains(mainland, centroid)) return centroid

  const [[west, south], [east, north]] = geoBounds(mainland)
  let best = null, bestDistance = Infinity

  for (let i = 1; i < CENTER_GRID; i++) {
    for (let j = 1; j < CENTER_GRID; j++) {
      const point = [
        west  + ((east - west) * i) / CENTER_GRID,
        south + ((north - south) * j) / CENTER_GRID,
      ]
      if (!geoContains(mainland, point)) continue

      const distance = (point[0] - centroid[0]) ** 2 + (point[1] - centroid[1]) ** 2
      if (distance < bestDistance) { bestDistance = distance; best = point }
    }
  }
  return best ?? centroid
}

export function fitLabelSize(name, width) {
  const fitted = (width * LABEL_FILL) / (name.length * CHAR_WIDTH_EM)
  return Math.max(LABEL_MIN, Math.min(LABEL_MAX, fitted))
}

const cache = new Map()

export function buildMapGeometry(regionId = 'world') {
  if (cache.has(regionId)) return cache.get(regionId)

  const { features } = topojsonFeature(worldData, worldData.objects.countries)
  const path = geoPath(buildProjection(regionId))

  const shapes = []
  // world-atlas can put the same ISO id on more than one feature — Australia
  // and Ashmore & Cartier Is. are both '036'. Taking whichever came last would
  // land the plane on a reef in the Timor Sea, so keep the largest.
  const largest = {}

  for (const f of features) {
    const id = String(f.id)
    // Geography renders geography.svgPath and nothing else; <Geographies> is
    // what normally precomputes it, so build it here — once, not per render.
    shapes.push({ id, name: f.properties?.name, svgPath: path(f) })

    if (!COUNTRY_DATA[id]) continue
    const area = path.area(f)
    if (!largest[id] || area > largest[id].area) largest[id] = { feature: f, area }
  }

  const centers = {}, labelSizes = {}
  for (const [id, { feature: f }] of Object.entries(largest)) {
    const mainland = mainlandOf(path, f)
    const bounds = path.bounds(mainland)
    centers[id] = visualCenter(mainland)
    labelSizes[id] = fitLabelSize(COUNTRY_DATA[id].name, bounds[1][0] - bounds[0][0])
  }

  const geometry = { shapes, centers, labelSizes }
  cache.set(regionId, geometry)
  return geometry
}
