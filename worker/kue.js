const config = require('../config');
const kue = require('kue');
const queue = kue.createQueue({
  redis: config.REDIS_URL,
  prefix: config.appName
});

kue.app.listen(3500);
module.exports = queue;
