const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) }
globalThis.sessionStorage = globalThis.localStorage

const T = await import('../node_modules/.map-test/render-entry.js')
const d3 = await import('d3-geo')
const { feature } = await import('topojson-client')
const { createRequire } = await import('module')
const require = createRequire(import.meta.url)
const world = require('world-atlas/countries-50m.json')

const fc = feature(world, world.objects.countries)
// every feature carrying a given ISO id — a country is the union of them
const byId = {}
for (const f of fc.features) (byId[String(f.id)] ??= []).push(f)
const inCountry = (id, pt) => (byId[id] ?? []).some(f => d3.geoContains(f, pt))

let pass = 0, fail = 0
const failures = []
function check(name, ok, detail = '') {
  if (ok) { pass++ } else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`) }
}
function section(t) { console.log('\n' + t) }

const { shapes, centers, labelSizes } = T.buildMapGeometry('world')
const path = d3.geoPath(T.buildProjection('world'))
const ids = Object.keys(T.COUNTRY_DATA)
const proj = T.buildProjection('world')

// ── A. geometry ───────────────────────────────────────────────────────────────
section('A. Map geometry')
check('all 241 features have a drawn path', shapes.length === 241 && shapes.every(s => s.svgPath && s.svgPath.length > 2),
      `${shapes.filter(s=>!s.svgPath||s.svgPath.length<3).length} empty`)
check('every country has a landing point', ids.every(id => Array.isArray(centers[id]) && centers[id].length === 2),
      ids.filter(id => !centers[id]).join(', '))
check('every country has a label size', ids.every(id => typeof labelSizes[id] === 'number'))

const outside = ids.filter(id => !inCountry(id, centers[id]))
check('EVERY landing point is inside its own country', outside.length === 0,
      outside.map(id => `${T.COUNTRY_DATA[id].name} -> ${ids.find(o => inCountry(o, centers[id])) ? T.COUNTRY_DATA[ids.find(o => inCountry(o, centers[id]))].name : 'OCEAN'}`).join('; '))

const badSize = ids.filter(id => labelSizes[id] < T.LABEL_MIN - 1e-9 || labelSizes[id] > T.LABEL_MAX + 1e-9)
check('label sizes within bounds', badSize.length === 0, badSize.join(', '))

// regression: the two bugs already hit
const au = ids.find(id => T.COUNTRY_DATA[id].name === 'Australia')
check('REGRESSION duplicate id: Australia lands on the mainland, not Ashmore Reef',
      inCountry(au, centers[au]) && Math.abs(centers[au][1] - -25.6) < 6,
      `got ${centers[au].map(v=>+v.toFixed(2))}`)
const fr = ids.find(id => T.COUNTRY_DATA[id].name === 'France')
check('REGRESSION overseas territories: France lands in France, not Spain',
      inCountry(fr, centers[fr]), `got ${centers[fr].map(v=>+v.toFixed(2))}`)

// every point must also be on screen
const off = ids.filter(id => { const [x,y] = proj(centers[id]); return !(x>=0&&x<=800&&y>=0&&y<=600) })
check('every landing point is inside the 800x600 viewBox', off.length === 0, off.join(', '))

// countryColor never yields undefined (black-fill bug)
const badFill = shapes.filter(s => !T.countryColor(s.id, s.name))
check('REGRESSION every country gets a real fill colour', badFill.length === 0,
      badFill.map(s=>s.name).join(', '))

// ── B. route builder ──────────────────────────────────────────────────────────
section('B. Route builder (3000 tours)')
let lenBad=0, dupBad=0, regionBad=0, centerBad=0
for (let i=0;i<3000;i++) {
  const r = T.buildRoute()
  if (r.length !== T.STOPS_PER_TOUR + 1) lenBad++
  if (new Set(r.map(c=>c.id)).size !== r.length) dupBad++
  for (let j=1;j<r.length;j++) {
    if (r[j].region === r[j-1].region) regionBad++
    if (!centers[r[j].id]) centerBad++
  }
}
check('always the right number of stops', lenBad === 0, `${lenBad} bad`)
check('never repeats a country', dupBad === 0, `${dupBad} bad`)
check('never two stops from the same region in a row', regionBad === 0, `${regionBad} bad`)
check('every stop has a landing point', centerBad === 0, `${centerBad} bad`)

// ── C. flight maths ───────────────────────────────────────────────────────────
section('C. Flight maths')
const known = [
  ['France','Japan', 9700, 1200],   // ~9,700km
  ['United States','Canada', 2300, 1500],
  ['Brazil','South Africa', 7500, 1500],
]
for (const [a,b,expect,tol] of known) {
  const ida = ids.find(id=>T.COUNTRY_DATA[id].name===a), idb = ids.find(id=>T.COUNTRY_DATA[id].name===b)
  const km = T.legDistanceKm(centers[ida], centers[idb])
  check(`distance ${a}->${b} plausible (${km}km)`, Math.abs(km-expect) < tol, `expected ~${expect}`)
}
check('bearing due east is 90°', Math.abs(T.bearing([0,0],[10,0]) - 90) < 0.5)
check('bearing due north is 0°', Math.abs(T.bearing([0,0],[0,10])) < 0.5)
check('bearing due west is 270°', Math.abs(T.bearing([0,0],[-10,0]) - 270) < 0.5)
check('easing spans 0..1', T.easeInOutCubic(0)===0 && T.easeInOutCubic(1)===1 && Math.abs(T.easeInOutCubic(0.5)-0.5)<1e-9)
check('easing is monotonic', (()=>{let p=-1;for(let t=0;t<=1;t+=0.01){const v=T.easeInOutCubic(t);if(v<p)return false;p=v}return true})())

// ── D. rendered output ────────────────────────────────────────────────────────
section('D. Rendered output (200 renders)')
let renders=0, drawn=0, labelsChecked=0, labelsOutside=[], seenCountries=new Set(), planeMissing=0
for (let i=0;i<200;i++){
  const html = T.renderTour()
  renders++
  const paths = [...html.matchAll(/class="rsm-geography[^"]*"[^>]*d="([^"]*)"/g)]
  if (paths.length === 241 && paths.every(m=>m[1].length>2)) drawn++
  if (!/M0,-11/.test(html)) planeMissing++
  for (const m of html.matchAll(/<g transform="translate\(([-\d.]+),\s*([-\d.]+)\)" class="rsm-marker\s*"[^>]*>(.*?)<\/g>/gs)) {
    const name = (m[3].match(/<text[^>]*>([^<]+)<\/text>/)||[])[1]
    if (!name) continue
    const id = ids.find(x => T.COUNTRY_DATA[x].name === name)
    if (!id) continue
    labelsChecked++; seenCountries.add(name)
    const pt = proj.invert([parseFloat(m[1]), parseFloat(m[2])])
    if (!inCountry(id, pt)) labelsOutside.push(`${name} -> ${pt.map(v=>+v.toFixed(2))}`)
  }
}
check('every render draws all 241 countries', drawn === renders, `${renders-drawn}/${renders} bad`)
check('every render shows the plane', planeMissing === 0, `${planeMissing} missing`)
check('every rendered label sits inside its country', labelsOutside.length === 0,
      [...new Set(labelsOutside)].slice(0,5).join('; '))
console.log(`   (${labelsChecked} labels checked across ${seenCountries.size} distinct countries)`)


// ── E. no spoilers, and labels that fit ───────────────────────────────────────
section('E. Spoilers and label fit')
let planeOnTarget = 0, passportLeak = 0, fontMismatch = 0, targetsSeen = 0
const FLAG = /[\u{1F1E6}-\u{1F1FF}]{2}/gu
for (let i=0;i<200;i++){
  const html = T.renderTour()
  // the prompt names the country being hunted
  const target = (html.match(/text-2xl font-bold uppercase[^>]*>([^<]+)</) || [])[1]
  if (!target) continue
  targetsSeen++
  const tid = ids.find(x => T.COUNTRY_DATA[x].name === target)

  // the plane must not be parked on the country being hunted
  const planeM = html.match(/<g transform="translate\(([-\d.]+),\s*([-\d.]+)\)" class="rsm-marker\s*"[^>]*><path d="M0,-11/)
  if (planeM && tid) {
    const pt = proj.invert([parseFloat(planeM[1]), parseFloat(planeM[2])])
    if (inCountry(tid, pt)) planeOnTarget++
  }

  // the passport must not reveal upcoming stops: at the start the only flag on
  // screen is the current target's
  const header = html.slice(0, html.indexOf('rsm-svg') === -1 ? html.length : html.indexOf('rsm-svg'))
  const flags = header.match(FLAG) || []
  if (flags.length > 1) passportLeak++

  // at zoom 1 the rendered font-size is exactly the fitted size
  for (const m of html.matchAll(/<text[^>]*font-size="([\d.]+)"[^>]*>([^<]+)<\/text>/g)) {
    const id = ids.find(x => T.COUNTRY_DATA[x].name === m[2])
    if (!id) continue
    if (Math.abs(parseFloat(m[1]) - labelSizes[id]) > 0.01) fontMismatch++
  }
}
check('plane never waits on the country being hunted', planeOnTarget === 0, `${planeOnTarget}/${targetsSeen} renders`)
check('passport never reveals an unreached stop', passportLeak === 0, `${passportLeak}/${targetsSeen} renders`)
check('rendered label size matches the fitted size', fontMismatch === 0, `${fontMismatch} mismatches`)

// how well do labels actually fit their country?
let fits = 0, overflow = []
for (const id of ids) {
  const f = byId[id].reduce((a,b) => path.area(a) > path.area(b) ? a : b)
  const ml = T.mainlandOf(path, f)
  const w = path.bounds(ml)[1][0] - path.bounds(ml)[0][0]
  const textW = T.COUNTRY_DATA[id].name.length * 0.55 * labelSizes[id]
  if (textW <= w * 1.02) fits++
  else overflow.push(`${T.COUNTRY_DATA[id].name} ${(textW/w).toFixed(1)}x`)
}
console.log(`   labels fitting inside their country at zoom 1: ${fits}/${ids.length}`)
console.log(`   (the rest are small countries pinned at the ${T.LABEL_MIN}px floor — they become legible on zoom)`)
// tiny countries can't hold their name at rest — the design is that zooming
// closes the gap. Assert both halves of that.
const ratioAt = (id, k) => {
  const f = byId[id].reduce((a,b) => path.area(a) > path.area(b) ? a : b)
  const ml = T.mainlandOf(path, f)
  const w = (path.bounds(ml)[1][0] - path.bounds(ml)[0][0]) * k
  const textW = T.COUNTRY_DATA[id].name.length * 0.55 * Math.min(labelSizes[id], T.LABEL_MAX / k) * k
  return textW / w
}
const worst1 = ids.map(id => [T.COUNTRY_DATA[id].name, ratioAt(id,1)]).sort((a,b)=>b[1]-a[1])[0]
const worst8 = ids.map(id => [T.COUNTRY_DATA[id].name, ratioAt(id,8)]).sort((a,b)=>b[1]-a[1])[0]
console.log(`   worst overflow at zoom 1: ${worst1[0]} ${worst1[1].toFixed(1)}x -> at zoom 8: ${worst8[0]} ${worst8[1].toFixed(1)}x`)
check('zooming in always improves how well a label fits', ids.every(id => ratioAt(id,8) <= ratioAt(id,1) + 1e-9))
check('at full zoom every label is close to fitting (<=2x)', ids.every(id => ratioAt(id,8) <= 2.0),
      ids.filter(id => ratioAt(id,8) > 2.0).map(id=>`${T.COUNTRY_DATA[id].name} ${ratioAt(id,8).toFixed(1)}x`).join(', '))
check('no label overflows absurdly even at rest (<=6x)', ids.every(id => ratioAt(id,1) <= 6.0),
      ids.filter(id => ratioAt(id,1) > 6.0).map(id=>`${T.COUNTRY_DATA[id].name} ${ratioAt(id,1).toFixed(1)}x`).join(', '))

// zoom law: label grows on screen to LABEL_MAX then holds, never shrinks
let zoomBad = 0
for (const id of ids) for (const k of [1,1.5,2,3,5,8]) {
  const onScreen = Math.min(labelSizes[id], T.LABEL_MAX / k) * k
  if (onScreen > T.LABEL_MAX + 1e-9) zoomBad++
  if (onScreen < labelSizes[id] - 1e-9) zoomBad++
}
check('zooming never shrinks a label or exceeds the reading size', zoomBad === 0, `${zoomBad} bad`)


// ── F. hint colour and timing ─────────────────────────────────────────────────
section('F. Hint highlight')
const fsSync = (await import('fs')).default

const hex2rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16))
// "redmean" weighted RGB distance — cheap and closer to perception than plain RGB
const colourDist = (a,b) => {
  const [r1,g1,b1] = hex2rgb(a), [r2,g2,b2] = hex2rgb(b)
  const rm = (r1+r2)/2, dr = r1-r2, dg = g1-g2, db = b1-b2
  return Math.sqrt((2+rm/256)*dr*dr + 4*dg*dg + (2+(255-rm)/256)*db*db)
}
const OTHERS = [...T.MAP_COLORS, T.OCEAN_COLOR, T.VISITED_COLOR, T.WRONG_COLOR]
const nearest = OTHERS.map(c => [c, colourDist(T.HINT_COLOR, c)]).sort((a,b)=>a[1]-b[1])[0]
const oldAmber = '#f59e0b'
const nearestOld = OTHERS.map(c => [c, colourDist(oldAmber, c)]).sort((a,b)=>a[1]-b[1])[0]
console.log(`   hint ${T.HINT_COLOR}: nearest other map colour is ${nearest[0]} at distance ${nearest[1].toFixed(0)}`)
console.log(`   (the old amber ${oldAmber} was only ${nearestOld[1].toFixed(0)} from ${nearestOld[0]})`)
check('hint colour is clearly distinct from every other colour on the map',
      nearest[1] > 200, `nearest ${nearest[0]} at ${nearest[1].toFixed(0)}`)
check('hint colour is more distinct than the amber it replaced', nearest[1] > nearestOld[1])

const css = fsSync.readFileSync('src/index.css','utf8')
const kf = css.match(/@keyframes hintPulse\s*\{([^}]*\}[^}]*)\}/)
check('index.css defines the hintPulse animation', !!kf)
check('CSS pulse colours match the JS constants',
      !!kf && kf[1].includes(T.HINT_COLOR) && kf[1].includes(T.HINT_PULSE_COLOR),
      'index.css and mapConfig.js have drifted apart')
check('the pulse class exists', /\.hint-pulse\s*\{[^}]*animation:\s*hintPulse/.test(css))

const src = fsSync.readFileSync('src/pages/WorldTour.jsx','utf8')
const hold = (src.match(/HINT_HOLD_MS\s*=\s*(\d+)/) || [])[1]
check('the hint holds long enough to act on (>=4s)', Number(hold) >= 4000, `is ${hold}ms`)
check('the hinted country gets the pulse class', /className=\{isHinted\(shape\.id\)/.test(src))
check('no amber left in the hint path', !/amber/.test(src) && !/f59e0b/i.test(src))

// Tailwind only emits classes it finds in source — a colour swap can silently
// produce an unstyled label if the built CSS is missing the new utility.
const cssFiles = fsSync.existsSync('dist/assets')
  ? fsSync.readdirSync('dist/assets').filter(f => f.endsWith('.css'))
  : []
if (cssFiles.length) {
  const built = cssFiles.map(f => fsSync.readFileSync('dist/assets/'+f,'utf8')).join('')
  check('built CSS keeps the hintPulse animation', /@keyframes hintPulse/.test(built))
  check('built CSS keeps .hint-pulse', /\.hint-pulse/.test(built))
  check('Tailwind emitted text-violet-700 (not purged)', /\.text-violet-700/.test(built))
} else {
  console.log('   (no dist/ build found — skipping built-CSS checks)')
}



// ── G. orientation is not locked ──────────────────────────────────────────────
section('G. Orientation')
const html_ = fsSync.readFileSync('index.html','utf8')
const viteCfg = fsSync.readFileSync('vite.config.js','utf8')
check('no "rotate to landscape" overlay in the stylesheet', !/rotate your device/i.test(css))
check('portrait no longer hides the app', !/orientation:\s*portrait/.test(css))
check('the app layout is not gated on landscape', !/orientation:\s*landscape/.test(css))
check('PWA manifest does not lock orientation', /orientation:\s*'any'/.test(viteCfg))
check('no landscape lock meta tags', !/screen-orientation|x5-orientation/.test(html_))
if (cssFiles.length) {
  const built2 = cssFiles.map(f => fsSync.readFileSync('dist/assets/'+f,'utf8')).join('')
  check('built CSS carries no portrait blocker', !/rotate your device/i.test(built2))
}
const builtManifest = fsSync.existsSync('dist/manifest.webmanifest')
  ? JSON.parse(fsSync.readFileSync('dist/manifest.webmanifest','utf8')) : null
if (builtManifest) check('built manifest orientation is "any"', builtManifest.orientation === 'any',
                          `is "${builtManifest.orientation}"`)


// ── report ────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60))
console.log(`PASS ${pass}   FAIL ${fail}`)
if (fail) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)) }
process.exit(fail ? 1 : 0)
