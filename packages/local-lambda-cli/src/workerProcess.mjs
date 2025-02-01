import { parentPort, workerData } from "node:worker_threads";

// Call the Lambda handler function
(async () => {
  //   const handler = path.resolve(__dirname, "handler.mjs");
  try {
    console.log("in process", workerData);
    // Send the response back to the main thread
    // const mod = await import("./handler.mjs");
    const mod = await import("../../examples/service/handler/dist/index.mjs");
    const response = await mod.handler(workerData);
    parentPort?.postMessage(response);
  } catch (error) {
    // Send the error back to the main thread
    parentPort?.postMessage({ error });
  }
})();
