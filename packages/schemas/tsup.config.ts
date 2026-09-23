import { defineConfig } from "tsup";

/**
 * The website reads this package as TypeScript source (see `exports.import`);
 * the CMS is CommonJS with `moduleResolution: Node`, which ignores `exports`
 * and needs a built `main` — the same arrangement as @lasgalias/providers.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "node20",
});
