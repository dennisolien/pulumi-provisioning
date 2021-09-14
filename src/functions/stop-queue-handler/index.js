const aws = require('aws-sdk');

exports.handler = async function stopQueueHandler(event) {
  console.log('StopQueueHandler:', JSON.stringify(event, null, 2));
};