import { mkdir, writeFile } from "node:fs/promises";
import { POSES, motionSVG } from "../js/motions.js";
const folder = new URL("../assets/illustrations/", import.meta.url);
await mkdir(folder, { recursive: true });
for (const family of Object.keys(POSES))
  await writeFile(new URL(`${family}.svg`, folder), motionSVG(family));
console.log("Esquemas originales preparados:", Object.keys(POSES).length);
