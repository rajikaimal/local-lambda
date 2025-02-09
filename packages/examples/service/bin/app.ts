#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ServiceStack } from "../infra";

const app = new cdk.App();
new ServiceStack(app, "ExampleServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, // Uses the AWS CLI or environment variables
    region: process.env.CDK_DEFAULT_REGION, // Uses the AWS CLI or environment variables
  },
});
