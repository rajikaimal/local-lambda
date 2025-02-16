import { Worker } from "worker_threads";
import { Credentials } from "@aws-sdk/client-sts";
import path from "node:path";
import { logger } from "./logger";

export interface WorkerData {
  event: any;
  credentials: Credentials;
}

async function worker(workerData: WorkerData): Promise<any> {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, "./workerProcess.mjs");
    const hostEnv = process.env;
    const { credentials } = workerData;

    const worker = new Worker(workerPath, {
      workerData: {
        event: workerData.event,
        context: undefined,
      },
      env: {
        isLocal: "true",
        ...hostEnv, // Inject host env
        AWS_ACCESS_KEY_ID: credentials.AccessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.SecretAccessKey,
        AWS_SESSION_TOKEN: credentials.SessionToken,
      },
      execArgv: ["--enable-source-maps"],
      stderr: true,
      stdin: true,
      stdout: true,
    });

    // Listen for messages from the worker
    worker.on("message", (message) => {
      console.log("Worker result:", message);
      resolve(message); // ✅ Send back worker result
    });

    // Handle errors
    worker.on("error", (error) => {
      logger.error("Worker error", error);
      reject(error);
    });

    // Handle worker exit
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

export default worker;
