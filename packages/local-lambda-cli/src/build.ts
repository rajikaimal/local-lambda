import esbuild from "esbuild";
import { logger } from "./logger";
import path from "node:path";

const buildApplicationLambda = async () => {
  logger.info("Building function ...");

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
    outfile: "./handler/dist/index.mjs",
    entryPoints: ["./handler/index.ts"],
    sourcemap: true,
  });

  logger.info("Build done!");
};

const buildStub = async () => {
  try {
    await esbuild.build({
      entryPoints: [path.resolve(__dirname, "stub/handler/index.js")], // Entry file
      bundle: true,
      minify: true,
      format: "esm",
      platform: "node",
      target: "esnext",
      outfile: path.resolve(__dirname, "stub/handler/dist/index.mjs"),
    });

    logger.info("Stub Lambda build successful!");
  } catch (error) {
    logger.error("Stub Lambda build failed:", error);
    process.exit(1); // Exit with an error code
  }
};

export { buildApplicationLambda, buildStub };
