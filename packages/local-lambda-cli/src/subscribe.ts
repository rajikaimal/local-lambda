import { DescribeEndpointCommand, IoTClient } from "@aws-sdk/client-iot";
import { Credentials } from "@aws-sdk/client-sts";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import iotSdk from "aws-iot-device-sdk";
import { logger } from "./logger";
import worker from "./worker";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";

async function subscribe({ credentials }: { credentials: Credentials }) {
  const provider = fromNodeProviderChain({
    clientConfig: { region: "eu-west-3" },
    // profile: "profile",
    // roleArn: "",
    // mfaCodeProvider: async (serialArn: string) => {
    //   const readline = await import("readline");
    //   const rl = readline.createInterface({
    //     input: process.stdin,
    //     output: process.stdout,
    //   });
    //   return new Promise<string>((resolve) => {
    //     Logger.debug(`Require MFA token for serial ARN ${serialArn}`);
    //     const prompt = () =>
    //       rl.question(`Enter MFA code for ${serialArn}: `, async (input) => {
    //         if (input.trim() !== "") {
    //           resolve(input.trim());
    //           rl.close();
    //         } else {
    //           // prompt again if no input
    //           prompt();
    //         }
    //       });
    //     prompt();
    //   });
    // },
  });

  const creds = await provider();

  const iot = new IoTClient({
    region: "eu-west-3",
    credentials: provider,
  });

  const response = await iot.send(
    new DescribeEndpointCommand({
      endpointType: "iot:Data-ATS",
    })
  );

  const device = new iotSdk.device({
    protocol: "wss",
    host: response.endpointAddress,
    region: "eu-west-3",
    accessKeyId: creds.accessKeyId,
    secretKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
    reconnectPeriod: 1,
    keepalive: 60,
  });

  const topic = `local-lambda/${process.env.APP}/${process.env.SERVICE}/${process.env.FN}`;
  device.subscribe(topic, { qos: 1 });

  device.on("connect", () => {
    // logger.info("connect");
  });

  device.on("error", (err) => {
    logger.info("error");
  });

  device.on("close", () => {
    logger.info("close");
  });

  device.on("reconnect", () => {
    logger.info("reconnect");
  });

  device.on("message", async (topic, payload) => {
    logger.info("connected to endpoint", response.endpointAddress);

    try {
      const event = JSON.parse(payload.toString());
      // call Node.js worker
      const workerData = { event, credentials };
      logger.info("Invoking worker...");
      const result = await worker(workerData);

      const iotClient = new IoTDataPlaneClient({
        region: "eu-west-3",
        credentials: provider,
      });

      const command = new PublishCommand({
        topic: `${topic}/${event.workerId}`,
        payload: Buffer.from(JSON.stringify(result)),
        qos: 1,
      });

      await iotClient.send(command);
      logger.info(`Published result to topic: ${topic}`);
    } catch (error) {
      logger.error("Error processing message:", error);
    }
  });
}

export default subscribe;
