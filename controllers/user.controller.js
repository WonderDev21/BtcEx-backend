const userService = require('../services/user.service');
const documentService = require('../services/document.service');
const orderService = require('../services/order.service');
const redisService = require('../services/redis.service');
const accountService = require('../services/account.service');

const jwtUtils = require('../utils/jwt.utils');
const Promise = require('bluebird');
const logger = require('winston');
const _ = require('lodash');
const {baseURL, fees, feeStructure} = require('../config');
const {encodeString} = require('../utils/stringUtils');
const {verificationStatus} = require('../constants/userConstants');
const redisConstants = require('../constants/redisConstants');
const {filterUserObj, filterAccounts} = require('../utils/jsonUtils');
const {verifyCaptcha, generateCode} = require('../utils/common');

const cookieOptions = {
  httpOnly: true,
  maxAge: 7200000, // 86400000 2hr now
};
const isSignupDisabled = false;

// eslint-disable-next-line max-statements
exports.requestSignInOTP = async (request, response) => {
    const email = request.body.email;
    const pwd = request.body.password;
    const captcha = request.body.captcha;
    try {
      const captchaRes = await verifyCaptcha(captcha);
      if (!captchaRes.success) {
        response.status(400).send({message: 'Captcha verification failed. Please try again.'});
        return;
      }
      const user = await userService.getUserByEmail(email);
      const userObject = user && user.toJSON();
      if(_.isEmpty(user)) {
        response.status(404).send({message: `User not found with email ${email}`});
        logger.info(`User with email: ${email} not found!`);
      } else if (!pwd) {
        response.status(400).send({message: `Password not provided for ${email}`});
      } else {
        const res = await user.comparePassword(user, pwd || '');
        if (res) {
          if (!userObject.isVerified) {
            response.status(403).send({message: `Email ${userObject.email} is not verified`});
          } else {
            let resp = null;
            if (userObject.TFAKey && userObject.TFAKey.isEnabled) {
              resp = await userService.getLoginToken(user);
            } else {
              resp = await userService.sendLoginOTP(user);
            }
            if (resp.token) {
              response.cookie('clientToken', resp.token, cookieOptions);
            }
            response.status(resp.status).send(resp.body);
          }
        } else {
          logger.info(`Invalid Password provided by user with email: ${email}`);
          response.status(400).send({message: 'Invalid Password'});
        }
      }
    } catch(err) {
      logger.info(`Login error for user with email: ${email}`, err);
      response.status(400).send({message: 'Login Error', error: err});
    }
};
exports.SignInOTP = async (request, response) => {
  const {authenticator, otp} = request.body;
  const token = _.get(request.cookies, 'clientToken', null) || _.get(request.query, 'token', null);
  try {
    const resp = authenticator === true ? await userService.signIn2FA(otp, token) : await userService.signInOTP(otp, token);
    if (resp.token) {
      response.cookie('clientToken', resp.token, cookieOptions);
    }
    response.status(resp.status).send(resp.body);
  } catch(error) {
    response.status(400).send({message: 'Some error in OTP Login', error: error});
  }
};
exports.resendOTP = async (request, response) => {
  const token = _.get(request.cookies, 'clientToken', null) || _.get(request.query, 'token', null);
  try {
    const userObj = jwtUtils.verifyToken(token);
    const user = await userService.getUserById(userObj.userId);
    const resp = await userService.sendLoginOTP(user);
    if (resp.token) {
      response.cookie('clientToken', resp.token, cookieOptions);
    }
    response.status(resp.status).send(resp.body);
  } catch(error) {
    response.status(400).send({message: 'Some error while resending Login OTP', error: error});
  }
};
exports.registerUser = async (request, response) => {
    try {
      if(isSignupDisabled) {
        return response.status(400).send({message: 'Signup is disabled currently. Please come back later!'});
      }
      const user = _.pick(request.body, ['email', 'password', 'phone', 'fullName', 'referredby', 'captcha']);
      const captcha = await verifyCaptcha(user.captcha);
      if (!captcha.success) {
        response.status(400).send({message: 'Captcha verification failed. Please try again.'});
        return;
      }
      const userResponse = await userService.addUser(user);
      logger.info('YAY !! New user registered', userResponse.body);
      response.status(userResponse.status).send(userResponse.body);
    } catch(err) {
      logger.info('PRIORITY-0 Error while user registration', err);
      // logger.info(`Error in adding user ${JSON.stringify(err)}`);
      response.status(422).send({message: 'Signup failed', error: err});
    }
};


exports.verifyUser = async (request, response) => {
  const token = request.body.token;
  try {
    const resp = await userService.verifyUser(token);
    logger.info('userVerified status Updated');
    response.status(resp.status).send(resp.body);
    // response.redirect(resp.status, resp.path);
  } catch(err) {
    response.status(400, {message: 'Verification Failed', error: err});
  }
};

exports.getAllUser = async (request, response) => {
  try {
    const users = await userService.getAllUser(request.query);
    response.status(200).send(users.map(x => filterUserObj(x)));
  } catch(err) {
    console.log(err);
    response.status(404).send(err);
  }
};

exports.getUser = async (request, response) => {
  const userId = _.get(request, 'params.userId', request.userId);
  logger.info(`Getting user by userid: ${userId}`);
  try {
    const user = await userService.getUserById(userId);
    response.status(200).send(user);
  } catch(err) {
    response.status(404).send(err);
  }
};
exports.getWalletAddress = async(request, response) => {
  const userId = _.get(request, 'params.userId', request.user && request.user.userId);
  const currency = request.query.currency || null;
  logger.info(`Getting wallet address for userId: ${userId} for ${currency}`);
  try {
    const wallet = await accountService.getWalletAddress(userId, currency);
    response.status(200).send(wallet);
  } catch(err) {
    response.status(404).send(err);
  }
};
exports.updateUser = async(req, res) => { // only admin access
  try {
    const updatedUser = await userService.updateUser(req.body);
    res.status(200).send(updatedUser);
  } catch(error) {
    res.status(400).send(error);
  }
};

exports.getUserDetails = async (request, response) => {
  const userId = _.get(request, 'user.userId', null);
  logger.info(`Getting user details for user: ${userId}`);
  try {
    const userObject = await userService.getUserWithAccounts(userId);
    if(userObject.kycVerified !== verificationStatus.UNVERIFIED) {
      const document = await documentService.getUserbankDetails(userId);
      userObject.bankDetails = document && document.bankDetails;
      userObject.hasAddedBankInfo = !!(document && document.bankDetails);
    }
    userObject.isOTPVerified = request.isOTPVerified;
    response.status(200).send(userObject);
  } catch(err) {
    response.status(404).send(err);
  }
};
exports.getAllUserOrders = async (request, response) => {
  const offset = _.get(request, 'query.offset', 0);
  try {
    const userId = request.params.userId;
    logger.info(`Getting user orders for user: ${userId}`);
    const orders = await orderService.getOrdersByUserId(userId, offset);
    response.status(200).send(orders);
  } catch(err) {
    response.status(404).send(err);
  }
};
exports.resetPassword = async (request, response) => {
  try {
    const password = request.body.password;
    const token = request.body.token;
    const resp = await userService.updatePassword(password, token);
    response.status(resp.status).send(resp.body);
  } catch(err) {
    response.status(400).send(err);
  }
};
exports.updatePassword = async (request, response) => {
  try {
    const newPassword = request.body.newPassword;
    const oldPassword = request.body.oldPassword;
    const email = request.user.email;
    const user = await userService.getUserByEmail(email);
    const isMatch = await user.comparePassword(user, oldPassword);
    if(isMatch) {
      const hashedPassword = user.generateHashPassword(newPassword);
      const updated = await user.updateAttributes({password: hashedPassword});
      logger.info(`Password updated for User with email: ${email}`);
      response.status(200).send({message: 'Password updated !'});
    } else {
      logger.error('Incorrect Old password supplied by', email);
      response.status(400).send({message: 'Incorrect Old Password'});
    }
  } catch(err) {
    logger.error('Password update Failed', err);
    response.status(400).send({message: 'Password update Failed', error: err});
  }
};
exports.updatePhone = async (request, response) => {
  try {
    const newPhone = '91'+request.body.phone;
    const email = request.user.email;
    const user = await userService.getUserByEmail(email);
    const updated = await user.updateAttributes({phone: newPhone});
    logger.info(`Phone updated for User with email: ${email}`);
    response.status(200).send({phone: newPhone});
  } catch(err) {
    logger.error('Phone update Failed', err);
    response.status(400).send({message: err && err.message ? err.message : 'Phone update Failed', error: err && err.message});
  }
};
exports.sendForgotPasswordEmail = async (request, response) => {
  try {
    const email = request.body.email;
    const urlPath = request.body.path;
    logger.info(`Sending Forgot Password email to user : ${email}`);
    const resp = await userService.sendForgotPasswordEmail(email, urlPath);
    response.status(resp.status).send(resp.body);
  } catch(err) {
    response.status(400).send(err);
  }
};
exports.resendVerificationEmail = async (request, response) => {
  try {
    const email = request.body.email;
    const resp = await userService.resendVerificationEmail(email);
    response.status(resp.status).send(resp.body);
  } catch(err) {
    response.status(400).send(err);
  }
};
exports.getAnnouncements = async (request, response) => {
  try {
    const message = await redisService.getValue(redisConstants.ANNOUNCEMENT);
    if (message) {
      response.status(200).send(message);
      return;
    }
    response.sendStatus(204);
  } catch(err) {
    response.status(400).send({message: 'Error fetching announcement', error: err});
  }
};
exports.logoutUser = async (request, response) => {
  response.cookie('clientToken', '', {maxAge: 0, httpOnly: true});
  response.status(200).send({message: 'Success'});
};

exports.getTradeFees = async (request, response) => {
  response.status(200).send({fees, feeStructure});
};

exports.enable2FA = async (request, response) => {
  const userId = request.params.userId;
  try {
    const code = request.body.code;
    const securityCodes = generateCode(6, 6);
    const resp = await userService.enable2FA(userId, code, securityCodes);
    if (resp) {
      response.status(200).send({message: 'Success', securityCodes});
    } else {
      response.status(400).send({message: 'Invalid Code Provided. Try again!'});
    }
  } catch(err) {
    console.log(err);
    response.status(400).send({message: '2FA failed', error: err});
  }
};

exports.disable2FA = async (request, response) => {
  const userId = request.params.userId;
  try {
    const code = request.body.code;
    const resp = await userService.disable2FA(userId, code);
    if (resp) {
      response.status(200).send({message: 'Success'});
    } else {
      response.status(400).send({message: 'Invalid Code Provided. Try again!'});
    }
  } catch(err) {
    console.log(err);
    response.status(400).send({message: '2FA failed', error: err});
  }
};

exports.get2FAKeys = async (request, response) => {
  const userId = request.params.userId;
  try {
    const resp = await userService.get2FAKeys(userId);
    response.status(resp.status).send(resp.data);
  } catch(err) {
    response.status(400).send({message: '2FA failed', error: err});
  }
};

exports.verify2FA = async (request, response) => {
  try {
    const code = request.body.code;
    const email = request.user.email;
    const user = await userService.getUserByEmail(email);
    const isValid = user.compareTFA(code);
    if (isValid) {
      response.status(200).send({message: 'Success'});
    } else {
      logger.info('User provided wrong auth token -> ', email);
      response.status(400).send({message: 'Invalid Code Provided'});
    }
  } catch(err) {
    logger.info('Token not provided by user -> ', email);
    response.status(400).send({message: 'Code Not Provided', error: err});
  }
};
