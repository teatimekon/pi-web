// Pi Web on a local Pi fork: swap the npm builds of the Pi packages the fork
// patches for the fork's own builds, so `claudeCodeExtension` and external
// tool results exist at runtime. npm keeps installing the registry tarballs
// the lockfile names; this runs after it (postinstall) and on demand
// (`npm run pi:local`). The fork must sit on the same Pi release Pi Web pins:
// a fork built from an unreleased Pi main can drop exports Pi Web still uses.
//
// PI_LOCAL_DIR picks the Pi checkout; the default is ../pi beside Pi Web.
/* eslint-disable @typescript-eslint/no-require-imports */
const { cpSync, existsSync, readFileSync, rmSync } = require("node:fs");
const { join, resolve } = require("node:path");

const PACKAGES = [
  ["ai", "@earendil-works/pi-ai"],
  ["agent", "@earendil-works/pi-agent-core"],
  ["coding-agent", "@earendil-works/pi-coding-agent"],
];

const root = resolve(__dirname, "..");
const piDir = resolve(process.env.PI_LOCAL_DIR ?? join(root, "..", "pi"));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function fail(message) {
  console.error(`[pi:local] ${message}`);
  process.exit(1);
}

// `--optional` (postinstall) only tolerates a machine without the fork; a fork
// that is present but unusable still fails loudly instead of a broken runtime.
if (!existsSync(join(piDir, "packages", "coding-agent", "package.json"))) {
  if (process.argv.includes("--optional")) {
    console.warn(`[pi:local] no Pi checkout at ${piDir}; keeping the npm builds (set PI_LOCAL_DIR to use a fork)`);
    process.exit(0);
  }
  fail(`no Pi checkout at ${piDir} (set PI_LOCAL_DIR)`);
}

for (const [dir, name] of PACKAGES) {
  const source = join(piDir, "packages", dir);
  const target = join(root, "node_modules", ...name.split("/"));
  if (!existsSync(join(source, "dist"))) fail(`${source}/dist is missing; run \`npm run build\` in ${piDir}`);
  if (!existsSync(join(target, "package.json"))) fail(`${name} is not installed; run \`npm install\` first`);

  const local = readJson(join(source, "package.json"));
  const installed = readJson(join(target, "package.json"));
  if (local.version !== installed.version) {
    fail(`${name}: the Pi checkout is ${local.version} but Pi Web installs ${installed.version}`);
  }
  if (JSON.stringify(local.dependencies ?? {}) !== JSON.stringify(installed.dependencies ?? {})) {
    fail(`${name}: the Pi checkout's dependencies differ from npm ${installed.version}; is the fork on that release?`);
  }

  rmSync(join(target, "dist"), { recursive: true, force: true });
  cpSync(join(source, "dist"), join(target, "dist"), { recursive: true });
  cpSync(join(source, "package.json"), join(target, "package.json"));
}

const entry = readFileSync(join(root, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "index.js"), "utf8");
if (!entry.includes("claudeCodeExtension")) fail(`${piDir} has no Claude Code provider; is it the fork?`);
console.log(`[pi:local] using Pi ${readJson(join(piDir, "packages", "coding-agent", "package.json")).version} from ${piDir}`);
