import chokidar from "chokidar";
import * as path from "node:path";
import { buildApplicationLambda } from "./build";
import config from "./config";

const watcher = () => {
  const isDev = config.isDev;
  const supportDir = path.resolve("../examples/service/");
  const currentDir = path.resolve(".");
  console.log(`Watching directory: ${currentDir}`);

  // todo: remove isDev
  const watcher = chokidar.watch(isDev ? supportDir : currentDir, {
    persistent: true,
    ignoreInitial: true,
    ignored: ["node_modules/**", "**/.git/**", "**/dist"], // Exclude specific directories
  });

  watcher
    .on("change", async (path) => {
      console.log("Rebuilding");
      await buildApplicationLambda();
    })
    .on("add", (path) => console.log(`File added: ${path}`))
    .on("unlink", (path) => console.log(`File removed: ${path}`));

  watcher.on("error", (error) => console.error(`Watcher error: ${error}`));
};

export default watcher;
