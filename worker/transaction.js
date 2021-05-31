const logger = require('winston');
const _ = require('lodash');
const Transaction = require('../models').models.Transaction;
const accountService = require('../services/account.service');
const {objectToJSON} = require('../utils/jsonUtils');
const transactionService = require('../services/transaction.service');
const sendAdminNotification = require('../deployments/postMessage.js');
const {MessageTypes} = require('../constants/slackConstants.js');
const {allowedTypes, transactionStatus} = require('../constants/tradeConstants');
const {getEthRawTransaction, getBXCRawTransaction, getUSDTRawTransaction} = require('../services/ethereum.service');
const {getBtcRawTransaction} = require('../services/bitcoin.service');
const {CURRENCY, SERVER_ACCOUNT} = require('../config');
const Amqp = require('../setup/amqp');
const amqp = new Amqp();

const statusMap = {
  UNCONFIRMED: transactionStatus.PENDING,
  unconfirmed: transactionStatus.PENDING,
  SUCCESS: transactionStatus.COMPLETE,
  success: transactionStatus.COMPLETE,
  confirmed: transactionStatus.COMPLETE,
  CONFIRMED: transactionStatus.COMPLETE,
  FAILED: transactionStatus.DECLINED,
  failed: transactionStatus.DECLINED,
};
const getRawTransaction = (currency, userAccount, address, amount) => {
  // fee is 0 for server withdrawal
  switch(currency) {
    case CURRENCY.BTC:
      return getBtcRawTransaction(userAccount, address, amount, 0);
    case CURRENCY.ETH:
      return getEthRawTransaction(userAccount, address, amount, 0);
    case CURRENCY.USDT:
      return getUSDTRawTransaction(userAccount, address, amount, 0);
    case CURRENCY.BXC:
      return getBXCRawTransaction(userAccount, address, amount, 0);
    default:
      return null;
  }
};

exports.bindAllQueues = async () => {
  await amqp.bindQueue('bxlend-wallet-events', 'bxlend-wallet', '');
  await amqp.bindQueue('bxlend-deposit-events', 'bxlend-deposit', '');
  await amqp.bindQueue('bxlend-withdrawal-events', 'bxlend-withdrawal', '');
  await amqp.bindQueue('bxlend-withdrawal-events', 'bxlend-withdrawal-response', '');
};
const prefixWallets = ['ETH', 'USDT', 'BXC'];
exports.walletPublisher = async (wallets) => {
  try {
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      const data = {
        type: 'ADD_WALLET',
        userId: wallet.userId,
        currency: wallet.currency,
        wallet: {
          address: prefixWallets.indexOf(wallet.currency) === -1 ? wallet.address : '0x'+wallet.address,
          tag: null,
        }
      };
      await amqp.publish('bxlend-wallet-events', 'bxlend-wallet', data);
    }
  } catch (err) {
    console.error(`Error while publishing wallet ${err}`);
  }
};

exports.startDepositConsumer = async () => {
  amqp.startConsumer('bxlend-deposit', async ({content}) => {
    const contentBuffer = content.toString();
    const contentResp = JSON.parse(contentBuffer);
    logger.info('DEPOSIT response', contentResp);
    const data = {
      type: allowedTypes.ADD_TO_PLATFORM,
      currency: contentResp.currency,
      tag: contentResp.wallet.tag,
      address: contentResp.wallet.address,
      amount: Number(contentResp.amount),
      status: transactionStatus.PENDING,
      transactionInfo: contentResp.transactionInfo,
      userId: contentResp.userId,
      customerId: contentResp.userId,
      gatewayTransactionId: contentResp.txnRef,
    };
    let txn = await Transaction.find({
      where: {gatewayTransactionId: contentResp.txnRef}
    });
    if(!txn) {
      txn = await transactionService.newTransaction(data);
    } else {
      txn = objectToJSON(txn);
    }
    if (statusMap[contentResp.status] === transactionStatus.COMPLETE) {
      await transactionService.updateUserTransaction({
        transactionInfo: contentResp.transactionInfo,
        status: transactionStatus.COMPLETE,
        transactionId: txn.transactionId,
        customerId: txn.customerId
      });
      if(SERVER_ACCOUNT.userId === contentResp.userId) {
        return;
      }
      const withdrawServerData = {
        type: allowedTypes.ADD_TO_PLATFORM,
        userId: SERVER_ACCOUNT.userId,
        customerId: SERVER_ACCOUNT.userId,
        amount: data.amount,
        currency: data.currency,
        address: data.address,
        status: transactionStatus.PENDING,
        tag: data.tag
      };
      const serverTxn = await transactionService.newTransaction(withdrawServerData);
      const userAccount = await accountService.getCurrencyAccount(data.userId, data.currency);
      const adminAccount = await accountService.getCurrencyAccount(SERVER_ACCOUNT.userId, data.currency);
      if(userAccount && adminAccount) {
        const adminAddress = prefixWallets.indexOf(data.currency) === -1 ? adminAccount.address : '0x'+adminAccount.address;
        withdrawServerData.rawTransaction = await getRawTransaction(data.currency, userAccount, adminAddress, data.amount);
        withdrawServerData.serverTxnRef = serverTxn.transactionId;
        await exports.withdrawPublisher(withdrawServerData);
      }
    } else {
      logger.info(`Got Transaction Resp \n
        Status - ${contentResp.status},
        txnid - ${contentResp.txnRef},
        userId - ${contentResp.userId}
        currency - ${contentResp.currency}
      `);
    }
  });
};

exports.withdrawPublisher = async (data) => {
  try {
    if(!_.includes(
      [CURRENCY.BTC, CURRENCY.ETH, CURRENCY.USDT, CURRENCY.BXC], data.currency)) {
      return;
    };
    const publishData = {
      type: 'WITHDRAW',
      userId: data.userId,
      currency: data.currency,
      amount: data.amount,
      raw_transaction: data.rawTransaction,
      serverTxnRef: data.serverTxnRef,
      wallet: {
        address: data.address,
        tag: data.tag
      }
    };
    await amqp.publish('bxlend-withdrawal-events', 'bxlend-withdrawal', publishData);
  } catch(err) {
    console.log('Error while publishing', err);
  }
};

exports.startWithdrawConsumer = async () => {
  amqp.startConsumer('bxlend-withdrawal-response', async ({content}) => {
    const contentBuffer = content.toString();
    const contentResp = JSON.parse(contentBuffer);
    logger.info('####### WITHDRAW CONSUMER RESPONSE #######', contentResp);
    if (statusMap[contentResp.status] === transactionStatus.DECLINED) {
      sendAdminNotification(MessageTypes.SERVER_BUG, {
        issue: 'Blockchain Withdrawal failed',
        userId: contentResp.userId,
        serverTxnRef: contentResp.serverTxnRef,
        txn: contentResp,
      });
      // await accountService.creditBalance(contentResp.userId, contentResp.currency, contentResp.amount);
      return;
    }
    if(contentResp.serverTxnRef) {
      logger.info('Updating transaction for user', contentResp);
      const status = statusMap[contentResp.status];
      await Transaction.update({
        status: status,
        transactionInfo: contentResp.transaction,
        gatewayTransactionId: _.get(contentResp, 'transaction.transactionHash', ''),
      }, {
        where: {transactionId: contentResp.serverTxnRef}
      });
    } else {
      logger.info("Didn't find serverTxnRef in", contentResp);
    }
  });
};
