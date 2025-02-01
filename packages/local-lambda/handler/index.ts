import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";

const iotClient = new IoTDataPlaneClient({ region: process.env.AWS_REGION });

export const handler = async (event: any, context: any) => {
  const topic = "local/process/topic";
  const message = JSON.stringify({
    event,
    context,
    timestamp: new Date().toISOString(),
  });

  try {
    const command = new PublishCommand({
      topic,
      payload: Buffer.from(message),
    });
    await iotClient.send(command);
    console.log(`Message published to topic ${topic}`);
  } catch (error) {
    console.error("Error publishing message:", error);
  }
};
