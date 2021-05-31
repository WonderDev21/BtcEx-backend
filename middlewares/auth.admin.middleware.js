const _ = require('lodash');
const logger = require('winston');
const AppConfig = require('../config/appConfig');
const userService = require('../services/user.service');
const jwtUtils = require('../utils/jwt.utils');

const attachAdmin = async (req, res, next) => {
  const token = _.get(req.cookies, 'clientToken', null) || _.get(req.query, 'token', null);
  if (token) {
    try {
      const userObj = jwtUtils.verifyToken(token);
      logger.info('ADMIN JWT VERIFIED : ' + userObj.userId);
      const user = await userService.getUserById(userObj.userId);
      if (user.isAdmin) {
        req.user = user;  // eslint-disable-line no-param-reassign
        req.OTPVerified = userObj.OTPVerified;
        next();
      } else {
        res.status(401).send({message: 'USER NOT AN ADMIN'});
      }
    } catch(error) {
      res.status(401).send({error: error, message: 'INVALID JWT TOKEN'});
    }
  } else {
    logger.info('NO TOKEN FOUND FOR ADMIN');
    res.status(401).send({message: 'EMPTY_TOKEN_ERROR'});
  }
};
module.exports = attachAdmin;
