'use strict';
const Worker = require('./worker');
const constants = require('../constants/common');
const path = require('path');
const NotificationJob = require('./NotificationJob');
const smsNotificationJob = require('./smsNotificationJob');
const NotificationOperator = require('./NotificationOperator');
const smsNotificationOperator = require('./smsNotificationOperator');
const JobCleanupOperator = require('./cleanupOperator');

const env = process.env.NODE_ENV || 'dev';

module.exports = () => {
  const NotificationWorker = new Worker(constants.DAILY_EMAIL, NotificationJob);
  const smsNotificationWorker = new Worker(constants.DAILY_SMS, smsNotificationJob);
  const notificationOperator = new NotificationOperator('0 * * * * *');
  const smsnotificationOperator = new smsNotificationOperator('0 * * * * *');
  const jobCleanupOperator = new JobCleanupOperator();
  notificationOperator.register();
  smsnotificationOperator.register();
  NotificationWorker.register();
  smsNotificationWorker.register();
  jobCleanupOperator.register();
};
