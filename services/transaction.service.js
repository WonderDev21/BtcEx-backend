/* eslint-disable max-statements */
const request = require('request');
const logger = require('winston');
const moment = require('moment');
const numeral = require('numeral');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const Sequelize = require('sequelize');

const sequelize = require('../models');
const Transaction = require('../models').models.Transaction;
const User = require('../models').models.User;
const Document = require('../models').models.Document;

const accountService = require('./account.service');
const userService = require('./user.service');
const emailService = require('./email.service');
const redisService = require('./redis.service');
const {getBtcRawTransaction} = require('./bitcoin.service');
const smsService = require('./sms.service');
const {getEthRawTransaction, getBXCRawTransaction, getUSDTRawTransaction, getRippleRawTransaction} = require('./ethereum.service');

const sendAdminNotification = require('../deployments/postMessage.js');
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');
const otpUtils = require('../utils/otpUtils');
const jwtUtils = require('../utils/jwt.utils');
const {getMaskedEmail, getMaskedPhone} = require('../utils/stringUtils');
const {selfWithdrawal, transferAmount} = require('../gateways/cashfree/payouts');

const {allowedTypes, transactionStatus} = require('../constants/tradeConstants');
const {MessageTypes} = require('../constants/slackConstants.js');
const {gatewayCharges} = require('../constants/serverConstants');
const redisConstants = require('../constants/redisConstants');
const {verificationEmailOptions} = require('../constants/serverConstants');
// const {currencyTypes} = require('../constants/orderConstants');
const {
  feeStructure,
  baseCurrency,
  CURRENCY,
  SERVER_ACCOUNT,
  WITHDRAWAL_FEE,
  PAYMENT_GATEWAY_KEY_ID,
  PAYMENT_GATEWAY_KEY_SECRET,
  APP_URL,
  APP_NAME,
  SUPPORT_EMAIL
} = require('../config');

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

exports.newTransaction = async (data) => {
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async t => {
    let txn = null;
    try {
      data.status = transactionStatus.PENDING;
      // data.refNo = 'Txn-'+shortid.generate();
      if(data.type === allowedTypes.WITHDRAW_FROM_PLATFORM) {
        const {isEligible} = await accountService.checkBalance(data.customerId, data.currency, data.amount);
        if(!isEligible) {
          await t.rollback();
          logger.info('User not eligible for transaction');
          return null;
        }
      }
      txn = objectToJSON(await Transaction.create(data, {transaction: t}));
      const userObj = await userService.getUserById(txn.customerId);
      if (userObj) {
        if (txn.type === allowedTypes.ADD_TO_PLATFORM) {
          sendAdminNotification(MessageTypes.USER_DEPOSIT_REQUEST, {amount: `${txn.amount} ${txn.currency}`, name: userObj.fullName, email: userObj.email});
        } else if (txn.type === allowedTypes.WITHDRAW_FROM_PLATFORM) {
          const options = {remarks: `${txn.currency} withdrawal`, refId: txn.transactionId, beneficiary: userObj.userId};
          await accountService.debitBalance(txn.customerId, txn.currency, txn.amount, t, options);
          sendAdminNotification(MessageTypes.USER_WITHDRAW_REQUEST, {amount: `${txn.amount} ${txn.currency}`, name: userObj.fullName, email: userObj.email});
        } else {
          sendAdminNotification(MessageTypes.SERVER_BUG, {source: 'transaction service'});
        }
        logger.info('Transaction created successfully');
        await t.commit();
        sendTxnEmail(userObj, txn); // eslint-disable-line no-use-before-define
        return txn;
      } else {
        await t.commit();
        sendAdminNotification(MessageTypes.SERVER_BUG, {message: 'Txn created but user not found', id: txn.transactionId, source: 'transaction service'});
        return txn;
      }
    } catch(error) {
      t.rollback();
      logger.info(`Transaction creation failed for data ${JSON.stringify(data)} & error: ${error}`);
      return null;
    }
  })
  .catch(err => {
    logger.info(`Error while creating new Transaction for data ${JSON.stringify(data)} & error: ${err}`);
    return null;
  });
};

exports.updateUserTransaction = async (data) => { // only admin access
  return sequelize.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE})
  .then(async (t) => {
    try {
      const updateObj = {
          status: data.status,
          transactionInfo: data.transactionInfo
      };
      if(data.refNo) {
        updateObj.refNo = data.refNo;
      }
      const currentTransaction = await Transaction.update(updateObj, {
        where: {transactionId: data.transactionId, customerId: data.customerId},
        transaction: t,
        returning: true, plain: true
      });
      const updatedTransaction = objectToJSON(currentTransaction[1]);
      if (updatedTransaction.status === transactionStatus.COMPLETE) {
        if (updatedTransaction.type === allowedTypes.ADD_TO_PLATFORM) {
          const options = {remarks: `${updatedTransaction.currency} Deposit`, refId: updatedTransaction.transactionId, beneficiary: updatedTransaction.customerId};
          await accountService.creditBalance(updatedTransaction.customerId, updatedTransaction.currency, updatedTransaction.amount, t, options);
          logger.info(`${allowedTypes.ADD_TO_PLATFORM} Transaction completed for ${updatedTransaction.customerId}`);
        } else if(updatedTransaction.type === allowedTypes.WITHDRAW_FROM_PLATFORM) {
          // already debited while creating txn.
          logger.info(`${allowedTypes.WITHDRAW_FROM_PLATFORM} Transaction completed for ${updatedTransaction.customerId}`);
        }
        logger.info('Transaction updated successfully');
        // Sending email
        const userObj = await userService.getUserById(updatedTransaction.customerId);
        // const prevTransaction = await Transaction.find({ where: { transactionId: data.transactionId }});
        await t.commit();
        sendTxnEmail(userObj, updatedTransaction); // eslint-disable-line no-use-before-define
        //
      } else {
        logger.info(`Transaction status updating to - ${updatedTransaction.status}`);
        await t.commit();
      }
      logger.info('Transaction updated successfully');
      return updatedTransaction;
    } catch(error) {
      t.rollback();
      logger.info('PRIORITY-0 Transaction update failed for data', data, error);
      return error;
    }
  }).catch((error2) => {
    // t.rollback();
    logger.error('PRIORITY-0 Error in Transaction update: ', error2);
    return error2;
  });
};
const sendTxnEmail = async (userObj, newTxn, info = '') => {
  /* Send slack notification */
  if (newTxn.type === allowedTypes.ADD_TO_PLATFORM) {
    sendAdminNotification(MessageTypes.USER_DEPOSITED_AMOUNT, {amount: `${newTxn.amount} ${newTxn.currency}`, name: userObj.fullName, email: userObj.email});
  } else if(newTxn.type === allowedTypes.WITHDRAW_FROM_PLATFORM) {
    sendAdminNotification(MessageTypes.USER_WITHDRAW_AMOUNT, {amount: `${newTxn.amount} ${newTxn.currency}`, name: userObj.fullName, email: userObj.email});
  } else {
    sendAdminNotification(MessageTypes.SERVER_BUG, {source: 'transaction service completed'});
  }
  let compiled, output, emailObject, emailTemplate;
  if (newTxn.status === transactionStatus.PENDING && newTxn.type === allowedTypes.WITHDRAW_FROM_PLATFORM) {
    emailTemplate = fs.readFileSync(path.join(process.cwd(), 'mailer/output/balanceWithdrawRequest.html'));
    compiled = _.template(emailTemplate);
    output = compiled({
      BASE_CURRENCY: baseCurrency,
      APP_URL,
      APP_NAME,
      SUPPORT_EMAIL,
      fullName: userObj.fullName,
      TRANSACTION_AMOUNT: `${newTxn.amount} ${newTxn.currency}`,
    });
    emailObject = {
      from: verificationEmailOptions.senderEmail,
      to: userObj.email,
      subject: 'Withdrawal Request',
      html: output,
    };
    return emailService.sendEmail(emailObject);
  } else if(newTxn.status === transactionStatus.COMPLETE &&
    (newTxn.type === allowedTypes.ADD_TO_PLATFORM || newTxn.type === allowedTypes.WITHDRAW_FROM_PLATFORM)) {
    const emailMap = {
      [allowedTypes.ADD_TO_PLATFORM]: {file: 'mailer/output/balanceAdded.html', subject: 'Amount Credited'},
      [allowedTypes.WITHDRAW_FROM_PLATFORM]: {file: 'mailer/output/balanceWithdrawn.html', subject: 'Amount Withdrawn'},
    };
    emailTemplate = fs.readFileSync(path.join(process.cwd(), `${emailMap[newTxn.type].file}`));
    compiled = _.template(emailTemplate);
    const userWithAccount = await userService.getUserWithAccounts(userObj.userId);
    let balanceHtml = '';
    _.forEach((userWithAccount.accounts || []), ac => {
      balanceHtml += `<strong>${ac.currency}: ${Number(ac && ac.value).toFixed(2)}</strong>`;
      balanceHtml += '<br>';
    });
    const txnamount = newTxn.currency === baseCurrency ? Number(newTxn.amount).toFixed(2) : newTxn.amount;
    output = compiled({
      APP_URL,
      APP_NAME,
      SUPPORT_EMAIL,
      fullName: userObj.fullName,
      TRANSACTION_AMOUNT: `${txnamount} ${newTxn.currency}`,
      TRANSACTION_INFO: info || '',
      BALANCES: balanceHtml,
    });
    emailObject = {
      from: verificationEmailOptions.senderEmail,
      to: userObj.email,
      subject: emailMap[newTxn.type].subject,
      html: output,
    };
    return emailService.sendEmail(emailObject);
  }
};

exports.getAllTransaction = async () => {
  return arrayToJSON (await Transaction.findAll({
    order: [['updatedAt', 'DESC']],
  }));
};

exports.getTransactionById = async(txid) => {
  return objectToJSON(await Transaction.find({
    where: {transactionId: txid}
  }));
};

exports.getTransactionsByUserId = async (userId) => {
  return arrayToJSON(await Transaction.findAll({
    where: {userId: userId},
    order: [['updatedAt', 'DESC']]
  }));
};

exports.getTransactionsByCustomerId = async (customerId) => {
  return arrayToJSON(await Transaction.findAll({
    where: {customerId: customerId},
    order: [['updatedAt', 'DESC']]
  }));
};

exports.getUserTransactions = async (userId, offset, type) => {
  const where = {
    customerId: userId
  };
  if (type) {
    where.type = type;
  }
  const txns = await Transaction.findAll({
    attributes: ['amount', 'refNo', 'createdAt', 'type', 'status', 'mode', 'currency', 'transactionId', 'transactionInfo'],
    where: where,
    order: [['createdAt', 'DESC']],
    offset: offset,
    limit: 10,
  });
  return arrayToJSON(txns);
};

exports.retriveRazorpayPayment = (paymentId) => {
  const url = `https://${PAYMENT_GATEWAY_KEY_ID}:${PAYMENT_GATEWAY_KEY_SECRET}@api.razorpay.com/v1/payments/${paymentId}`;
  return new Promise((resolve, reject) => {
    /* Don't know why axios throwing error that's why using request library */
    request(url, (error, response, body) => {
      if(!error) {
        const json = JSON.parse(body);
        const amount = numeral(_.get(json, 'amount', 0.00)).divide(100).value(); // since 20 INR = 2000 in razorpay terms.
        // TODO deduct gateway cost from amount
        const userAmount = decuctGatewayCharge(amount);
        const txn = {
          mode: json.method,
          status: transactionStatus.COMPLETE,
          currency: _.get(json, 'currency', 'INR'),
          amount: userAmount,
          type: allowedTypes.ADD_TO_PLATFORM,
          userId: _.get(json, 'notes.userId', ''),
          customerId: _.get(json, 'notes.userId', ''),
          gatewayTransactionId: json.id,
          time: moment(_.get(json, 'created_at', undefined)).toISOString(),
          transactionInfo: json
        };
        resolve(txn);
      }
      reject(error);
    });
  });
};
function decuctGatewayCharge(amount) {
  // eslint-disable-next-line no-unused-vars
  const {percent, flat, extra} = gatewayCharges.RAZORPAY;
  const deductedPercentage = numeral(amount).multiply(percent).divide(100).value();
  return numeral(amount).subtract(deductedPercentage).value();
};

exports.getWithdrawalOTP = async (user, currency, amount, mode, address, tag) => {
  const randomOTP = otpUtils.generateRandomOTP();
  try {
    const minWithdrawal = feeStructure[currency].minimum_withdrawal;
    if(+amount < minWithdrawal) {
      return {status: 400, body: {message: `Minimum withdrawal amount is ${minWithdrawal} ${currency}`}};
    }
    const newToken = jwtUtils.signToken({userId: user.userId, amount, currency, mode, address, tag});
    const expireTimeInSeconds = 130; // 130 seconds = 2 mins 10sec;
    const expiryTime = moment().add(2, 'minutes').format('HH:mm:ss');
    const emailObj = {
      to: user.email,
      subject: 'Withdrawal OTP',
      html: `<html>
              <body>
                <h4>Hi ${user.fullName},</h4>
                <p>Your One Time Password (OTP) for withdrawal of ${amount} ${currency} is <b>${randomOTP}</b>. This OTP is valid for next 2 minutes, till <b>${expiryTime} UTC</b></p>
                  <br>
                  <i>If you didn't made this request then someone is trying to access your account. Please report us immediately at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></i>
                <br>
              </body>
            </html>`,
    };
    if (!(user.TFAKey && user.TFAKey.isEnabled)) {
      await redisService.setExpire(`${redisConstants.TXN}-${user.userId}`, randomOTP, expireTimeInSeconds);
      smsService.sendTxnOTP({to: user.phone, otp: randomOTP, info: `for withdrawal of ${amount} ${currency}`, expiryTime: expiryTime});
      emailService.sendEmail(emailObj);
    }
    return {status: 200, body: {message: 'OTP Sent', phone: getMaskedPhone(user.phone), email: getMaskedEmail(user.email), token: newToken}};
  } catch(error) {
    logger.info(`Error while sending login otp to user ${user.userId} ${error}`, error);
    return {status: 400, body: {message: 'Sending OTP failed', error: error}};
  }
};

const getRawTransaction = (currency, adminAccount, address, amount, tag, transactionId) => {
  switch(currency) {
    case CURRENCY.BTC:
      return getBtcRawTransaction(adminAccount, address, amount, WITHDRAWAL_FEE.BTC);
    case CURRENCY.ETH:
      return getEthRawTransaction(adminAccount, address, amount, WITHDRAWAL_FEE.ETH);
    case CURRENCY.USDT:
      return getUSDTRawTransaction(adminAccount, address, amount, WITHDRAWAL_FEE.USDT);
    case CURRENCY.BXC:
      return getBXCRawTransaction(adminAccount, address, amount, WITHDRAWAL_FEE.BXC);
    case CURRENCY.XRP:
      return getRippleRawTransaction(adminAccount, address, amount, WITHDRAWAL_FEE.XRP, tag, transactionId);
    default:
      return null;
  }
};

// eslint-disable-next-line no-unused-vars
const selfWithdrawalTxn = async (data, txn) => {
  const withdarwalResp = await selfWithdrawal(data);
  console.log(withdarwalResp);
  let txnStatus = transactionStatus.DECLINED;
  if (withdarwalResp.statusCode === '200') {
    txnStatus = transactionStatus.COMPLETE;
  } else {
    await accountService.updateUserBalance(txn.customerId, 'INR', data.amount);
  }
  const updateData = {
    transactionInfo: withdarwalResp,
    status: txnStatus,
    transactionId: txn.transactionId,
    customerId: txn.customerId,
    userId: txn.customerId
  };
  const updatedTxn = await exports.updateUserTransaction(updateData);
  return updatedTxn;
};

const amountTransfer = async (data, txn) => {
  const document = objectToJSON(await Document.find({
    attributes: ['bankDetails'],
    where: {userId: txn.customerId},
  }));
  data.beneId = document.bankDetails[0].beneId;
  data.amount = (+data.amount - WITHDRAWAL_FEE.INR) + '';
  logger.info('TRANSFER AMOUNT DATA => ', data);
  const transferResp = await transferAmount(data);
  if (transferResp.subCode === '201') {
    updatedTxn = await Transaction.update({
      gatewayTransactionId: transferResp.data.referenceId,
      address: data.beneId,
      userId: txn.customerId,
      refNo: txn.refNo,
      fee: WITHDRAWAL_FEE.INR,
      transactionInfo: transferResp.data}, {
      where: {transactionId: txn.transactionId},
      returning: true, plain: true
    });
  }
  return transferResp;
};

exports.withdrawByOTP = async (otp, token, TFAEnabled) => {
  const {withdrawPublisher} = require('../worker/transaction.js');
  const {userId, amount, currency, address, tag, mode} = jwtUtils.verifyToken(token);
  try {
      const data = {userId, amount, currency, address, tag};

      const userObj = await User.findById(userId);
      // const userAccount = await accountService.getCurrencyAccount(userId, currency);
      const hotWalletAccount = await accountService.getCurrencyAccount(SERVER_ACCOUNT.userId, currency);
      if (TFAEnabled) {
        const isValid = userObj.compareTFA(otp);
        if (isValid) {
          const txn = {type: allowedTypes.WITHDRAW_FROM_PLATFORM, userId: userId, customerId: userId, amount, currency, address, tag, mode};
          const resp = await exports.newTransaction(txn);
          // eslint-disable-next-line max-depth
          if (!resp) {
            return {status: 400, body: {message: 'Insufficient Balance'}};
          }
          // eslint-disable-next-line max-depth
          if (currency === 'INR') {
            const transferData = {transferId: resp.refNo, amount: amount.toString()};
            await amountTransfer(transferData, resp);
          } else {
            data.serverTxnRef = resp.transactionId;
            data.rawTransaction = await getRawTransaction(currency, hotWalletAccount, address, amount, tag, resp.transactionId);
            await withdrawPublisher(data);
          }
          return {status: 200, body: {userId, message: 'Transaction Successful'}};
        } else {
          logger.info('Incorrect 2FA OTP submitted by user for transactions:', userId);
          return {status: 400, body: {message: 'Incorrect 2FA OTP'}};
        }
      }
      const actualOTP = await redisService.getValue(`${redisConstants.TXN}-${userId}`);
      if (actualOTP === otp) {
        const txn = {type: allowedTypes.WITHDRAW_FROM_PLATFORM, customerId: userId, amount, currency, address, tag};
        const resp = await exports.newTransaction(txn);
        if(!resp) {
          return {status: 400, body: {message: 'Insufficient Balance'}};
        }
        if (currency === 'INR') {
          const transferData = {transferId: resp.refNo, amount: amount.toString()};
          await amountTransfer(transferData, resp);
        } else {
          data.serverTxnRef = resp.transactionId;
          data.rawTransaction = await getRawTransaction(currency, hotWalletAccount, address, amount, tag, resp.transactionId);
          await withdrawPublisher(data);
        }
        return {status: 200, body: {message: 'Transaction Successful'}};
      }
      logger.info('Incorrect OTP submitted by user for transactions:', userId);
      return {status: 400, body: {message: 'Incorrect OTP'}};
    } catch(error) {
      console.error(error);
      logger.info('Incorrect OTP submitted by user for transactions ', userId);
      return {status: 400, body: {message: 'Failed to Verify OTP', error}};
    }
};
