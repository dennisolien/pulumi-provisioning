const aws = require('aws-sdk');

const sqs = new aws.SQS({ apiVersion: '2012-11-05' });

const sendMsg = async (params) => {
  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data.MessageId);
    });
  });
};

exports.handler = async function addMsgToStopQueue(event) {
  const params = {
    DelaySeconds: 2 * 60,
    MessageAttributes: {
      'Title': {
        DataType: 'String',
        StringValue: 'Testing q',
      },
    },
    MessageBody: 'Testing the aws SQS queue',
    QueueUrl: process.env.QUEUE_URL,
  };
  try {
    const msgRes = await sendMsg(params);
    console.log(`Added msg to queue: ${msgRes}`);
  } catch (error) {
    console.log(`Error adding to queue: ${JSON.stringify(error, null, 2)}`);
  }
}