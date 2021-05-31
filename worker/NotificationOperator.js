'use strict';
const Operator = require('./operator');
const schedule = require('node-schedule');
const later = require('later');
const queue = require('./kue');
const _ = require('lodash');
later.date.UTC();
const User = require('../mongo/models/User');
const constants = require('../constants/common');
const moment = require('moment');
const logger = require('winston');

class NotificationOperator extends Operator {
  constructor(frequencyExpression) {
    super(constants.DAILY_EMAIL, frequencyExpression);
  }
  run() {
    console.log('queing operation ', this.taskType);
    logger.info(`Running operator for ${this.taskType}`);
    const users = [{email: 'parag99799@gmail.com', password: '1', mobile:'+917405112793'}];
    // User.find({})
    // .then((users) => {
    _.forEach(users, user => {
      const task = queue.create(constants.DAILY_EMAIL, user);
      task.attempts(2).backoff({delay: 5000, type: 'fixed'})
        .save(err => {
          if (err) {
            logger.error(`Unable to perform daily email task for job-${job.type} in queue`);
          }
          console.log('No Error in Save');
        });
      task.on('complete', () => {
        console.log(`Completed task ${task.id} for email`);
      });
      task.on('failed', errMsg => {
        console.log(`Failed to execute task ${task.id} for email. Message: ${errMsg}`);
      });
    });
    //});
  }

  register() {
    console.log(`Registering Email Operator for ${this.taskType} at frequency ${this.frequencyExpression}`);
    const operatorSeries = later.parse.cron(this.frequencyExpression, true);
    const operatorRuns = later.schedule(operatorSeries).next();
    const operatorNextRun = moment(operatorRuns);
    const diffNextRun = moment(operatorNextRun).diff(moment(), 'seconds', true);
    console.log(`Next run in ${diffNextRun} seconds`);
    return schedule.scheduleJob(this.frequencyExpression, this.run.bind(this));
  }
}

module.exports = NotificationOperator;
