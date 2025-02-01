import * as cdk from "aws-cdk-lib";
import * as iot from "aws-cdk-lib/aws-iot";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as fs from "fs";
import { Construct } from "constructs";
import path from "path";

export class LocalLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    // IoT Certificate
    const iotCertificate = new iot.CfnCertificate(
      this,
      "LocalLambdaIotCertificate",
      {
        certificateSigningRequest: certificatePem,
        status: "ACTIVE",
      },
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

    // Lambda Function
    const stubLambda = new lambda.Function(this, "StubLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "handler/dist")),
      handler: "index.handler",
    });

    // Grant Lambda permission to publish to IoT
    stubLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["iot:Publish"],
        resources: ["*"], // Replace with more restrictive resource ARNs in production
      }),
    );

    // Outputs for local process configuration
    new cdk.CfnOutput(this, "IotEndpoint", {
      value: cdk.Fn.sub("${AWS::Region}.amazonaws.com"), // IoT endpoint
    });
    new cdk.CfnOutput(this, "IotCertificateArn", {
      value: iotCertificate.attrArn,
    });
  }
}
