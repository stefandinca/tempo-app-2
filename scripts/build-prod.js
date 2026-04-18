#!/usr/bin/env node
/**
 * Builds TempoApp for production (or demo), strips dev artifacts, and bundles
 * the runtime files into a Linux-friendly .tar for cPanel upload-and-extract.
 *
 * Usage:
 *   node scripts/build-prod.js                 # env=live, no gzip, no node_modules
 *   node scripts/build-prod.js --env=demo      # build with .env.demo
 *   node scripts/build-prod.js --gzip          # produce .tar.gz (smaller upload)
 *   node scripts/build-prod.js --with-modules  # bundle node_modules too (skip NPM install on server)
 *   node scripts/build-prod.js --skip-build    # re-package an existing .next without rebuilding
 *   node scripts/build-prod.js --out=my.tar    # custom output filename
 *
 * cPanel deploy:
 *   1. Upload dist/<bundle> to your app root
 *   2. Extract in-place: tar -xf <bundle>   (or tar -xzf for .tar.gz)
 *   3. If node_modules NOT included: cPanel -> "Run NPM Install"
 *   4. Restart the Node.js app in cPanel
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2).reduce((acc, a) => {
  if (!a.startsWith("--")) return acc;
  const [k, v] = a.slice(2).split("=");
  acc[k] = v === undefined ? true : v;
  return acc;
}, {});

const env = args.env === "demo" ? "demo" : "live";
const skipBuild = !!args["skip-build"];
const withModules = !!args["with-modules"];
const useGzip = !!args.gzip;

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const NEXT = path.join(ROOT, ".next");

const C = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const step = (msg) => console.log(`\n${C.cyan("▸")} ${C.bold(msg)}`);
const ok = (msg) => console.log(`  ${C.green("✓")} ${msg}`);
const fail = (msg) => {
  console.error(`\n${C.red("✗")} ${msg}`);
  process.exit(1);
};

function rimraf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function run(cmd) {
  console.log(C.dim(`    $ ${cmd}`));
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

function dirSize(p) {
  let total = 0;
  if (!fs.existsSync(p)) return 0;
  const stack = [p];
  while (stack.length) {
    const cur = stack.pop();
    const st = fs.statSync(cur);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(cur)) stack.push(path.join(cur, f));
    } else {
      total += st.size;
    }
  }
  return total;
}

// -----------------------------------------------------------------------------

console.log(C.bold(`\nTempoApp build+package  (env=${env}, gzip=${useGzip}, withModules=${withModules})`));

// 1. Build (or verify existing output when --skip-build)
if (skipBuild) {
  step("Skipping build (--skip-build)");
  if (!fs.existsSync(NEXT)) fail("No .next directory found. Run without --skip-build first.");
} else {
  step("Cleaning previous build output");
  rimraf(NEXT);
  rimraf(path.join(ROOT, "out"));
  ok(".next and out removed");

  const script = env === "live" ? "build:prod" : "build:demo";
  step(`Running production build  (npm run ${script})`);
  run(`npm run ${script}`);
  ok("Build complete");
}

// 3. Strip runtime-unneeded artifacts from .next
step("Stripping dev-only artifacts from .next");
rimraf(path.join(NEXT, "cache"));  // webpack cache — huge, not needed at runtime
rimraf(path.join(NEXT, "trace"));  // profiling output
ok(".next/cache and .next/trace removed");

// 4. Verify all required files exist
const REQUIRED = [
  ".next",
  "public",
  "package.json",
  "package-lock.json",
  "next.config.js",
  "server.js",
];
for (const f of REQUIRED) {
  if (!fs.existsSync(path.join(ROOT, f))) fail(`Missing required entry: ${f}`);
}

const entries = [...REQUIRED];
if (withModules) {
  if (!fs.existsSync(path.join(ROOT, "node_modules"))) fail("--with-modules passed but node_modules is missing. Run npm install first.");
  entries.push("node_modules");
}

// 5. Prepare dist dir and filelist (use repo-relative paths so GNU tar on Windows
//    doesn't mistake "C:\..." for a remote host specifier).
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

const listRel = path.join("dist", ".tarfiles.txt").replace(/\\/g, "/");
const listFile = path.join(ROOT, listRel);
fs.writeFileSync(listFile, entries.join("\n") + "\n", "utf8");

// 6. Compute output filename
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const ext = useGzip ? "tar.gz" : "tar";
const tarName = args.out || `tempo-app-${env}-${stamp}.${ext}`;
const tarRel = path.join("dist", tarName).replace(/\\/g, "/");
const tarPath = path.join(DIST, tarName);
if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

// 7. Produce the tar. GNU tar and bsdtar both accept these flags.
//    -c create  -f output  -T filelist  --format=ustar (Linux-friendly, POSIX)
//    --force-local: GNU tar on Windows treats "C:\..." as user@host:path; force it to treat as local path.
//    Paths are passed relative to ROOT (cwd, via execSync) so the produced tar contains repo-relative entries.
//    We don't pass --exclude patterns: everything we don't want (.next/cache, .next/trace)
//    was already deleted above, and only the files listed in REQUIRED are handed to tar.
step(`Packaging ${tarName}`);
const gzipFlag = useGzip ? "-z" : "";
try {
  run(`tar ${gzipFlag} --force-local --format=ustar -cf ${JSON.stringify(tarRel)} -T ${JSON.stringify(listRel)}`);
} catch (err) {
  try { fs.unlinkSync(listFile); } catch {}
  fail(`tar failed: ${err.message}`);
}
fs.unlinkSync(listFile);

// 8. Summary
const bytes = fs.statSync(tarPath).size;
const mb = (bytes / 1024 / 1024).toFixed(1);
const nextMb = (dirSize(NEXT) / 1024 / 1024).toFixed(1);

ok(`Bundle ready: ${path.relative(ROOT, tarPath)}  (${mb} MB)`);
console.log(C.dim(`    .next payload: ${nextMb} MB`));

console.log(`\n${C.bold("cPanel deploy")}`);
console.log(`  1. Upload ${C.cyan(`dist/${tarName}`)} to the app root`);
console.log(`  2. Extract in place:  ${C.cyan(useGzip ? `tar -xzf ${tarName}` : `tar -xf ${tarName}`)}`);
if (!withModules) console.log(`  3. cPanel -> "Run NPM Install"  (node_modules not bundled)`);
else console.log(`  3. Skip NPM Install  (node_modules bundled)`);
console.log(`  ${withModules ? "4" : "4"}. Restart the Node.js app in cPanel\n`);
