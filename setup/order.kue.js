const kue = require('kue');
const config = require('../config');
const queue = kue.createQueue({
  redis: config.REDIS_URL
});
kue.app.listen(3500);
module.exports = queue;
