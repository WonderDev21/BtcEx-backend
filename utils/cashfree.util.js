const logger = require('winston');
const Transaction = require('../models').models.Transaction;
const Account = require('../models').models.Account;

const {newTransaction, updateUserTransaction} = require('../services/transaction.service');

const {objectToJSON} = require('../utils/jsonUtils');
const {allowedTypes, transactionStatus} = require('../constants/tradeConstants');
const {DEPOSIT_FEE} = require('../config');

/**
 * Methods for Cashfree Payment Gateway
 */
exports.validateBody = (requiredData, reqBody) => {
  for (const key of requiredData) {
    if (!reqBody[key]) {
      return {message: `${key} is missing.`};
    }
  }
  return {};
};

const amountCollectWebhook = async (postData) => {
  const {vAccountId, utr, amount} = postData;
  const userAccount = objectToJSON(await Account.find({where: {currency: 'INR', address: vAccountId}}));
  const userId = userAccount.userId;
  let txn = await Transaction.find({where: {gatewayTransactionId: utr}});
  if(!txn) {
    txn = await newTransaction({
      type: allowedTypes.ADD_TO_PLATFORM,
      currency: 'INR',
      address: vAccountId,
      fee: DEPOSIT_FEE.INR,
      amount: Number(amount - DEPOSIT_FEE.INR),
      status: transactionStatus.PENDING,
      userId: userId,
      customerId: userId,
      gatewayTransactionId: utr,
    });
  } else {
    txn = objectToJSON(txn);
  }
  await updateUserTransaction({
    transactionInfo: postData,
    status: transactionStatus.COMPLETE,
    refNo: txn.refNo,
    transactionId: txn.transactionId,
    customerId: txn.customerId
  });
  return {message: 'Amount collected successfully.'};
};

const transferRejectWebhook = async (postData) => {
  const {transferId} = postData;
  const txn = objectToJSON(await Transaction.find({where: {refNo: transferId}}));
  await updateUserTransaction({
    transactionInfo: txn.transactionInfo ? Object.assign(postData, txn.transactionInfo) : postData,
    status: transactionStatus.DECLINED,
    transactionId: txn.transactionId,
    customerId: txn.customerId
  });
  return {message: postData.reason || 'Transfer is rejected.'};
};

exports.handleAutoCollectEvents = async (postData) => {
  const {event} = postData;
  let resp;
  switch (event) {
    case 'AMOUNT_COLLECTED':
      resp = await amountCollectWebhook(postData);
      break;
    case 'TRANSFER_REJECTED':
      resp = await transferRejectWebhook(postData);
      break;
    case 'AMOUNT_SETTLED':
      resp = {message: 'Amount settled webhook is not implemented!'};
      break;
    default:
      resp = {message: 'Unkown event!!'};
      break;
  }
  return resp;
};

const transferSuccessWebhook = async (postData) => {
  const {transferId} = postData;
  const txn = objectToJSON(await Transaction.find({where: {refNo: transferId}}));
  await Transaction.update({gatewayTransactionId: postData.utr}, {where: {transactionId: txn.transactionId, customerId: txn.customerId}});
  await updateUserTransaction({
    transactionInfo: txn.transactionInfo ? Object.assign(postData, txn.transactionInfo) : postData,
    status: transactionStatus.COMPLETE,
    transactionId: txn.transactionId,
    customerId: txn.customerId
  });
  return {message: 'Transfer is Successful.'};
};

const transferReversedWebhook = async (postData) => {
  const {transferId} = postData;
  const txn = objectToJSON(await Transaction.find({where: {refNo: transferId}}));
  await updateUserTransaction({
    transactionInfo: txn.transactionInfo ? Object.assign(postData, txn.transactionInfo) : postData,
    status: transactionStatus.DECLINED,
    transactionId: txn.transactionId,
    customerId: txn.customerId
  });
  return {message: postData.reason || 'Transfer is reversed.'};
};

exports.handlePayoutEvents = async (postData) => {
  const {event} = postData;
  let resp;
  switch (event) {
    case 'TRANSFER_SUCCESS':
      resp = await transferSuccessWebhook(postData);
      break;
    case 'TRANSFER_FAILED':
      resp = await transferRejectWebhook(postData);
      break;
    case 'TRANSFER_REVERSED':
      resp = await transferReversedWebhook(postData);
      break;
    case 'TRANSFER_REJECTED':
      resp = await transferRejectWebhook(postData);
      break;
    case 'CREDIT_CONFIRMATION':
      resp = {message: 'Credit Confirmation webhook is not implemented!'};
      break;
    case 'TRANSFER_ACKNOWLEDGED':
      resp = {message: 'Transfer acknowledeged webhook is not implemented!'};
      break;
    case 'LOW_BALANCE_ALERT':
      resp = {message: 'Low balance alert webhook is not implemented!'};
      break;
    default:
      resp = {message: 'Unkown event!!' + event};
      break;
  }
  return resp;
};
