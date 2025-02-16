import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { CustomResource } from "aws-cdk-lib/core";
import { Provider } from "aws-cdk-lib/custom-resources";
import * as fs from "fs";

import { Construct } from "constructs";
import path from "path";

export type StackProps = cdk.StackProps & {
  functionName: string;
};

export class LocalLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    // Lambda function to debug
    const functionName = props.functionName;

    // IoT Thing
    const iotThing = new iot.CfnThing(this, "LocalLambdaIotThing", {
      thingName: "LocalLambdaThing",
    });

    // IoT Policy
    const iotPolicy = new iot.CfnPolicy(this, "LocalLambdaIotPolicy", {
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

    const certificatePem = fs
      .readFileSync(path.join(__dirname, "cert.csr"), "utf8")
      .toString();

    // const response = await iot
    //   .createKeysAndCertificate({
    //     setAsActive: true, // Optional: set the certificate as active immediately
    //   })
    //   .promise();

    // IoT Certificate
    const iotCertificate = new iot.CfnCertificate(
      this,
      "LocalLambdaIotCertificate",
      {
        certificateSigningRequest: certificatePem,
        status: "ACTIVE",
      }
    );

    // Attach the Certificate to the IoT Policy
    new iot.CfnPolicyPrincipalAttachment(this, "PolicyAttachment", {
      policyName: iotPolicy.policyName!,
      principal: iotCertificate.attrArn,
    });

    // Attach the Certificate to the IoT Thing
    new iot.CfnThingPrincipalAttachment(this, "ThingCertificateAttachment", {
      thingName: iotThing.thingName!,
      principal: iotCertificate.attrArn,
    });

    const stubProviderLambda = new lambda.Function(
      this,
      "StubProviderLambdaFn",
      {
        runtime: lambda.Runtime.NODEJS_18_X, // or another runtime of your choice
        handler: "index.onEvent", // points to the onEvent handler in your index.ts file
        code: lambda.Code.fromInline(`
        const { LambdaClient, UpdateFunctionCodeCommand, GetFunctionCommand } = require("@aws-sdk/client-lambda");
        const { IAMClient, PutRolePolicyCommand, UpdateAssumeRolePolicyCommand } = require("@aws-sdk/client-iam");

        exports.onEvent = async (event) => {
          console.log("Received event:", JSON.stringify(event, null, 2));

          const { RequestType } = event;
          const lambda = new LambdaClient({});

          if (RequestType === "Create" || RequestType === "Update") {
            try {
              console.log("Updating Lambda function code...");
              const command = new UpdateFunctionCodeCommand({
                FunctionName: "${functionName}",
                S3Bucket: "local-lambda-stub",
                S3Key: "local-lambda-stub.zip", 
              });
              const response = await lambda.send(command);

              console.log("Lambda update response:", response);
              console.log("Updating role");

              console.log("Fetching lambda role details");

              const getFunctionCommand = new GetFunctionCommand({
                FunctionName: "${functionName}",
              });
              const lambdaData = await lambda.send(getFunctionCommand);
              const roleName = lambdaData.Configuration.Role.split('/').pop(); // Extract role name from ARN

              console.log("Role name:", roleName);

              const iamClient = new IAMClient({ region: "${process.env.AWS_REGION}" });
              const roleCommand = new PutRolePolicyCommand({
                RoleName: roleName,
                PolicyName: "IoTPolicy",
                PolicyDocument: JSON.stringify({
                  Version: "2012-10-17",
                  Statement: [
                    {
                      "Effect": "Allow",
                      "Action": "iot:Publish",
                      "Resource": "*"
                    },
                    {
                      "Effect": "Allow",
                      "Action": [
                        "iot:*"
                      ],
                      "Resource": "*"
                    }
                  ],
                }),
              });
              const roleResp = await iamClient.send(roleCommand);
              console.log("Role update response:", roleResp);

              console.log("Updating trust relationship");

              // llambda cli should be able to assume role hence this update
              const newTrustPolicy = {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Principal: { Service: 'lambda.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                  },
                  {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::376461377045:user/admin"
                    },
                    "Action": "sts:AssumeRole"
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
        timeout: cdk.Duration.seconds(30),
      }
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
        ],
      })
    );

    stubProviderLambda.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess")
    );

    const customResourceProvider = new Provider(this, "StubProvider", {
      onEventHandler: stubProviderLambda,
    });

    new CustomResource(this, "StubCustomResource", {
      serviceToken: customResourceProvider.serviceToken,
      properties: {
        deployement: Math.random(), // this is to invoke custom resource whenver the cli process starts
      },
    });

    // Outputs for local process configuration
    new cdk.CfnOutput(this, "IotEndpoint", {
      value: cdk.Fn.sub("${AWS::Region}.amazonaws.com"), // IoT endpoint
    });
    new cdk.CfnOutput(this, "IotCertificateArnUpdate", {
      value: iotCertificate.attrArn,
    });
  }
}
