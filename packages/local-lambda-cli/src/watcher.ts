import chokidar from "chokidar";
import * as path from "node:path";
import { buildApplicationLambda } from "./build";
import config from "./config";
import { logger } from "./logger";

const watcher = () => {
  const isDev = config.isDev;
  const supportDir = path.resolve("../examples/service/");
  const currentDir = path.resolve(".");
  logger.info(`Watching directory: ${currentDir}`);

  // todo: remove isDev
  const watcher = chokidar.watch(isDev ? supportDir : currentDir, {
    persistent: true,
    ignoreInitial: true,
    ignored: ["node_modules/**", "**/.git/**", "**/dist"], // Exclude specific directories
  });

  watcher.on("change", async (path) => {
    logger.info("Rebuilding");
    await buildApplicationLambda();
  });

  watcher.on("error", (error) => logger.info(`Watcher error: ${error}`));
};

export default watcher;
