import * as cdk from "aws-cdk-lib";
import {
  CloudFormationClient,
  CreateStackCommand,
} from "@aws-sdk/client-cloudformation";
import { LocalLambdaStack } from "../infra";

async function deployStubStack(): Promise<void> {
  try {
    console.log("Deploying LocalLambda Stack");

    const app = new cdk.App();
    const stack = new LocalLambdaStack(app, "LocalLambdaStack", {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
      functionName: process.env.FN as string,
    });
    const cloudFormationTemplate = app
      .synth()
      .stacks.find((s) => s.stackName === "LocalLambdaStack");

    if (!cloudFormationTemplate) {
      throw new Error("Failed to synthesize the CloudFormation template.");
    }

    const client = new CloudFormationClient({ region: process.env.AWS_REGION });
    const createStackCommand = new CreateStackCommand({
      StackName: stack.stackName,
      TemplateBody: JSON.stringify(cloudFormationTemplate.template),
      Capabilities: ["CAPABILITY_IAM"],
    });
    await client.send(createStackCommand);
    console.log(`Stack ${stack.stackName} created.`);
  } catch (error: any) {
    if (error.name !== "AlreadyExistsException")
      console.log("Error when deploying LocalLambdaStack", error);
  }
}

export { deployStubStack as deployStack };
