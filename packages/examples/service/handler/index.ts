import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({
  region: "eu-west-3",
});

export const handler = async (event) => {
  const params = {
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify({ foo: "bar" }),
  };

  try {
    const result = await sqs.send(new SendMessageCommand(params));
    console.log("Message sent to SQS new msg!!! :");
    return {
      status: 200,
      data: "ok",
      result: result,
      queue: process.env.QUEUE_URL,
    };
  } catch (error) {
    console.error("Error sending message to SQS:", error);
    return {
      status: 500,
      data: error,
    };
  }
};
