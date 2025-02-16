// @ts-nocheck
import { DescribeEndpointCommand, IoTClient } from "@aws-sdk/client-iot";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import iotSdk from "aws-iot-device-sdk";
import crypto from "crypto";

const workerId = crypto.randomBytes(16).toString("hex");

const topic = `local-lambda/${process.env.APP}/${process.env.SERVICE}/${process.env.FN}/${workerId}`;
const client = new IoTClient();
const command = new DescribeEndpointCommand({ endpointType: "iot:Data-ATS" });

let onMessage: (evt: any) => void;
let device: iotSdk.device;

client.send(command).then((res) => {
  device = new iotSdk.device({
    protocol: "wss",
    debug: true,
    host: res.endpointAddress,
    region: "eu-west-3",
    keepalive: 60,
  });
  device.on("error", console.log);
  device.on("connect", console.log);
  device.subscribe(topic, {
    qos: 1,
  });

  device.on("message", async (_topic, buffer: Buffer) => {
    const evt = JSON.parse(buffer.toString());
    console.log("Recieved fragment", evt);
    onMessage(evt);
  });
});

const iotClient = new IoTDataPlaneClient({ region: process.env.AWS_REGION });

export const handler = async (event: any, context: any) => {
  const message = JSON.stringify({
    event,
    context,
    timestamp: new Date().toISOString(),
    workerId,
  });

  try {
    const result = await new Promise<any>((r) => {
      onMessage = (evt) => {
        console.log("Message recieved", evt);
        r(evt);
      };

      const command = new PublishCommand({
        topic: `local-lambda/${process.env.APP}/${process.env.SERVICE}/${process.env.FN}`,
        payload: Buffer.from(message),
      });
      iotClient.send(command);
      console.log(`Message published to topic ${topic}`);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: result }),
    };
  } catch (error) {
    console.error("Error publishing message:", error);
    throw error;
  }
};
