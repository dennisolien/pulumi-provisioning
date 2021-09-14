import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const LAMBDA_TIMEOUT_SEC = 120;

const region = aws.Region.EUNorth1;
const providerOpt = { provider: new aws.Provider('prov', { region })}

// So that the lambdas can send log events to CloudWatch;
const lambdaLoggingPolicy = new aws.iam.Policy(`${pulumi.getProject()}-${pulumi.getStack()}-lambda-logging-policy`, {
  path: '/',
  description: "IAM policy for logging from a lambda",
  policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
          Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"],
          Effect: "Allow",
          Resource: "arn:aws:logs:*:*:*",
      }],
  }),
});

// Allow all actions on S3
const s3Policy = new aws.iam.Policy(`${pulumi.getStack()}-s3-policy`, {
  policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
          "Action": [
              "s3:*"],
          Effect: "Allow",
          Resource: "*",
      }],
  })
});

// Allow all actions on SQS (queue service)
const sqsPolicy = new aws.iam.Policy(`${pulumi.getStack()}-sqs-policy`, {
  policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
          Action: ["sqs:*"],
          Effect: "Allow",
          Resource: "*",
      }],
  })
});

// Lambda Role with needed policy
const lambdaRole = new aws.iam.Role(`${pulumi.getStack()}-lambda-role`, {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Action: 'sts:AssumeRole',
      Effect: 'Allow',
      Sid: '',
      Principal: {
        Service: ['lambda.amazonaws.com']
      },
    }],
  }),
  managedPolicyArns: [
    s3Policy.arn,
    sqsPolicy.arn,
    lambdaLoggingPolicy.arn,
  ],
}, providerOpt);

// Basic bucket with an html doc;
const bucket = new aws.s3.Bucket('web-bucket', {
  website: {
    indexDocument: 'index.html',
  },
});

// Upload html doc to s3
const bucketObject = new aws.s3.BucketObject('index.html', {
  acl: 'public-read',
  contentType: 'text/html',
  bucket: bucket,
  source: new pulumi.asset.FileAsset('../src/static/index.html'),
});

// Create a SQS queue
const stopQueue = new aws.sqs.Queue('stopQueue', { visibilityTimeoutSeconds: 180 });

// Lambda to add a message to a queue: example;
const addMessageToStopQueueLambda = new aws.lambda.Function(`${pulumi.getStack()}-add-message-stop-queue-lambda`, {
  code: new pulumi.asset.FileArchive('../src/functions/add-message-stop-queue'),
  role: lambdaRole.arn,
  timeout: LAMBDA_TIMEOUT_SEC,
  handler: 'index.handler',
  runtime: aws.lambda.NodeJS12dXRuntime,
  environment: {
    variables: {
      REGION: region,
      QUEUE_URL: stopQueue.url,
    }
  }
}, providerOpt);

// Lambda queue handler: stopQueueTrigger == EventSourceMapping for to trigger on queue event.
const stopQueueHandlerLambda = new aws.lambda.Function(`${pulumi.getStack()}-stop-queue-handler-lambda`, {
  code: new pulumi.asset.FileArchive('../src/functions/stop-queue-handler'),
  role: lambdaRole.arn,
  timeout: LAMBDA_TIMEOUT_SEC,
  handler: 'index.handler',
  runtime: aws.lambda.NodeJS12dXRuntime,
  environment: {
    variables: {
      REGION: region,
      QUEUE_URL: stopQueue.url,
    }
  }
}, providerOpt);

// Trigger the lambda stopQueueHandlerLambda on queue message becoming visible;
const stopQueueTrigger = new aws.lambda.EventSourceMapping(`${pulumi.getStack()}-stop-source-map`, {
  eventSourceArn: stopQueue.arn,
  functionName: stopQueueHandlerLambda.arn,
});

// Export the name of the bucket
export const bucketName = bucket.id;
export const bucketEndpoint = pulumi.interpolate`http://${bucket.websiteEndpoint}`;
