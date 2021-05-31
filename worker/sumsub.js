const Amqp = require('../setup/amqp');
const logger = require('winston');
const _ = require('lodash');
const Sequelize = require('sequelize');
const sequelize = require('../models');
const config = require('../config');
const adminService = require('../services/admin.service');
const accountService = require('../services/account.service');
const userService = require('../services/user.service');
const sendAdminNotification = require('../deployments/postMessage.js');
const {verificationStatus} = require('../constants/userConstants');
const {MessageTypes} = require('../constants/slackConstants.js');
const amqp = new Amqp();
const exchangeName = 'SUMSUB';
const queueName = 'KYC_RESULTS';
const routingKey = 'KYC_RESULTS';

const {SERVER_ACCOUNT, USER_REFERRAL_TOKEN, RANDOM_USER_BONUS_ENABLED, USER_REFERRAL_BONUS_ENABLED, USER_REFERRAL_BONUS} = config;
const serverAccountId = SERVER_ACCOUNT.userId;
const rewardUser = async (userId) => {
  const randomBonus = _.random(1, 10);
  logger.info(`Rewarding user with ${randomBonus} tokens`);
  const user = await userService.getUserById(userId);
  const userTokenAccount = await accountService.getCurrencyAccount(userId, USER_REFERRAL_TOKEN);
  if(userTokenAccount.value > 0) {
    logger.info(`Multiple webhooks from SUMSUB for ${userId}. rejecting rewards`);
    return;
  }
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      try {
        if (user.referredby) {
          const referralOptions = {remarks: `Referral bonus for ${user.email} registration`};
          const refferedUser = await userService.getUserByCustomerId(user.referredby);
          if (USER_REFERRAL_BONUS_ENABLED && refferedUser) {
            await accountService.debitBalance(serverAccountId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: userId}));
            await accountService.creditBalance(refferedUser.userId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, referralOptions, {beneficiary: serverAccountId}));
          }
        }
        if (RANDOM_USER_BONUS_ENABLED) {
          const userOptions = {remarks: 'Signup Bonus'};
          await accountService.debitBalance(serverAccountId, USER_REFERRAL_TOKEN, USER_REFERRAL_BONUS, t, _.assign({}, userOptions, {beneficiary: userId}));
          await accountService.creditBalance(userId, USER_REFERRAL_TOKEN, randomBonus, t, _.assign({}, userOptions, {beneficiary: serverAccountId}));
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
const startKYCWorker = async () => {
  await amqp.bindQueue(exchangeName, queueName, routingKey);
  amqp.startConsumer(queueName, async ({content}) => {
    const stringifiedBuffer = content.toString();
    const statusResp = JSON.parse(stringifiedBuffer);
    logger.info('KYC response', statusResp);
    sendAdminNotification(MessageTypes.USER_KYC_UPDATE, statusResp);
    if(statusResp.type === 'INSPECTION_REVIEW_COMPLETED') {
      logger.info('KYC verification using M1');
      const userId = statusResp.externalUserId;
      if (statusResp.review && statusResp.review.reviewAnswer === 'GREEN') {
        await adminService.verifyUserKYC(userId, verificationStatus.APPROVED);
        await rewardUser(userId);
      } else {
        await adminService.verifyUserKYC(userId, verificationStatus.REJECTED, statusResp.review.moderationComment);
      }
    } else if (statusResp.reviewStatus === 'completed' || statusResp.reviewStatus === 'completedSent' || statusResp.reviewStatus === 'completedSentFailure') {
      logger.info('KYC verification using M2');
      const userId = statusResp.externalUserId;
      if (statusResp.reviewResult && statusResp.reviewResult.reviewAnswer === 'GREEN') {
        await adminService.verifyUserKYC(userId, verificationStatus.APPROVED);
        await rewardUser(userId);
      } else {
        await adminService.verifyUserKYC(userId, verificationStatus.REJECTED, statusResp.reviewResult.moderationComment);
      }
    }
  });
};
module.exports = startKYCWorker;
