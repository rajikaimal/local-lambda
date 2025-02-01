import esbuild from "esbuild";

esbuild.buildSync({
  platform: "node",
  format: "esm",
  target: "esnext",
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
      `import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
      `const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
    ].join("\n"),
  },
  outfile: "./handler/dist/index.mjs",
  entryPoints: ["./handler/index.ts"],
  sourcemap: true,
});
