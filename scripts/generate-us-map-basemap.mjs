import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../public/data/planned-routes-loop-1-selected.svg", import.meta.url);
const outputPath = new URL("../public/data/us-map-basemap.svg", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const statesEnd = source.indexOf("</g>");

if (statesEnd < 0) throw new Error("The source map does not contain the expected state group.");

const basemap = `${source.slice(0, statesEnd + 4)
  .replace(/<title[^>]*>.*?<\/title>/, '<title id="title">United States road-trip map</title>')
  .replace(/<desc[^>]*>.*?<\/desc>/, '<desc id="desc">A neutral map of the United States used behind the live trip route.</desc>')}
<text x="38" y="746" fill="#52645b" font-family="system-ui,sans-serif" font-size="11">State boundaries: U.S. Census Bureau TIGERweb</text></svg>`;

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, basemap);
