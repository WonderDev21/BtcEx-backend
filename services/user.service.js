const logger = require('winston');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const User = require('../models').models.User;
const Account = require('../models').models.Account;
const Document = require('../models').models.Document;
const Sequelize = require('sequelize');
const sequelize = require('../models');
const config = require('../config');
const accountService = require('./account.service');
const emailService = require('./email.service');
const redisService = require('./redis.service');
const moment = require('moment');
const smsService = require('./sms.service');
const otpUtils = require('../utils/otpUtils');
const jwtUtils = require('../utils/jwt.utils');
const cryptoUtils = require('../utils/cryptoUtils');
const {MessageTypes} = require('../constants/slackConstants.js');
const redisConstants = require('../constants/redisConstants');
const sendAdminNotification = require('../deployments/postMessage.js');
const {verificationEmailOptions} = require('../constants/serverConstants');
const {verificationStatus} = require('../constants/userConstants');
const {getMaskedEmail, getMaskedPhone, encodeString} = require('../utils/stringUtils');
const {arrayToJSON, objectToJSON, filterUserObj, filterAccounts} = require('../utils/jsonUtils');
const TFAUtils = require('../utils/2FAUtils');
// const {quicko} = require('../setup/quicko');

const baseURL = config.baseURL;
const supportedCurrencies = Object.keys(config.SUPPORTED_CURRENCY);
const ieoCurrencies = Object.keys(config.IEO_CURRENCY);
const fiatCurrencies = Object.keys(config.FIAT_CURRENCY);
const {APP_URL, APP_NAME, SUPPORT_EMAIL,} = config;
const allCurrencies = [...supportedCurrencies, ...ieoCurrencies, ...fiatCurrencies];

const {SERVER_ACCOUNT, SIGNUP_BONUS, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS_ENABLED, USER_REFERRAL_BONUS} = config;

const serverAccountId = SERVER_ACCOUNT.userId;

const rewardUser = async (user) => {
  const bonusAmount = SIGNUP_BONUS;
  logger.info(`Rewarding user with ${bonusAmount} tokens`, user);
  const {userId} = user;
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      try {
        // if (user.referredby) {
        //   const referralOptions = {remarks: `Referral bonus for ${user.email} registration`};
        //   const refferedUser = await exports.getUserByCustomerId(user.referredby);
        //   if (USER_REFERRAL_BONUS_ENABLED && refferedUser) {
        //     await accountService.debitBalance(serverAccountId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: userId}));
        //     await accountService.creditBalance(refferedUser.userId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: serverAccountId}));
        //   }
        // }
        if (SIGNUP_BONUS) {
          const userOptions = {remarks: `Signup Bonus for ${user.email}`};
          await accountService.debitBalance(serverAccountId, USER_REFERRAL_TOKEN, bonusAmount, t, _.assign({}, userOptions, {beneficiary: userId}));
          await accountService.creditBalance(userId, USER_REFERRAL_TOKEN, bonusAmount, t, _.assign({}, {remarks: 'Signup Bonus'}, {beneficiary: serverAccountId}));
        }
        await t.commit();
      } catch(err) {
        console.log('Error in user reward', err);
        t.rollback();
      }
    })
    .catch(err => {
      console.log('Error in user reward', err);
      logger.error('Error in User reward', err);
      return null;
    });
};
exports.getUserById = async userId => {
  return objectToJSON(await User.findById(userId));
};
exports.getUserWithAccounts = async userId => {
  const user = objectToJSON(await User.find({
    attributes: ['userId', 'jobServer', 'fullName', 'customerId', 'TFAKey', 'email', 'isVerified', 'kycVerified', 'phone', 'sumSubKycVerified'],
    where: {userId: userId},
    include: [
      {
        model: Account, as: 'accounts',
        attributes: ['currency', 'value', 'type', 'status'],
        exclude: ['keyObject'],
        where: {currency: {$in: allCurrencies}}
      }]
  }));
  const virtualAccount = objectToJSON(await Account.find({
    attributes: ['keyObject'],
    where: {currency: 'INR', userId}
  }));
  if (user) {
    const accounts = filterAccounts(arrayToJSON(user.accounts));
    user.accounts = accounts;
    user.TFAEnabled = !!(user.TFAKey && user.TFAKey.isEnabled);
    user.vAccount = {account_number: _.get(user, 'jobServer.virtual_account_number', null), ifsc: _.get(user, 'jobServer.virtual_account_ifsc', null)};
    user.TFAKey = undefined;
    user.jobServer = undefined;
    user.cashfreeAccount = virtualAccount ? virtualAccount.keyObject : null;
    return filterUserObj(user);
  }
  return null;
};
exports.getAllUser = async (queryParams) => {
  const {offset = 0, limit, email, phone, userId, kycStatus} = queryParams;
  const where = {};
  if (email) {
    where.email = email;
  }
  if (phone) {
    where.phone = phone;
  }
  if (userId) {
    where.userId = userId;
  }
  if (kycStatus) {
    where.kycVerified = kycStatus;
  }
  return arrayToJSON(await User.findAll({
    limit: Number(limit || 10),
    offset: Number(offset || 0),
    where: where,
    order: [['createdAt','DESC']],
  }));
};

exports.getUserByEmail = async email => {
  return await User.find({where: {email: email}});
};

exports.getUserByPhone= async phone => {
  return await User.find({where: {phone: phone}});
};

exports.getUserByCustomerId = async customerId => {
  return objectToJSON(await User.find({where: {customerId}}));
};

exports.getAllUserByKycStatus = async (status) => arrayToJSON(await User.findAll({where: {kycVerified: status}}));

exports.verifyAndAddUser = async user => {
  const emailStatus = await emailService.testEmailDeliverability(user.email);
  if (emailStatus.status === 200) {
    const isFalseEmail = _.get(emailStatus, 'data.disposable', true) === true ||
                        _.get(emailStatus, 'data.result', 'undeliverable') === 'undeliverable';
    if (isFalseEmail) {
      logger.info('False email found', user.email);
      return {status: 400, body: {message: 'Invalid Email', error: emailStatus}};
    } else {
      return exports.addUser(user);
    }
  } else {
    return exports.addUser(user);
  }
};
exports.addUser = async user => { // catch for Sequelize.UniqueConstraintError
    let newUser = null;
    try {
      newUser = await User.create(user);
      const newToken = jwtUtils.signToken({userId: newUser.userId, email: newUser.email});
      const accounts = await accountService.createAccount(newUser);
      const resp = await newUser.sendMailOnRegister(newToken);
      sendAdminNotification(MessageTypes.USER_SIGNED_UP, {email: newUser.email}); // don't await
      return {status: 200, body: filterUserObj(objectToJSON(newUser))};
    } catch(err) {
      logger.info(`Error Creating accounts or sending email for user ${newUser && newUser.userId}`, err);
      return {status: 400, body: {message: _.get(err, 'message', 'Error while signup')}};
    }
};
exports.resendVerificationEmail = async email => {
  try {
    const user = await exports.getUserByEmail(email);
    if (!user.isVerified) {
      const newToken = jwtUtils.signToken({userId: user.userId, email: user.email});
      const resp = await user.sendMailOnRegister(newToken);
      return {status: 200, body: {message: 'Email sent', email: user.email}};
    } else {
      return {status: 400, body: {message: 'Email is already verified'}};
    }
  } catch(error) {
    return {status: 400, body: {message: 'Email sending failed', error: error}};
  }
};

exports.getDocumentByUserId = async (userId) => {
  return objectToJSON(await Document.find({where: {userId}}));
};

// eslint-disable-next-line max-statements
exports.updateUser = async user => {
  const prevUser = await exports.getUserById(user.userId);
  // if (prevUser.country === 'in') {
  //   const document = await exports.getDocumentByUserId(user.userId);
  //   const resp = await quicko.verifyPan(document.panNumber);
  //   logger.info('PAN Verification => ', resp);
  //   if (resp.status === 'VALID') {
  //     document.idProof.panVerified = resp;
  //     await Document.update({idProof: document.idProof}, {where: {userId: user.userId}});
  //   } else {
  //     throw new Error('Pan Verification Failed!');
  //   }
  // }
  const updatedUser = await User.update(user,
    {
      where: {userId: user.userId},
      returning: true,
      plain: true
  });
  const updatedUserObj = filterUserObj(objectToJSON(updatedUser[1]));
  logger.info('User updated successfully', updatedUserObj.email);
  if (prevUser.kycVerified !== updatedUserObj.kycVerified) {
    // send email for kyc changes
    const emailFileMap = {
      [verificationStatus.APPROVED]: {file: 'KYCApproved.html', subject: 'KYC Approved'},
      [verificationStatus.PENDING]: {file: 'KYCReceived.html', subject: 'KYC Received'},
      [verificationStatus.REJECTED]: {file: 'KYCDeclined.html', subject: 'KYC Declined'}
    };
    try {
      if (updatedUserObj.kycVerified === verificationStatus.APPROVED && SIGNUP_BONUS) {
        // await rewardUser(updatedUserObj);
      }
      if(emailFileMap[updatedUserObj.kycVerified]) {
        const kycTemplate = fs.readFileSync(path.join(process.cwd(), `mailer/output/${emailFileMap[updatedUserObj.kycVerified].file}`));
        const compiled = _.template(kycTemplate);
        const kycEmail = compiled({
          APP_URL,
          APP_NAME,
          SUPPORT_EMAIL,
          fullName: updatedUserObj.fullName});
        const emailObject = {
          from: verificationEmailOptions.senderEmail,
          to: updatedUserObj.email,
          subject: emailFileMap[updatedUserObj.kycVerified].subject,
          html: kycEmail,
        };
        const mailResponse = await emailService.sendEmail(emailObject);
        logger.info(`Successfully sent ${emailObject.subject} KYC email`);
      } else {
        logger.error('KYC Email not sent');
      }
    } catch(err2) {
      logger.error('Error while sending KYC email', err2);
    }
  }
  return updatedUserObj;
};

exports.verifyUser = async (token) => {
  try {
    const userObj = jwtUtils.verifyToken(token);
    const foundUser = await User.findById(userObj.userId);
    logger.info(`User with email ${userObj.email} email verified`);
    const verifiedUserResponse = await foundUser.updateAttributes({isVerified: true});
    sendAdminNotification(MessageTypes.USER_EMAIL_VERIFIED, {email: userObj.email});
    return {status: 200, body: {message: 'User Verified', email: userObj.email}};
  } catch(error) {
    logger.info('User email verification failed', error);
    return {status: 400, body: {message: 'User verification failed', error: error}};
  }
};
exports.sendLoginOTP = async user => { // for non-2FA enabled user
  const randomOTP = otpUtils.generateRandomOTP();
  try {
    const newToken = jwtUtils.signToken({userId: user.userId, OTPVerified: false, permissions: {isAdmin: user.isAdmin}});
    const expireTimeInSeconds = 360; // 360 seconds = 6 mins;
    const expiryTime = moment().add(5, 'minutes').format('HH:mm:ss');
    const emailObj = {
      to: user.email,
      subject: 'Login OTP',
      html: `<html>
              <body>
                <h4>Hi ${user.fullName},</h4>
                <p>Your One Time Password (OTP) is <b>${randomOTP}</b>. This OTP is valid for next 5 minutes, till <b>${expiryTime} UTC</b></p>
                <br>
              </body>
            </html>`,
    };

    const redisResponse = await redisService.setExpire(`${redisConstants.OTP}-${user.userId}`, randomOTP, expireTimeInSeconds);
    // smsService.sendLoginOTP({to: user.phone, otp: randomOTP, expiryTime: expiryTime});
    emailService.sendEmail(emailObj);
    return {status: 200, body: {authenticator: false, message: 'OTP Sent', phone: getMaskedPhone(user.phone), email: getMaskedEmail(user.email)}, token: newToken};
  } catch(error) {
    logger.info(`Error while sending login otp to user ${user.userId} ${error}`, error);
    return {status: 400, body: {message: 'Sending OTP failed', error: error}};
  }
};
exports.getLoginToken = async (user) => { // for 2FA enabled user
  try {
    const newToken = jwtUtils.signToken({userId: user.userId, OTPVerified: false, permissions: {isAdmin: user.isAdmin}});
    return {status: 200, body: {authenticator: true, message: 'Password verified'}, token: newToken};
  } catch(error) {
    logger.info(`Error while signing token for user ${user.userId}`, error);
    return {status: 400, body: {message: 'Sending Token failed', error: error}};
  }
};
exports.signIn2FA = async (otp, token) => {
  try {
    const {userId} = jwtUtils.verifyToken(token);
    const user = await User.findById(userId);
    const isValid = user.compareTFA(otp);
    const tFAKey = user.TFAKey;
    const isSecurityCode = (tFAKey.securityCodes || []).includes(otp);
    console.log(isValid, isSecurityCode);
    if (isValid || isSecurityCode) {
      const userObject = await exports.getUserWithAccounts(userId);
      const newToken = jwtUtils.signToken({userId: userObject.userId, OTPVerified: true, permissions: {isAdmin: userObject.isAdmin}}, '1d');
      if (isSecurityCode) {
        tFAKey.securityCodes = tFAKey.securityCodes.filter(code => code !== otp);
        await User.update({TFAKey: tFAKey}, {where: {userId: userId}, returning: true, plain: true});
      }
      return {status: 200, body: userObject, token: newToken};
    }
    logger.info('Incorrect OTP submitted by user ', userId);
    return {status: 400, body: {message: 'Incorrect OTP'}};
  } catch(error) {
    logger.info('Incorrect OTP submitted by user 2 ', error);
    return {status: 400, body: {message: 'Incorrect OTP 2', error: error}};
  }
};
exports.signInOTP = async (otp, token) => {
  try {
    const {userId} = jwtUtils.verifyToken(token);
    const user = await User.findById(userId);
    const actualOTP = await redisService.getValue(`${redisConstants.OTP}-${userId}`);
    if (actualOTP === otp) {
      const userObject = await exports.getUserWithAccounts(userId);
      const newToken = jwtUtils.signToken({userId: userObject.userId, OTPVerified: true, permissions: {isAdmin: userObject.isAdmin}}, '1d');
      return {status: 200, body: userObject, token: newToken};
    }
    logger.info('Incorrect OTP submitted by user ', userId);
    return {status: 400, body: {message: 'Incorrect OTP'}};
  } catch(error) {
    logger.info('Incorrect OTP submitted by user ', error);
    return {status: 400, body: {message: 'Incorrect OTP', error: error}};
  }
};
exports.updatePassword = async (password, token) => {
  try {
    const {userId} = jwtUtils.verifyToken(token);
    logger.info(`Updating user password for user: ${userId}`);
    if (userId) {
      const user = await User.findById(userId);
      const hashedPassword = user.generateHashPassword(password);
      const updated = await user.updateAttributes({password: hashedPassword});
      logger.info(`Password update for User with id: ${userId}`);
      return {status: 200, body: {message: 'Password updated'}};
    } else {
      logger.error('Token not found while updating password');
      return {status: 400, body: {message: 'Invalid Token'}};
    }
  } catch(error) {
    logger.error('Password update Failed', error);
    return {status: 400, body: {message: 'Password update Failed', error: error}};
  }
};
exports.getDailyPriceNotificationUsers = async () => {
  try {
    const emails = await User.findAll({attributes: ['email'], where: {dailyPriceNotification: true}});
    return emails;
  } catch(error) {
    logger.error('Failed to get Users for daily email notification', error);
    return [];
  }
};
exports.sendForgotPasswordEmail = async (email, urlPath) => {
  try {
    const user = objectToJSON(await exports.getUserByEmail(email));
    if (!_.get(user, 'userId', null)) {
      logger.info(`User with email: ${email} not found.`);
      return {status: 400, body: {message: 'This user does not exist'}};
    }
    const newToken = jwtUtils.signToken({email: user.email, userId: user.userId, customerId: user.customerId}, '1h');
    const link = `${urlPath ? urlPath : baseURL}/changePassword?token=${newToken}`;
    const emailTemplate = fs.readFileSync(path.join(process.cwd(), 'mailer/output/forgotPassword.html'));
    const compiled = _.template(emailTemplate);
    const output = compiled({
      APP_URL,
      APP_NAME,
      SUPPORT_EMAIL,
      fullName: user.fullName,
      RESET_PASSWORD_LINK: link,
    });
    // TODO add path for intermeditate page
    const emailObj = {
      to: user.email,
      subject: 'Reset Password',
      html: output,
    };
    const emailResponse = await emailService.sendEmail(emailObj);
    logger.info(`Reset Password email sent to user: ${user.email}`);
    return {status: 200, body: {message: 'Email sent'}};
  } catch(error) {
    logger.error(`Sending email for reset password failed: ${user.email}`, error);
    return {status: 400, body: {message: 'Sending Email Failed', error: error}};
  }
};
exports.get2FAKeys = async (userId) => {
  const user = await exports.getUserById(userId);
  if (!(user.TFAKey && user.TFAKey.isEnabled)) {
    const data = await TFAUtils.gen2FA(user);
    const {base32, url} = data;
    await User.update({TFAKey: {secret: cryptoUtils.encrypt(base32), isEnabled: false}},
      {
        where: {userId: userId},
        returning: true,
        plain: true
    });
    return {status: 200, data: url};
  }
  return {status: 400, data: {message: '2FA is already enabled.'}};
};

exports.enable2FA = async (userId, code, securityCodes) => {
  const user = await User.find({where: {userId: userId}});
  const isValid = user.compareTFA(code);
  if (isValid) {
    const userObject = objectToJSON(user);
    const tFAKey = userObject.TFAKey;
    tFAKey.isEnabled = true;
    tFAKey.securityCodes = securityCodes;
    await User.update({TFAKey: tFAKey},
      {
        where: {userId: userId},
        returning: true,
        plain: true
    });
    return true;
  }
  logger.info('User provided wrong authenticator token');
  return false;
};

exports.disable2FA = async (userId, code) => {
  const user = await User.find({where: {userId: userId}});
  console.log(user.compareTFA);
  const isValid = user.compareTFA(code);
  const userObject = objectToJSON(user);
  const tFAKey = userObject.TFAKey;
  const isSecurityCode = (tFAKey.securityCodes || []).includes(code);
  console.log(isValid, isSecurityCode, tFAKey.securityCodes);
  if (isValid || isSecurityCode) {
    await User.update({TFAKey: {isEnabled: false}}, {
      where: {userId: userId},
      returning: true,
      plain: true
    });
    return true;
  }
  logger.info('User provided wrong authenticator token');
  return false;
};

