import chokidar from "chokidar";
import * as path from "node:path";
import { buildApplicationLambda } from "./build";
import { logger } from "./logger";

const watcher = () => {
  const currentDir = path.resolve(".");
  logger.info(`Watching directory: ${currentDir}`);

  const watcher = chokidar.watch(currentDir, {
    persistent: true,
    ignoreInitial: true,
    ignored: ["node_modules/**", "**/.git/**", "**/dist"], // Exclude specific directories
  });

  watcher.on("change", async (_changedPath) => {
    logger.info("Rebuilding");
    try {
      await buildApplicationLambda();
    } catch (e) {
      logger.error("Rebuild failed:", e);
    }
  });

  watcher.on("error", (error) => logger.info(`Watcher error: ${error}`));
};

export default watcher;
