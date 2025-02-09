import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import path from "path";

export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the SQS queue
    const queue = new sqs.Queue(this, "ExampleQueue", {
      queueName: "ExampleQueue",
    });

    // Lambda Function
    const serviceFn = new lambda.Function(this, "ExampleServiceLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "handler/dist")),
      handler: "index.handler",
      environment: {
        QUEUE_URL: queue.queueUrl, // Pass the queue URL to the Lambda function
      },
    });

    queue.grantSendMessages(serviceFn);
  }
}
