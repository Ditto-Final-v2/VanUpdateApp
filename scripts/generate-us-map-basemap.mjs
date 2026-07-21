import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../public/data/planned-routes-loop-1-selected.svg", import.meta.url);
const outputPath = new URL("../public/data/us-map-basemap.svg", import.meta.url);
const overlayOutputPath = new URL("../src/data/map-overlay-data.json", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const statesEnd = source.indexOf("</g>");

if (statesEnd < 0) throw new Error("The source map does not contain the expected state group.");

const basemap = `${source.slice(0, statesEnd + 4)
  .replace(/<title[^>]*>.*?<\/title>/, '<title id="title">United States road-trip map</title>')
  .replace(/<desc[^>]*>.*?<\/desc>/, '<desc id="desc">A neutral map of the United States used behind the live trip route.</desc>')}
<text x="38" y="746" fill="#52645b" font-family="system-ui,sans-serif" font-size="11">State boundaries: U.S. Census Bureau TIGERweb</text></svg>`;

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, basemap);

const overlayData = {};
for (const loop of [1, 2]) {
  const loopSvg = await readFile(new URL(`../public/data/planned-routes-loop-${loop}-selected.svg`, import.meta.url), "utf8");
  const routeGeoJson = JSON.parse(await readFile(new URL(`../public/data/planned-route-loop-${loop}.geojson`, import.meta.url), "utf8"));
  const stopsGeoJson = JSON.parse(await readFile(new URL(`../public/data/planned-stops-loop-${loop}.geojson`, import.meta.url), "utf8"));
  const routeGroup = loopSvg.match(/<g class="active-route">([\s\S]*?)<\/g>/)?.[1];
  const stopsGroup = loopSvg.match(/<g class="stops">([\s\S]*?)<\/g>/)?.[1];
  if (!routeGroup || !stopsGroup) throw new Error(`Loop ${loop} SVG is missing route or stop groups.`);

  const pathData = [...routeGroup.matchAll(/<path d="([^"]+)"\/>/g)].map((match) => match[1]);
  const projectedLines = pathData.map((path) => {
    const values = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
    return Array.from({ length: values.length / 2 }, (_, index) => [values[index * 2], values[index * 2 + 1]]);
  });
  const geographicLines = routeGeoJson.geometry.type === "LineString" ? [routeGeoJson.geometry.coordinates] : routeGeoJson.geometry.coordinates;
  if (projectedLines.length !== geographicLines.length || projectedLines.some((line, index) => line.length !== geographicLines[index].length)) {
    throw new Error(`Loop ${loop} projected route does not match its GPX coordinates.`);
  }

  const circlePattern = /<circle cx="([^"]+)" cy="([^"]+)" r="6"(?: class="[^"]+")?\/>/g;
  const projectedStops = [...stopsGroup.matchAll(circlePattern)].map((match) => [Number(match[1]), Number(match[2])]);
  if (projectedStops.length !== stopsGeoJson.features.length) throw new Error(`Loop ${loop} projected stops do not match stop data.`);

  overlayData[loop] = {
    lines: geographicLines.map((coordinates, index) => ({ coordinates, projected: projectedLines[index] })),
    labelsMarkup: stopsGroup.replace(circlePattern, ""),
    stops: stopsGeoJson.features.map((feature, index) => ({
      name: feature.properties?.name ?? `Stop ${index + 1}`,
      coordinates: feature.geometry.coordinates,
      projected: projectedStops[index],
    })),
  };
}

await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(overlayOutputPath, `${JSON.stringify(overlayData)}\n`);
