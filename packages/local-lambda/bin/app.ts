#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LocalLambdaStack } from "../infra";

const app = new cdk.App();
new LocalLambdaStack(app, "LocalLambdaStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT, // Uses the AWS CLI or environment variables
    region: process.env.CDK_DEFAULT_REGION, // Uses the AWS CLI or environment variables
  },
});
