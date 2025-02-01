import { Worker } from "worker_threads";
// import url from "node:url";
import path from "node:path";

// Define types for workerData to ensure correct structure
interface WorkerData {
  event: any;
}

async function worker(workerData: WorkerData) {
  const workerPath = path.resolve(__dirname, "./workerProcess.mjs");
  const hostEnv = process.env;

  const worker = new Worker(workerPath, {
    workerData: {
      event: workerData.event,
      context: undefined,
    },
    env: {
      isLocal: "true",
      ...hostEnv, // inject host env
    },
    execArgv: ["--enable-source-maps"],
    stderr: true,
    stdin: true,
    stdout: true,
  });

  // Listen for messages from the worker
  worker.on("message", (message) => {
    console.log("message", message);
  });

  // Listen for errors in the worker
  worker.on("error", (error) => console.log("error", error));

  // Handle worker exit
  worker.on("exit", (code) => {
    if (code !== 0) {
      new Error(`Worker stopped with exit code ${code}`);
    }
  });
}

export default worker;
