const logger = require('winston');
const {verificationStatus} = require('../constants/userConstants');
const {FIAT_CURRENCY} = require('../config/index');
const fiatCurrencies = Object.values(FIAT_CURRENCY);
console.log(fiatCurrencies);
const kycVerify = (req, res, next) => {
  const reqCurrency = req.body.currency || req.query.currency;
  logger.info('Middleware currency', reqCurrency);
  const user = req.user;
  if (user) {
    logger.info(`KYC Status of user:${user.email} `, user.kycVerified);
    if (reqCurrency && fiatCurrencies.includes(reqCurrency)) {
      if (user.kycVerified === verificationStatus.APPROVED) {
        logger.info('User is KYC Verified', user.email);
        next();
      } else {
        logger.info("User's KYC Not Verified", user.email);
        res.status(400).send({message: "User's KYC Not Verified"});
      }
    } else {
      next();
    }
  } else {
    logger.info('USER NOT FOUND IN KYC MIDDLEWARE');
    res.status(400).send({message: "USER DOESN'T EXIST"});
  }
};
module.exports = kycVerify;
