const queue = require('../setup/order.kue.js');
const async = require('async');
const logger = require('winston');

const asyncQueue = async.queue((order, callback) => {
  const createJob = queue.create('order', order)
    .save(err => {
     if(err) {
       logger.error(`Failed to add to queue. jobId: ${createJob.id}`, order);
       callback('FAILED');
     } else {
       logger.info(`Added to queue successfully ${createJob.id}`, order);
       callback(null);
     }
  });
});
asyncQueue.drain = () => {
  console.log('All Orders drained from queue!');
};
module.exports = asyncQueue;
