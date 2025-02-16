import archiver from "archiver";
import esbuild from "esbuild";
import fs from "node:fs";
import path from "path";

try {
  esbuild.buildSync({
    entryPoints: [path.resolve(__dirname, "stub/handler/index.ts")],
    bundle: true,
    minify: true,
    format: "cjs",
    platform: "node",
    outfile: path.resolve(__dirname, "stub/handler/dist/index.js"),
  });

  const output = fs.createWriteStream("local-lambda-stub.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(path.resolve(__dirname, "stub/handler/dist/"), false); // Add a whole folder
  archive.finalize();
} catch (error) {
  console.error("Stub Lambda build failed:", error);
  process.exit(1); // Exit with an error code
}
