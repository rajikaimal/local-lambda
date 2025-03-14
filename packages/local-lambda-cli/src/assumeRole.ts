import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

const assumeRole = async () => {
  const client = new STSClient({});
  const lambda = new LambdaClient({});

  const getFunctionCommand = new GetFunctionCommand({
    FunctionName: process.env.FN,
  });
  const lambdaData = await lambda.send(getFunctionCommand);
  const roleArn = lambdaData?.Configuration?.Role;

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: "LocalSession",
  });

  const response = await client.send(command);
  return response.Credentials;
};

export default assumeRole;
