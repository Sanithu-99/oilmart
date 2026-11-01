import { rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const nextBuildDirectory = path.resolve(projectRoot, ".next");

if (path.dirname(nextBuildDirectory) !== projectRoot || path.basename(nextBuildDirectory) !== ".next") {
  throw new Error("Refusing to clear an unexpected build directory");
}

await rm(nextBuildDirectory, { recursive: true, force: true });
console.log("Cleared generated Next.js build cache before Netlify build.");
