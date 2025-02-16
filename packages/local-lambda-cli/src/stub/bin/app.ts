#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import {
  CloudFormationClient,
  DescribeStacksCommand,
  CreateStackCommand,
  UpdateStackCommand,
} from "@aws-sdk/client-cloudformation";
import { LocalLambdaStack } from "../infra";

// Function to deploy the stack
async function deployStubStack(): Promise<void> {
  // Synthesize the entire app to get the CloudFormation template

  const app = new cdk.App();
  const stack = new LocalLambdaStack(app, "LocalLambdaV2Stack", {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT, // Uses the AWS CLI or environment variables
      region: process.env.CDK_DEFAULT_REGION, // Uses the AWS CLI or environment variables
    },
    functionName: process.env.FN as string,
  });
  const cloudFormationTemplate = app
    .synth()
    .getStackByName(stack.stackName)?.template;

  if (!cloudFormationTemplate) {
    throw new Error("Failed to synthesize the CloudFormation template.");
  }

  // Initialize the CloudFormation client
  const client = new CloudFormationClient({ region: "eu-west-3" });

  // First, check if the stack exists by describing it
  const describeStacksCommand = new DescribeStacksCommand({
    StackName: stack.stackName,
  });
  const describeResponse = await client.send(describeStacksCommand);

  if (describeResponse.Stacks && describeResponse.Stacks.length > 0) {
    // Stack exists, so update it
    try {
      const updateStackCommand = new UpdateStackCommand({
        StackName: stack.stackName,
        TemplateBody: JSON.stringify(cloudFormationTemplate),
        Capabilities: ["CAPABILITY_IAM"],
      });
      await client.send(updateStackCommand);
      console.log(`Stack ${stack.stackName} updated.`);
    } catch (error) {}
  } else {
    try {
      // Stack doesn't exist, so create it
      const createStackCommand = new CreateStackCommand({
        StackName: stack.stackName,
        TemplateBody: JSON.stringify(cloudFormationTemplate),
        Capabilities: ["CAPABILITY_IAM"],
      });
      await client.send(createStackCommand);
      console.log(`Stack ${stack.stackName} created.`);
    } catch (error) {
      console.error("Stack creation failed", error);
    }
  }
}

export { deployStubStack as deployStack };
