import { Worker } from "worker_threads";
// import url from "node:url";
import { Credentials } from "@aws-sdk/client-sts";
import path from "node:path";
import { logger } from "./logger";

export interface WorkerData {
  event: any;
  credentials: Credentials;
}

async function worker(workerData: WorkerData) {
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
      ...hostEnv, // inject host env
      // inject credentials from assumeRole
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
    console.log("message", message);
  });

  // Listen for errors in the worker
  worker.on("error", (error) => logger.error("error", error));

  // Handle worker exit
  worker.on("exit", (code) => {
    if (code !== 0) {
      new Error(`Worker stopped with exit code ${code}`);
    }
  });
}

export default worker;
