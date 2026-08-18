/**
 * Loads TypeScript modules from src/ into plain Node, so the seeder can call the
 * application's OWN evaluation-summary calculators instead of reimplementing the
 * maths. Reimplementation is how seeded evaluations end up internally
 * inconsistent — summaries that disagree with the item scores they claim to
 * summarise, which then renders wrong in reports and comparison views.
 *
 * Strategy: transpile with the repo's TypeScript, resolve local imports for real
 * (recursively), and neutralise only what must never execute — external packages
 * (react, firebase, ...) and local modules with import-time side effects
 * (lib/firebase initialises a Firebase app; lib/i18n initialises i18next).
 * Their bindings become declared-but-unset identifiers: present so the module
 * evaluates, never read because we only ever call pure functions.
 *
 * Paths are compared in posix form; Windows separators would otherwise defeat
 * the regexes.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, "node_modules", ".cache", "demo-seed-ts");

const ts = (await import(pathToFileURL(path.join(ROOT, "node_modules/typescript/lib/typescript.js")).href)).default;

const toPosix = (p) => p.split(path.sep).join("/");

const EXTERNAL = /^(react|react-dom|firebase|next|@firebase|i18next|react-i18next|date-fns|lucide-react|recharts|clsx|jspdf)(\/|$)/;
const SIDE_EFFECTING_LOCAL = /\/lib\/(firebase|firebaseAdmin|i18n)(\.|\/|$)/;

const emitted = new Map();

function resolveLocal(spec, fromAbs) {
  const base = spec.startsWith("@/")
    ? path.join(ROOT, "src", spec.slice(2))
    : path.resolve(path.dirname(fromAbs), spec);
  const candidates = [
    base, base + ".ts", base + ".tsx", base + ".json",
    path.join(base, "index.ts"), path.join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && /\.(tsx?|json)$/.test(c)) return c;
  }
  return null;
}

function neutraliseExternals(js) {
  return js
    .replace(
      /^import\s+(?:([\w$]+)\s*,\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+)|([\w$]+))?\s*from\s*["']__STUB__:[^"']*["'];?$/gm,
      (_full, def1, named, ns, def2) => {
        const names = [];
        for (const n of [def1, def2, ns]) if (n) names.push(n);
        if (named) {
          for (const part of named.split(",").map((s) => s.trim()).filter(Boolean)) {
            const bits = part.split(/\s+as\s+/);
            names.push((bits[1] || bits[0]).trim());
          }
        }
        return names.length ? `var ${names.join(", ")};` : "";
      },
    )
    .replace(/^import\s+["'][^"']*["'];?$/gm, "");
}

function emit(absTs) {
  if (emitted.has(absTs)) return emitted.get(absTs);
  const flat = path.relative(ROOT, absTs).split(path.sep).join("__").replace(/\.tsx?$/, ".mjs");
  const outFile = path.join(OUT, flat);
  emitted.set(absTs, outFile);

  let js = ts.transpileModule(readFileSync(absTs, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: absTs,
  }).outputText;

  js = js.replace(/(\bfrom\s*)["']([^"']+)["']/g, (_m, kw, spec) => {
    if (EXTERNAL.test(spec)) return `${kw}"__STUB__:${spec}"`;
    const abs = resolveLocal(spec, absTs);
    if (!abs || SIDE_EFFECTING_LOCAL.test(toPosix(abs))) return `${kw}"__STUB__:${spec}"`;
    if (abs.endsWith(".json")) {
      return `${kw}${JSON.stringify(pathToFileURL(abs).href)} with { type: "json" }`;
    }
    return `${kw}${JSON.stringify(pathToFileURL(emit(abs)).href)}`;
  });

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, neutraliseExternals(js));
  return outFile;
}

/** Import a TS module from the app by repo-relative path, e.g. "src/hooks/useCARS.ts". */
export function loadAppModule(relPath) {
  return import(pathToFileURL(emit(path.join(ROOT, relPath))).href);
}

export function resetCache() {
  rmSync(OUT, { recursive: true, force: true });
  emitted.clear();
}

export { ROOT };
