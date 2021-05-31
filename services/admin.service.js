const logger = require('winston');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const sequelize = require('../models');
const Sequelize = require('sequelize');
const User = require('../models').models.User;
const emailService = require('./email.service');
const accountService = require('./account.service');
const userService = require('./user.service');
const iotaService = require('./iota.service');
const {objectToJSON, arrayToJSON} = require('../utils/jsonUtils');
const {verificationStatus} = require('../constants/userConstants');
const tradeToCsv = require('../utils/trade-to-csv');
const invGenerator = require('../scripts/invoice-generator');
const {verificationEmailOptions} = require('../constants/serverConstants');
const {APP_URL, APP_NAME, SUPPORT_EMAIL} = require('../config');

exports.sendKYCReminder = async () => {
  try {
    const users = arrayToJSON(await User.findAll({attributes: ['email'], where: {kycVerified: 'UNVERIFIED'}}));
    const emailFile = fs.readFileSync(path.join(process.cwd(), 'mailer/output/kycReminder.html'));
    const compiled = _.template(emailFile);
    const html = compiled();
    const emails = users.map(x => x.email) || [];
    const emailObject = {
      from: verificationEmailOptions.infoEmail,
      list: emails,
      subject: 'KYC Verification',
      html: html,
    };
    const mailResponse = await emailService.sendMultipleEmail(emailObject);
    logger.info(`KYC reminder emails sent to ${emails}`);
    return mailResponse;
  } catch (err) {
    logger.error('Failed KYC reminder emails', err);
    return err;
  }
};
exports.addAccount = async (userId, currencies) => {
  const user = await userService.getUserById(userId);
  return await accountService.createAccount(user);
};
exports.updateIOTAAddress = async (accountId, type, key = 0) => {
  const account = await accountService.getAccountById(accountId);
  const seed = account.keyObject.seed;
  let index = parseInt(key);
  if (type === 'INCREMENT') {
    index += 1;
  } else if (type === 'DECREMENT') {
    index = index > 0 ? index - 1 : 0;
  }
  const newAddress = iotaService.getNewAddress(seed, index);
  const newKeyObject = _.assign({}, account.keyObject, {key: index});
  const updatedWallet = await accountService.updateWalletDetails(accountId, newAddress, newKeyObject);
  return updatedWallet;
};
exports.verifyUserKYC = async (userId, kycStatus, msg = null, isSumSub) => {
  const prevUser = await userService.getUserById(userId);
  if (prevUser.kycVerified !== kycStatus) {
    const updatedUser = await User.update(isSumSub ? {sumSubKycVerified: kycStatus} : {kycVerified: kycStatus},
      {
        attributes: ['kycVerified', 'email', 'fullName'],
        where: {userId: userId},
        returning: true,
        plain: true
    });
    const updatedUserObj = objectToJSON(updatedUser[1]);
    logger.info(`User ${updatedUserObj.email} KYC status changed to ${kycStatus}`);
    // send email for kyc changes
    const emailFileMap = {
      [verificationStatus.APPROVED]: {file: 'KYCApproved.html', subject: 'KYC Approved'},
      [verificationStatus.PENDING]: {file: 'KYCReceived.html', subject: 'KYC Received'},
      [verificationStatus.REJECTED]: {file: 'KYCDeclined.html', subject: 'KYC Declined'}
    };
    try {
      if(emailFileMap[updatedUserObj.kycVerified]) {
        const kycTemplate = fs.readFileSync(path.join(process.cwd(), `mailer/output/${emailFileMap[updatedUserObj.kycVerified].file}`));
        const compiled = _.template(kycTemplate);
        const kycEmail = compiled({
            fullName: updatedUserObj.fullName,
            APP_URL,
            APP_NAME,
            SUPPORT_EMAIL,
            REASON: msg,
          });
        const emailObject = {
          from: verificationEmailOptions.senderEmail,
          to: updatedUserObj.email,
          subject: emailFileMap[updatedUserObj.kycVerified].subject,
          html: kycEmail,
          REASON: msg, // in case of rejection provide custom message in string only
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
};
exports.getInvoices = async () => {
  const buyers = await sequelize.query(`select "Users"."fullName", "Users"."customerId", "Users"."phone", "Users"."email",
  doc."idProof"->'panNumber' as pan, "Trades"."tradeId", "Trades"."buyerFee", "Trades"."currency", "Trades"."price", "Trades"."size",
  "Trades"."createdAt", "Trades"."refId", "Trades"."refNo"
  from "Trades"
  join "Documents" as doc
  on doc."userId" = "Trades"."buyUserId"
  join "Users"
  on "Users"."userId" = doc."userId"`, {type: Sequelize.QueryTypes.SELECT});
  const sellers = await sequelize.query(`
  select "Users"."fullName", "Users"."customerId", "Users"."phone", "Users"."email",
  doc."idProof"->'panNumber' as pan, "Trades"."tradeId", "Trades"."sellerFee", "Trades"."currency", "Trades"."price", "Trades"."size",
  "Trades"."createdAt", "Trades"."refId", "Trades"."refNo"
  from "Trades"
  join "Documents" as doc
  on doc."userId" = "Trades"."sellUserId"
  join "Users"
  on "Users"."userId" = doc."userId"
  `, {type: Sequelize.QueryTypes.SELECT});
  const x = tradeToCsv(buyers, sellers);
  invGenerator(x);
  return x;
};
