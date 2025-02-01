import esbuild from "esbuild";
import config from "./config";

const buildApplicationLambda = async () => {
  console.log("building function ...");
  // todo: remove isDev
  const isDev = config.isDev;

  await esbuild.build({
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
    outfile: isDev
      ? "../examples/service/handler/dist/index.mjs"
      : "./handler/dist/index.mjs",
    entryPoints: [
      isDev ? "../examples/service/handler/index.ts" : "./handler/index.ts",
    ],
    sourcemap: true,
  });

  console.log("build done!");
};

const buildStub = async () => {
  try {
    await esbuild.build({
      entryPoints: ["src/stub/handler/index.ts"], // Entry file
      bundle: true, // Bundle dependencies
      minify: true, // Minify output for smaller file size
      platform: "node", // Target Node.js environment
      target: "node18", // Target Node.js 18
      outfile: "src/stub/handler/dist/index.js", // Output file
    });

    console.log("Stub Lambda build successful!");
  } catch (error) {
    console.error("Stub Lambda build failed:", error);
    process.exit(1); // Exit with an error code
  }
};

export { buildApplicationLambda, buildStub };
