# local-lambda-cli

`local-lambda` is a CLI to test AWS Lambda functions locally.

## Features

- Locally test Lambda deployed with any IaC tool such as CDK, Terrform etc.
- Test IAM permissions - Lambda fails if the IAM permissions are not permissive
- Breakpoint debugging with any IDE
- Live reload

## Install

```
npm i -g @rajikaimal/llambda
```

## Usage

Set following env variables.

- APP - application to which the Lambda belongs to
- SERVICE - service to which the Lambda belongs to
- FN - The Lambda function name

Navigate to the handler directory of the function and run,

```
llambda
```

MIT
