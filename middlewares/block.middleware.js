const logger = require('winston');
const blockRequest = (req, res, next) => {
  logger.error(`Blocked URL: --->|${req.path}|<--- accessed by ${req.ip} body`);
  res.status(503).send({message: 'This service is temporarily unavailable'});
};
module.exports = blockRequest;
