import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import iotSdk from "aws-iot-device-sdk";
import worker from "./worker";

async function subscribe() {
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
    }),
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

  const topic = "local/process/topic";
  device.subscribe(topic, { qos: 1 });

  device.on("connect", () => {
    // console.log("connect");
  });

  device.on("error", (err) => {
    console.log("error");
  });

  device.on("close", () => {
    console.log("close");
  });

  device.on("reconnect", () => {
    console.log("reconnect");
  });

  device.on("message", async (topic, payload) => {
    console.log("connected to endpoint", response.endpointAddress);

    const event = JSON.parse(payload.toString());
    console.log("received event", event);
    // run the node.js worker
    const workerData = {
      event,
    };
    console.log("invoking worker");
    await worker(workerData);
  });
}

export default subscribe;
