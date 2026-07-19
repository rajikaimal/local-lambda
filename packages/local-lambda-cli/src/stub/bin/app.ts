import * as cdk from "aws-cdk-lib";
import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
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

    // Check if stack already exists
    let stackExists = false;
    try {
      const describeCommand = new DescribeStacksCommand({
        StackName: stack.stackName,
      });
      const result = await client.send(describeCommand);
      const stackStatus = result.Stacks?.[0]?.StackStatus;
      // Stack exists unless it's in a failed/rolled-back state from a creation attempt
      stackExists =
        !!stackStatus &&
        !stackStatus.includes("FAILED") &&
        !stackStatus.includes("ROLLBACK");
    } catch {
      stackExists = false;
    }

    if (stackExists) {
      const updateCommand = new UpdateStackCommand({
        StackName: stack.stackName,
        TemplateBody: JSON.stringify(cloudFormationTemplate.template),
        Capabilities: ["CAPABILITY_IAM"],
      });
      try {
        await client.send(updateCommand);
        console.log(`Stack ${stack.stackName} update initiated.`);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "NothingToUpdate") {
          console.log(`Stack ${stack.stackName} is already up to date.`);
        } else {
          throw error;
        }
      }
    } else {
      // Stack doesn't exist or is in a bad state — delete it first if needed, then create
      if (stackExists === false) {
        try {
          const describeCmd = new DescribeStacksCommand({
            StackName: stack.stackName,
          });
          const res = await client.send(describeCmd);
          const status = res.Stacks?.[0]?.StackStatus;
          if (
            status &&
            (status.includes("FAILED") || status.includes("ROLLBACK"))
          ) {
            console.log(
              `Stack ${stack.stackName} is in ${status} state, deleting...`,
            );
            const { DeleteStackCommand } = await import(
              "@aws-sdk/client-cloudformation"
            );
            await client.send(
              new DeleteStackCommand({ StackName: stack.stackName }),
            );
            // Wait for deletion to complete
            await waitForStackDeletion(client, stack.stackName);
          }
        } catch {
          // Stack doesn't exist, which is fine
        }
      }

      const createCommand = new CreateStackCommand({
        StackName: stack.stackName,
        TemplateBody: JSON.stringify(cloudFormationTemplate.template),
        Capabilities: ["CAPABILITY_IAM"],
      });
      await client.send(createCommand);
      console.log(`Stack ${stack.stackName} created.`);
    }
  } catch (error: unknown) {
    console.log("Error when deploying LocalLambdaStack", error);
    throw error;
  }
}

async function waitForStackDeletion(
  client: CloudFormationClient,
  stackName: string,
  maxAttempts = 30,
  delayMs = 2000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await client.send(
        new DescribeStacksCommand({ StackName: stackName }),
      );
      const status = result.Stacks?.[0]?.StackStatus;
      if (!status) return; // Stack is gone
      if (status.includes("DELETE_COMPLETE")) return;
      if (status.includes("DELETE_FAILED")) {
        throw new Error(`Stack deletion failed with status: ${status}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ValidationError") return; // Stack no longer exists
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Timed out waiting for stack ${stackName} to delete`);
}

export { deployStubStack as deployStack };
