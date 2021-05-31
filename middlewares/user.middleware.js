const _ = require('lodash');
const logger = require('winston');
const isSameUser = (req, res, next) => {
  const userId = _.get(req, 'user.userId', null);
  const bodyuserId = _.get(req, 'body.userId', null);
  const userIdParams = _.get(req, 'params.userId', null);
  if ((userId && bodyuserId) || (userId && userIdParams)) {
    if (userId === bodyuserId && userId === userIdParams) {
      next();
    } else {
      logger.error(`Another user tried to access ${req.path} ${userId + ':' + bodyuserId + ':'+ userIdParams}`);
      res.status(401).send({message: 'Access denied'});
    }
  } else {
    logger.info(`Invalid check for User on path ${req.path}`);
    next();
  }
};
module.exports = isSameUser;
