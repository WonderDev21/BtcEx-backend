const logger = require('winston');
const _ = require('lodash');
const accountService = require('../services/account.service');
const transactionService = require('../services/transaction.service');
const jobService = require('../services/job.service');
const channel = require('../setup/channel.js');
const {channelNames} = require('../constants/channelConstants');
const {allowedTypes, transactionStatus} = require('../constants/tradeConstants');
const globalQueue = channel.getChannel(channelNames.TRADE);
const {MessageTypes} = require('../constants/slackConstants.js');
const sendAdminNotification = require('../deployments/postMessage.js');

exports.depositCoinsByUser = async(req, res) => { // will be called from job server
  logger.info('New coin deposited ', req.body);
  try {
    const {currency, amount, address, info, tag} = req.body;
    sendAdminNotification(MessageTypes.COIN_DEPOSIT_INIT, _.pick(req.body, ['amount', 'currency', 'userId']));
    const account = await accountService.getUserIdByAddress(currency, address, tag); // address = tag for XRP
    if (account) {
      const updatedAccount = await jobService.depositCoinsByUser(req.body);
      sendAdminNotification(MessageTypes.COIN_DEPOSIT_COMPLETE, {currency: updatedAccount.currency, amount: updatedAccount.value, userId: updatedAccount.userId});
      logger.info('Deposit Complete', updatedAccount);
      res.status(200).send({message: 'Success'});
    } else {
      logger.info('Given Address not found', JSON.stringify(req.body));
      sendAdminNotification(MessageTypes.COIN_DEPOSIT_FAILED, _.pick(req.body, ['amount', 'currency', 'userId']));
      res.status(400).send({message: 'Deposit Failed', error: `${address} not found`});
    }
  } catch (err) {
    sendAdminNotification(MessageTypes.COIN_DEPOSIT_FAILED, JSON.stringify(req.body));
    res.status(400).send({message: 'Deposit Failed', error: err || 'Some error occured'});
  }
};
exports.depositINRByUser = async (req, res) => { // will be called from job server
  logger.info('New INR deposit', req.body);
  try {
    sendAdminNotification(MessageTypes.INR_DEPOSIT_INIT, _.pick(req.body, ['amount', 'currency', 'userId']));
    const txn = await jobService.depositINRByUser(req.body);
    sendAdminNotification(MessageTypes.INR_DEPOSIT_COMPLETE, {currency: txn.currency, amount: txn.amount, userId: txn.customerId});
    res.status(200).send({success: true, message: 'Deposit Complete', txn: txn});
  } catch (err) {
    sendAdminNotification(MessageTypes.INR_DEPOSIT_FAILED, JSON.stringify(req.body));
    res.status(400).send({message: 'Deposit Failed', error: err || 'Some error occured'});
  }
};

exports.withdrawCoinsByUser = async (req, res) => { // will be posted to job server
  const transactionId = req.params.transactionId;
  logger.info('New Coin withdrawal', transactionId);
  try {
    const txn = await transactionService.getTransactionById(transactionId);
    if (txn.status !== transactionStatus.COMPLETE) {
      // const data = {to: {address: txn.address, tag: tx.tag}, amountToSend: txn.amount, transactionId};
      // sendAdminNotification(MessageTypes.COIN_DEPOSIT_INIT, _.pick(req.body, ['amount', 'currency', 'userId']));
      if (!_.get(txn, 'transactionInfo.jobRef', '')) {
        const account = await jobService.withdrawCoinsByUser(txn);
        return res.status(200).send(account);
      }
      res.status(400).send({message: 'Txn Pending..', tid: _.get(txn, 'transactionInfo.jobRef', '')});
      // sendAdminNotification(MessageTypes.COIN_WITHDRAWAL_COMPLETE, {currency: account.currency, amount: account.value, userId: account.userId});
    } else {
      res.status(400).send({message: 'Txn Already completed'});
    }
  } catch(err) {
    sendAdminNotification(MessageTypes.COIN_WITHDRAWAL_FAILED, JSON.stringify(req.body));
    res.status(400).send({message: 'Withdrawal Failed', error: err || 'Some error occured'});
  }
};
exports.withdrawINRByUser = async (req, res) => { // will be posted to job server
  const transactionId = req.params.transactionId;
  logger.info('New INR withdrawal', transactionId);
  try {
    const txn = await transactionService.getTransactionById(transactionId);
    if (txn.status !== transactionStatus.COMPLETE) {
      // sendAdminNotification(MessageTypes.INR_WITHDRAWAL_INIT, _.pick(req.body, ['amount', 'currency', 'userId']));
      if (!_.get(txn, 'transactionInfo.jobRef', '')) {
        const account = await jobService.withdrawINRByUser(txn);
        return res.status(200).send(account);
      }
      return res.status(400).send({message: 'Txn Pending..', tid: _.get(txn, 'transactionInfo.jobRef', '')});
      // sendAdminNotification(MessageTypes.INR_WITHDRAWAL_COMPLETE, {currency: account.currency, amount: account.value, userId: account.userId});
    }
    return res.status(400).send({message: 'Txn Already completed'});
  } catch(err) {
    sendAdminNotification(MessageTypes.INR_WITHDRAWAL_FAILED, JSON.stringify(req.body));
    res.status(400).send({message: 'Withdrawal Failed', error: err || 'Some error occured'});
  }
};
exports.updateWithdrawalStatus = async (req, res) => {
  logger.info('Withdrawal status update', req.body);
  try {
    const {transactionId, status, info = {}} = req.body;
    const txn = await jobService.updateTxnStatus(transactionId, status, info);
    res.status(200).send({message: 'Success'});
  } catch(err) {
    sendAdminNotification(MessageTypes.SERVER_BUG, {source: 'job controller', body: JSON.stringify(req.body)} );
    res.status(400).send({message: 'Withdrawal status update failed', error: err || 'Some error occured'});
  }
};
