import { parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "url";
import path from "node:path";

// Call the Lambda handler function
(async () => {
  try {
    // Send the response back to the main thread
    // const mod = await import("../../examples/service/handler/dist/index.mjs");
    const __dirname = process.cwd();
    const handlerPath = path.resolve(__dirname, "handler/dist/index.mjs");
    const mod = await import(handlerPath);
    const response = await mod.handler(workerData);
    parentPort?.postMessage(response);
  } catch (error) {
    // Send the error back to the main thread
    parentPort?.postMessage({ error });
  }
})();
