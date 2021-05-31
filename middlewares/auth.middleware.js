const _ = require('lodash');
const logger = require('winston');
const AppConfig = require('../config/appConfig');
const userService = require('../services/user.service');
const jwtUtils = require('../utils/jwt.utils');

const attachUser = (req, res, next) => {
  const token = _.get(req.cookies, 'clientToken', null) || _.get(req.query, 'token', null);
  if (token) {
    try {
      const userObj = jwtUtils.verifyToken(token);
      logger.info('USER JWT VERIFIED : ' + userObj.userId);
      userService.getUserById(userObj.userId)
      .then(user => {
        req.user = user; // eslint-disable-line no-param-reassign
        if (userObj.OTPVerified) {
          req.OTPVerified = userObj.OTPVerified;
          next();
        } else {
          res.status(401).send({message: 'OTP NOT VERIFIED'});
        }
      });
    } catch(error) {
      res.cookie('clientToken', '', {maxAge: 0});
      res.status(401).send({error: error, message: 'Session expired. Login again to continue.'});
    }
  } else {
    logger.info('NO TOKEN FOUND FOR USER');
    res.status(401).send({message: 'Session timeout. Login again to continue.'});
  }
};
module.exports = attachUser;
