import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import { CustomResource } from "aws-cdk-lib/core";
import { Provider } from "aws-cdk-lib/custom-resources";
import * as path from "path";

import { Construct } from "constructs";

export type StackProps = cdk.StackProps & {
  functionName: string;
};

export class LocalLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    // Lambda function to debug
    const functionName = props.functionName;

    // IoT Thing
    new iot.CfnThing(this, "LocalLambdaIotThing", {
      thingName: "LocalLambdaThing",
    });

    // IoT Policy
    new iot.CfnPolicy(this, "LocalLambdaIotPolicy", {
      policyName: "LocalLambdaIotPolicy",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "iot:Connect",
              "iot:Subscribe",
              "iot:Publish",
              "iot:Receive",
            ],
            Resource: ["*"],
          },
        ],
      },
    });

    const asset = new s3Assets.Asset(this, "LocalLambdaStubAsset", {
      path: path.join(__dirname, "../../local-lambda-stub.zip"),
    });

    // Stub Lambda
    const stubProviderLambda = new lambda.Function(
      this,
      "StubProviderLambdaFn",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.onEvent",
        code: lambda.Code.fromInline(`
        const { LambdaClient, UpdateFunctionCodeCommand, GetFunctionCommand, waitUntilFunctionUpdatedV2 } = require("@aws-sdk/client-lambda");
        const { IAMClient, PutRolePolicyCommand, UpdateAssumeRolePolicyCommand } = require("@aws-sdk/client-iam");
        const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");

        async function waitForFunctionActive(lambdaClient, functionName, maxAttempts, delayMs) {
          for (let i = 0; i < maxAttempts; i++) {
            const cmd = new GetFunctionCommand({ FunctionName: functionName });
            const res = await lambdaClient.send(cmd);
            const state = res.Configuration?.State;
            const lastUpdateStatus = res.Configuration?.LastUpdateStatus;
            if (state === "Active" && lastUpdateStatus === "Successful") {
              return;
            }
            if (lastUpdateStatus === "Failed") {
              throw new Error("Lambda function is in Failed state: " + (res.Configuration?.LastUpdateStatusReason || "unknown"));
            }
            console.log("Function state: " + state + ", lastUpdateStatus: " + lastUpdateStatus + ", waiting...");
            await new Promise(r => setTimeout(r, delayMs));
          }
          throw new Error("Timed out waiting for Lambda function to become Active");
        }

        async function updateWithRetry(lambdaClient, functionName, s3Bucket, s3Key, maxAttempts, delayMs) {
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              console.log("Attempt " + attempt + "/" + maxAttempts + " - Updating Lambda function code...");
              await waitForFunctionActive(lambdaClient, functionName, 30, 2000);
              const command = new UpdateFunctionCodeCommand({
                FunctionName: functionName,
                S3Bucket: s3Bucket,
                S3Key: s3Key,
              });
              const response = await lambdaClient.send(command);
              console.log("Lambda update initiated, waiting for activation...");
              await waitForFunctionActive(lambdaClient, functionName, 30, 2000);
              console.log("Lambda function code updated successfully.");
              return response;
            } catch (error) {
              if (error.name === "ResourceConflictException" && attempt < maxAttempts) {
                console.log("Resource conflict, retrying in " + delayMs + "ms...");
                await new Promise(r => setTimeout(r, delayMs));
                continue;
              }
              throw error;
            }
          }
        }

        exports.onEvent = async (event) => {
          console.log("Received event:", JSON.stringify(event, null, 2));

          const { RequestType } = event;
          const lambda = new LambdaClient({});
          const functionName = "${functionName}";

          if (RequestType === "Create" || RequestType === "Update") {
            try {
              const { s3BucketName, s3ObjectKey } = event.ResourceProperties;
              await updateWithRetry(lambda, functionName, s3BucketName, s3ObjectKey, 5, 5000);

              console.log("Fetching lambda role details");
              const getFunctionCommand = new GetFunctionCommand({ FunctionName: functionName });
              const lambdaData = await lambda.send(getFunctionCommand);
              const roleName = lambdaData.Configuration.Role.split('/').pop();

              console.log("Role name:", roleName);

              const iamClient = new IAMClient({ region: "${process.env.AWS_REGION}" });

              const roleCommand = new PutRolePolicyCommand({
                RoleName: roleName,
                PolicyName: "IoTPolicy",
                PolicyDocument: JSON.stringify({
                  Version: "2012-10-17",
                  Statement: [
                    {
                      Effect: "Allow",
                      Action: "iot:Publish",
                      Resource: "*"
                    },
                    {
                      Effect: "Allow",
                      Action: ["iot:Subscribe", "iot:Receive", "iot:Connect"],
                      Resource: "*"
                    }
                  ],
                }),
              });
              const roleResp = await iamClient.send(roleCommand);
              console.log("Role update response:", roleResp);

              console.log("Updating trust relationship");

              const stsClient = new STSClient({ region: "${process.env.AWS_REGION}" });
              const identity = await stsClient.send(new GetCallerIdentityCommand({}));
              const callerArn = identity.Arn;

              const newTrustPolicy = {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Principal: { Service: 'lambda.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                  },
                  {
                    Effect: "Allow",
                    Principal: { AWS: callerArn },
                    Action: "sts:AssumeRole"
                  }
                ],
              };
              const updateTrustPolicyCommand = new UpdateAssumeRolePolicyCommand({
                RoleName: roleName,
                PolicyDocument: JSON.stringify(newTrustPolicy),
              });
              const updateTrustPolicyResp = await iamClient.send(updateTrustPolicyCommand);
              console.log("Trust policy updated", updateTrustPolicyResp);
            } catch (error) {
              console.error("Error updating Lambda function:", error);
              throw error;
            }
          }

          return {
            Status: "SUCCESS",
            PhysicalResourceId: event.PhysicalResourceId || "stub-physical-id",
            Data: { Key: "Value" },
          };
        };
      `),
        timeout: cdk.Duration.seconds(120),
      },
    );

    stubProviderLambda.role?.attachInlinePolicy(
      new iam.Policy(this, "StubLambdaPolicy", {
        statements: [
          new iam.PolicyStatement({
            actions: ["lambda:UpdateFunctionCode"],
            resources: [
              `arn:aws:lambda:${this.region}:${this.account}:function:${functionName}`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ["lambda:GetFunction"],
            resources: [
              `arn:aws:lambda:${this.region}:${this.account}:function:${functionName}`,
            ],
          }),
          new iam.PolicyStatement({
            actions: ["iam:UpdateAssumeRolePolicy"],
            resources: ["*"],
          }),
          new iam.PolicyStatement({
            actions: ["iam:PutRolePolicy"],
            resources: ["*"],
          }),
          new iam.PolicyStatement({
            actions: ["sts:GetCallerIdentity"],
            resources: ["*"],
          }),
        ],
      }),
    );

    asset.grantRead(stubProviderLambda.role!);
    const customResourceProvider = new Provider(this, "StubProvider", {
      onEventHandler: stubProviderLambda,
    });

    new CustomResource(this, "StubCustomResource", {
      serviceToken: customResourceProvider.serviceToken,
      properties: {
        deployement: Math.random(), // this is to invoke custom resource whenver the cli process starts
        s3BucketName: asset.s3BucketName,
        s3ObjectKey: asset.s3ObjectKey,
      },
    });

    // Outputs for local process configuration
    new cdk.CfnOutput(this, "IotEndpoint", {
      value: cdk.Fn.sub("${AWS::Region}.amazonaws.com"), // IoT endpoint
    });
  }
}
