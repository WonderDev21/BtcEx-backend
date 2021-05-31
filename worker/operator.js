'use strict';
const Job = require('../mongo/models/job');
const queue = require('./kue');
const schedule = require('node-schedule');
const later = require('later');
later.date.UTC();
const constants = require('../constants/common');
const moment = require('moment');
const logger = require('winston');

class Operator {

  constructor(taskType, frequencyExpression){
    this.taskType = taskType;
    this.frequencyExpression = frequencyExpression;
  }

  shouldExecute(job) {
    const now = moment();
    const jobStartDate = moment(job.startDate);
    const jobEndDate = job.endDate && moment(job.endDate);
    if (jobStartDate.isAfter(now) || (jobEndDate && jobEndDate.isBefore(now))){
      return false;
    }
    const jobSeries = later.parse.cron(job.cronExpression, true);
    const jobNextRun = moment(later.schedule(jobSeries).next());

    const jobLastRun = job.lastAttemptedAt ? moment(job.lastAttemptedAt) : moment(0);
    const isNextRunToday = moment().diff(jobNextRun, 'days') === 0;
    const wasLastRunToday = moment().diff(jobLastRun.startOf('day'), 'days') === 0;
    const wasLastRunSuccess = job.lastAttemptStatus === constants.COMPLETED;
    return isNextRunToday && !(wasLastRunToday && wasLastRunSuccess);
  }
  run() {
    logger.info(`Running operator for ${this.taskType}`);
    Job.find({type: this.taskType, isActive: true}).exec()
    .then(jobs => {
      jobs.forEach(job => {
        console.log('Find Job');
        if (this.shouldExecute(job)) {
          const task = queue.create(job.type, job.args);
          task.attempts(2).backoff({delay: 5000, type: 'fixed'})
          .save(err => {
            if (err) {
              job.lastAttemptedAt = new Date();
              job.lastAttemptStatus = constants.FAILED;
              job.save((err, res) => {
                logger.error(`Unable to save task ${task.id} for job ${job._id}-${job.type} in queue`);
              });
            }
          });
          task.on('complete', () => {
            console.log(`Completed task ${task.id} for job ${job._id}-${job.type}`);
            job.lastAttemptedAt = new Date();
            job.lastAttemptStatus = constants.COMPLETED;
            job.save((err, res) => {
              logger.info(`Saved successful attempt status of ${task.id} for job ${job._id}-${job.type}`);
            });
          });
          task.on('failed', errMsg => {
            logger.error(`Failed to execute task ${task.id} for job ${job._id}-${job.type}. Message: ${errMsg}`);
            job.lastAttemptedAt = new Date();
            job.lastAttemptStatus = constants.FAILED;
            job.save((err, res) => {
              logger.info(`Saved failed attempt status of ${task.id} for job ${job._id}-${job.type}`);
            });
          });
        }
      }, this);
    });
  }
  register(){
    logger.info(`Registering Operator for ${this.taskType} at frequency ${this.frequencyExpression}`);
    const operatorSeries = later.parse.cron(this.frequencyExpression, true);
    const operatorRuns = later.schedule(operatorSeries).next();
    const operatorNextRun = moment(operatorRuns);
    const diffNextRun = moment().diff(operatorNextRun, 'hours', true);
    logger.info(`Next run in ${diffNextRun} hours`);
    return schedule.scheduleJob(this.frequencyExpression, this.run.bind(this));
  }
};
module.exports = Operator;
