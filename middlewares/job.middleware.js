const crypto = require('crypto');
const logger = require('winston');
const config = require('../config');
const secret = config.JOB_SECRET || '95A9et9nka48l98&eKJk';
const reGenHash = function(time) {
  const hash = crypto.createHmac('sha256', secret).update(time).digest('base64');
  // const time = String(parseInt(Date.now()/1000) * 1000);
  // const obj = {msg_mac: hash, time_created: time};
  return hash;
};
const verifyJob = (req, res, next) => {
  const token = req.headers['x-access-token'];
  try {
    const jsonToken = JSON.parse(token);
    const hash = reGenHash(jsonToken.tc);
    if (hash === jsonToken.msg_mac) {
      next();
    } else {
      logger.error('Wrong token found for JOB API');
      res.status(401).send({message: 'Wrong token found!'});
    }
  } catch(err) {
    logger.error('Token not found for JOB API');
    res.status(401).send({message: 'Unauthorized!'});
  }
};
module.exports = verifyJob;
