'use strict';
const Operator = require('./operator');
const kue = require('kue');
const moment = require('moment');
const constants = require('../constants/common');
const logger = require('winston');

class CleanupOperator extends Operator {

  constructor() {
    super(constants.JOB_CLEANUP, '* * */12 * * *');
  }

  run() {
    // fetch last 10k completed jobs and remove if older than expiry age
    kue.Job.rangeByState('complete', 0, 10000, 'asc', function(err, jobs) {
      jobs.forEach(function(job) {
        const jobCreation = moment(job.created_at, 'x');
        if (moment().diff(jobCreation, 'days') > 7) {
          job.remove(() => {
            logger.info(`Removed job ${job.id}`);
          });
        }
      });
    });
  }
}

module.exports = CleanupOperator;
