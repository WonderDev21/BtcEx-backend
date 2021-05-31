'use strict';
const queue = require('./kue');
const logger = require('winston');

class Worker {
  constructor(taskType, runFn) {
    this.taskType = taskType;
    this.run = runFn;
  }

  invoke (job, done) {
    console.log(`Invoking worker for ${job.type} - Job id: ${job.id}`);
    job.log('Invoking worker');
    this.run(job.data)
     .then(() => {
      console.log(`Worker for ${job.type} - Job id: ${job.id} returned successfully`);
      job.log('Worker returned successfully');
      done();
    }).catch(err => {
      logger.error(`Worker for ${job.type} - Job id: ${job.id} returned err: ${err.stack}`);
      job.log(`Worker failed ${err.message}`);
      console.log(`Worker failed ${err.message}`);
      done(err);
    });
  }

  register(workerCountArg) {
    const workerCount = workerCountArg || 1;
    logger.info(`Registering ${workerCount} worker(s) for ${this.taskType}`);
    console.log(`Registering ${workerCount} worker(s) for ${this.taskType}`);
    queue.process(this.taskType, workerCount, this.invoke.bind(this));
  }
};

module.exports = Worker;
