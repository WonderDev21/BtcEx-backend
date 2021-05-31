const Notification = require('../models/notification.model');
const moment = require('moment');
const _  = require('lodash');
exports.addNewNotification = async (notification) => {
  const n = _.assign({}, {
    type: notification.userId ? 'user' : 'global',
    title: '', priority: 1, read: false
  }, notification);
  return await Notification.create(n);
};
exports.getAllNotification = async (userId) => {
  const notifications = await Promise.all([
    Notification.find({userId}),
    Notification.find({type: 'global'})
  ]);
  return notifications;
};
