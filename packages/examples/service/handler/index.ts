import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

type Character = {
  id: string;
  name: string;
  images: string[];
  debut: Record<string, string>;
  personal: Record<string, string>;
  family: Record<string, string>;
  jutsu: string[];
  natureType: string[];
  uniqueTraits: string[];
  voiceActors: Record<string, string>;
};

async function fetchNarutoCharacters(): Promise<Character[]> {
  const response = await fetch("https://narutodb.xyz/api/character", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching characters: ${response.statusText}`);
  }
  const data = await response.json();
  return data.characters;
}

const sqs = new SQSClient({
  region: "eu-west-3",
});

export const handler = async (event) => {
  const characters = await fetchNarutoCharacters();
  const params = {
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify({ foo: "bar" }),
  };

  try {
    const result = await sqs.send(new SendMessageCommand(params));
    console.log("Message sent to SQS new msg!!! :");
    return {
      status: 200,
      data: characters,
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
