const logger = require('winston');
const _ = require('lodash');
const moment = require('moment');
const numeral = require('numeral');
const crypto = require('crypto');
const randtoken = require('rand-token');
const request = require('request');
const Tx = require('ethereumjs-tx');

const {allowedModes, allowedTypes, transactionStatus} = require('../constants/tradeConstants');
const transactionService = require('../services/transaction.service');
const accountService = require('../services/account.service');
const orderService = require('../services/order.service');
const userService = require('../services/user.service');
const tradeService = require('../services/trade.service');
const {web3} = require('../setup/web3');
const {PAYU_MONEY} = require('../config');

exports.newTransaction = async (req, res) => { // by user
  logger.info('Creating new transaction for user', req.body);
  try {
    const newTransaction = await transactionService.newTransaction(req.body);
    /*
    logger.info('Transaction created', newTransaction);
    if (newTransaction.type === 'ADD_TO_PLATFORM') { // only Admin can do this
       const creditAccountInfo = await accountService.creditBalance(newTransaction.customerId, newTransaction.currency, newTransaction.amount);
    } else if(newTransaction.type === 'WITHDRAW_FROM_PLATFORM') {
      const debitAccountInfo = await accountService.debitBalance(newTransaction.customerId, newTransaction.currency, newTransaction.amount);
    }
    */
    logger.info(`Transaction created for user ${req.body.userId} success`);
    res.status(200).send(newTransaction);
  } catch(error) {
    logger.info(`Transaction for user ${req.body.userId} failed`);
    res.status(400).send(error);
  }
};
exports.getWithdrawalOTP = async (req, res) => {
  const userId = _.get(req, 'user.userId', null);
  logger.info(`Withdrawal request from user ${userId}`);
  try {
    const currency = req.query.currency;
    const amount = req.body.amount;
    const mode = req.body.mode;
    const address = req.body.address || null;
    const tag = req.body.tag || null;
    const user = await userService.getUserById(userId);
    const otpResponse = await transactionService.getWithdrawalOTP(user, currency, amount, mode, address, tag);
    logger.info(`Withdrawal OTP sent to user ${userId}`);
    res.status(otpResponse.status).send(otpResponse.body);
  } catch(error) {
    logger.info(`Withdrawal transaction for user ${req.body} failed`);
    res.status(400).send(error);
  }
};
exports.withdrawByOTP = async (req, res) => {
  const userId = _.get(req, 'params.userId', null);
  logger.info(`Withdrawal OTP request from user ${userId}`);
  try {
    const {otp, token} = req.body;
    const otpResponse = await transactionService.withdrawByOTP(otp, token, req.user.TFAKey && req.user.TFAKey.isEnabled);
    logger.info(`Withdrawal by OTP for transaction success for user ${userId}`);
    res.status(otpResponse.status).send(otpResponse.body);
  } catch(error) {
    logger.info(`OTP for transaction failed for user ${userId} failed`);
    console.error(error);
    res.status(400).send(error);
  }
};
exports.addTransaction = async (req, res) => { // only admin access
  try {
    const newTransaction = await transactionService.newTransaction(req.body);
    logger.info('Transacion Added: ', newTransaction);
    res.status(200).send(newTransaction);
  } catch(error) {
    logger.info(`Transaction for user ${req.body} failed`);
    res.status(400).send(error);
  }
};

exports.updateUserTransaction = async (req, res) => { // only admin access, status update only
  try {
    const updatedTransaction = await transactionService.updateUserTransaction(req.body);
    logger.info('Updating Transaction updated: ', updatedTransaction);
    res.status(200).send(updatedTransaction);
    /*
    let accountInfo = null;
    if(updatedTransaction.status === 'COMPLETE') {
      if(updatedTransaction.type === 'ADD_TO_PLATFORM') {
       accountInfo = await accountService.creditBalance(updatedTransaction.customerId, updatedTransaction.currency, updatedTransaction.amount);
      } else if(updatedTransaction.type === 'WITHDRAW_FROM_PLATFORM') {
       accountInfo = await accountService.debitBalance(updatedTransaction.customerId, updatedTransaction.currency, updatedTransaction.amount);
      }
      logger.info('Credit/debit Transacion completed: ', accountInfo);
      res.status(200).send(updatedTransaction);
    } else {
      res.status(200).send(updatedTransaction);
    }
    */
  } catch(error) {
    logger.info('Transaction failed', req.body);
    res.status(400).send(error);
  }
};

exports.getAllTransaction = async (req, res) => {
  const offset = _.get(request, 'query.offset', 0);
  const userId = _.get(request, 'query.userId', null);
  const transactionId = _.get(request, 'query.transactionId', null);
  const customerId = _.get(request, 'query.customerId', null);
  try {
    let allTransaction = [];
    if (userId) {
      allTransaction = await transactionService.getTransactionsByUserId(userId);
    } else if (transactionId) {
      allTransaction = await transactionService.getTransactionById(transactionId);
    } else if (customerId) {
      allTransaction = await transactionService.getTransactionsByCustomerId(customerId);
    } else {
      allTransaction = await transactionService.getAllTransaction();
    }
    res.status(201).send(allTransaction);
  } catch(error) {
    res.status(400).send(error);
  }
};

exports.getUserTransactions = async (req, res) => {
  const offset = _.get(req, 'query.offset', 0);
  const type = _.get(req, 'query.txnType', null);
  try {
    const userId = req.params.userId;
    const allTransactions = await transactionService.getUserTransactions(userId, offset, type);
    res.status(200).send(allTransactions);
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.transferEth = async (req, res) => {
  console.log('transfer Ether:');
  try {
    const sender = req.body.sender;
    const reciver = req.body.reciver;
    const userPrivateKey = req.body.privateKey;
    const value = req.body.value;
    const hexPrivateKey = new Buffer(userPrivateKey, 'hex');

    const rawTx = {
      nonce: '0x00',
      to: reciver,
      value: value,
    };

    const tx = new Tx(rawTx);
    tx.sign(hexPrivateKey);
    const serializedTx = tx.serialize();

    web3.eth.sendRawTransaction(serializedTx.toString('hex'), (err, res) => {
      if(err) {
        console.log('Error',err);
      }
      console.log('Sucessfullt Transfered Eth: ', res);
    });
    res.status(200).send('Ok');
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.retrivePayment = async (req, res) => {
  const paymentId = _.get(req, 'body.razorpay_payment_id', null);
  logger.info('Payment Processing');
  if (paymentId) {
    try {
      const txn = await transactionService.retriveRazorpayPayment(paymentId);
      logger.info(`Payment successful of userId ${txn.userId} email ${txn.transactionInfo.email}`);
      const createdTxn = await transactionService.newTransaction(txn);
      logger.info(`Transaction created successfully txnxId ${createdTxn.transactionId}`);
      const creditAccountInfo = await accountService.creditBalance(txn.customerId, txn.currency, txn.amount);
      logger.info(`Amount added successfully to customerId ${txn.customerId}`);
      res.status(200).send({message: 'Payment Successful', payment: txn});
    } catch(error) {
      console.log('Some error occured', error);
      logger.info(`PRIORITY-0: SOME ERROR IN TRANSACTION ${JSON.stringify(error)} for paymentId ${paymentId}`);
      res.status(500).send({paymentId: paymentId, message: 'Retrive Payment Failed, Please be patient we are looking into the matter', error: error});
    }
  } else {
    res.status(400).send({message: 'No Payment Found'});
  }
};
exports.hashPayUObjects = (req, res) => {
  /* the test params provided by PayUMoney */
  const {amount, productinfo = '', firstname, email, phone} = req.body;
  const key = 'rjQUPktU';
  const salt = 'e5iIg1jwi8';
  const txnid = randtoken.generate(16);

  // The surl and furl are the success and the failure url's. Change accordingly.
  const surl = _.get(req, 'headers.host' , 'http://localhost:8000') + '/paymentsuccess';
  const furl = _.get(req, 'headers.host' , 'http://localhost:8000') + '/paymentfailure';

  // string hash format
  const str = key + '|' + txnid + '|' + amount + '|' + productinfo + '|' + firstname + '|' + email + '|' +
  '||||||||||' + salt;

  const hash = require('crypto').createHash('sha512').update(str).digest('hex');
  // console.log(hash);

  const formData = {
    'key' : key,
    'txnid' : txnid,
    'amount' : amount,
    'productinfo' : productinfo,
    'firstname' : firstname,
    'email' : email,
    'phone' : String(phone).split('+').join(''),
    'surl' : surl,
    'furl' : furl,
    'hash' : hash,
    'service_provider' : 'payu_paisa'
  };

  // Note - PayUMoney Server only accepts request in form type data.
  // for live key and salt - use 'https://secure.payu.in/_payment'
  request.post('https://test.payu.in/_payment', {form: formData}, function(err, response, body) {
    const location = _.get(response, 'caseless.dict.location', null);
    console.log(body);
    res.status(200).send(location);
  });
};
