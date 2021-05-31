const config = require('../config');
const Promise = require('bluebird');
const redis = Promise.promisifyAll(require('redis'));
const client = redis.createClient(config.REDIS_URL);

exports.getValue = async(key) => {
    return client.getAsync(key);
};
exports.setValue = async (key, value) => {
    return client.setAsync(key,  value);
};
exports.setExpire = async (key, value, time = 86400) => { // time in seconds
    return client.setAsync(key,  value)
    .then(() => client.expireAsync(key, time));
};
exports.deleteValue = async (key) => {
    return key && client.delAsync(key);
};
