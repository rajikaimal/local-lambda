import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

const assumeRole = async () => {
  const client = new STSClient({ region: "eu-west-3" });
  const command = new AssumeRoleCommand({
    RoleArn:
      "arn:aws:iam::376461377045:role/ExampleServiceStack-ExampleServiceLambdaServiceRole-VyzEcmfiYB0t",
    RoleSessionName: "LocalSession",
  });

  const response = await client.send(command);
  return response.Credentials;
};

export default assumeRole;
