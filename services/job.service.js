const logger = require('winston');
const _ = require('lodash');
const moment = require('moment');
const sequelize = require('../models');
const Sequelize = require('sequelize');
const shortid = require('shortid');
const Transaction = require('../models').models.Transaction;
const accountService = require('../services/account.service');
const transactionService = require('../services/transaction.service');
const jobApi = require('../api/jobapi');
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const {allowedTypes, allowedModes, transactionStatus} = require('../constants/tradeConstants');
const globalQueue = channel.getChannel(channelNames.TRADE);
const {MessageTypes} = require('../constants/slackConstants.js');
const sendAdminNotification = require('../deployments/postMessage.js');
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

exports.depositINRByUser = async (data) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      try {
        const {currency, amount, userId, info, txnRef, time} = data;
        const exists = objectToJSON(await Transaction.find({
          where: {gatewayTransactionId: txnRef}
        }));
        if (exists) {
          logger.error('Transaction already exists');
          t.commit();
          return null;
        }
        const txn = {
          mode: 'FINLY_DEPOSIT',
          currency,
          amount,
          time: moment(time).unix() * 1000,
          type: allowedTypes.ADD_TO_PLATFORM,
          userId: userId, // from
          customerId: userId, // whose account will be debited/credited
          transactionInfo: info ? info : `ADD ${currency}`,
          status: transactionStatus.COMPLETE,
          gatewayTransactionId: txnRef,
          refNo: `Txn-${shortid.generate()}`
        };
        const newTxn = objectToJSON(await Transaction.create(txn, {transaction: t}));
        const options = {remarks: `${currency} Deposit`, refId: newTxn.transactionId, beneficiary: newTxn.customerId};
        const accountInfo = await accountService.creditBalance(newTxn.customerId, newTxn.currency, newTxn.amount, t, options);
        t.commit();
        logger.info(`Adding balance complete for ${userId}, amount ${amount} ${currency}`);
        return newTxn;
      } catch (err) {
        t.rollback();
        logger.error('Adding Balance failed', err, data);
      }
    })
    .catch(err => {
      logger.error('Adding balance failed', err, data);
      console.log(err);
    });
};
exports.depositCoinsByUser = async (data) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      try {
        const {currency, amount, userId, info} = data;
        const txn = {
          mode: 'BLOCKCHAIN_DEPOSIT',
          currency,
          amount,
          time: Date.now(),
          type: allowedTypes.ADD_TO_PLATFORM,
          userId: userId, // from
          customerId: userId, // whose account will be debited/credited
          transactionInfo: info ? info : `ADD ${currency}`,
          status: transactionStatus.COMPLETE,
          refNo: `Txn-${shortid.generate()}`
        };
        const newTxn = objectToJSON(await Transaction.create(txn, {transaction: t}));
        const options = {remarks: `${currency} Deposit`, refId: newTxn.transactionId, beneficiary: newTxn.customerId};
        const accountInfo = await accountService.creditBalance(newTxn.customerId, newTxn.currency, newTxn.amount, t, options);
        t.commit();
        logger.info(`Adding balance complete for ${userId}, amount ${amount} ${currency}`);
        return accountInfo;
      } catch(err) {
        t.rollback();
        logger.error('Adding Balance failed', err, data);
      };
    })
    .catch(err => {
      logger.error('Adding balance failed', err, data);
      console.log(err);
    });
};
exports.withdrawCoinsByUser = async (data) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      const resp = await jobApi.withdrawCoins(data);
      if (resp.success) {
        const jobRef = _.get(resp, 'data._id', '');
        await exports.updateTxnStatus(data.transactionId, data.status, {jobRef});
        t.commit();
        logger.info('Withdrawing Coins API success', resp);
      } else {
        t.rollback();
        logger.error('Withdrawing Coins API failed', resp);
      }
      return resp;
    })
    .catch(err => {
      t.rollback();
      logger.error('Withdrawing Coins failed', err, data);
      return null;
    });
};
exports.withdrawINRByUser = async (data) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
    .then(async (t) => {
      const resp = await jobApi.withdrawINR(data);
      const jobRef = _.get(resp, 'data._id', '');
      await exports.updateTxnStatus(data.transactionId, data.status, {jobRef});
      if (resp.success) {
        t.commit();
        logger.info('Withdrawing INR API success', data);
      } else {
        t.rollback();
        logger.error('Withdrawing INR API failed', data);
      }
      return resp;
    })
    .catch(err => {
      t.rollback();
      logger.error('Withdrawing INR failed', err, data);
      return null;
    });
};
exports.updateTxnStatus = async (transactionId, status, info = {}) => {
  const txn = await Transaction.findOne({
    where: {transactionId: transactionId},
  });
  const txnJSON = objectToJSON(txn);
  const {transactionInfo} = txnJSON;
  const newTxnInfo = _.assign({}, transactionInfo, info);
  const updated = await txn.updateAttributes({transactionInfo: newTxnInfo, status: status});
  return updated;
};
