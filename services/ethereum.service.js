const keythereum = require('keythereum');
const _ = require('lodash');
const {web3} = require('../setup/web3');
const Tx = require('ethereumjs-tx');
const logger = require('winston');
const axios = require('axios');
const ethers = require('ethers');
const BigNumber = require('bignumber.js');
const randomNatural = require('random-natural');

const bxcABI = require('../abis/bxc.json');
const usdtABI = require('../abis/usdt.json');
const config = require('../config/');
const {rippleApi} = require('../setup/ripple');
const Transaction = require('../models').models.Transaction;

const bxcAddress = '0x1bbe0d2d0a284ef9118ee69d356fcdd5948bacf4';
const usdtAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';

const USDT_FEE = 5;
const BXC_FEE = 1;

const MIN_FEE = 0.000000005;// 5000000000; // in wei, = 5Gwei
let lastGasPrice = '25000000000'; // 25 Gwei
const lastNonceMap = {};

const getFees = async () => {
  const url = 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YP2H41457JJKWB98HCJJFNV7ZJHE7YDUHR';
  return axios.get(url)
  .then(resp => {
    const safe = _.get(resp,'data.result.SafeGasPrice', 20);
    const max = _.get(resp,'data.result.ProposeGasPrice', 50);
    const avg = Math.floor((+safe + +max) / 2);
    // const wii = web3.fromWei(avg, 'gwei');
    lastGasPrice = new BigNumber(avg).times(new BigNumber('1000000000')).toString();
    return lastGasPrice;
  })
  .catch(() => {
    return lastGasPrice;
  });
};
const bxcToWei = (value) => {
  var i = new BigNumber(value);
  return i.times(new BigNumber('1000000000000000000')).toString();
};
const usdtToWei = (value) => {
  var i = new BigNumber(value);
  return i.times(new BigNumber('1000000')).toString();
};

exports.createEtherWallet = (userId) => {
  const params = {keyBytes: 32, ivBytes: 16};
  const dk = keythereum.create(params);

  const options = {
    kdf: 'pbkdf2',
    cipher: 'aes-128-ctr',
    kdfparams: {
      c: 262144,
      dklen: 32,
      prf: 'hmac-sha256'
    }
  };
  const keyObject = keythereum.dump(userId, dk.privateKey, dk.salt, dk.iv, options);
  logger.info('New Key Object created for User: ', userId);
  return keyObject;
};

exports.getPrivateKey = (password, keyObject) => {
  return keythereum.recover(password, keyObject);
};
const getNonce = (address) => {
  const URL = 'https://api.etherscan.io';
  return axios.get(`${URL}/api?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=YP2H41457JJKWB98HCJJFNV7ZJHE7YDUHR`);
};
exports.getEthRawTransaction2 = (ethAccount, receiver, value) => {
  let balance = web3.toWei(value, 'ether');
  balance = parseInt(balance).toString(16);
  const userPrivateKey = keythereum.recover(ethAccount.userId, ethAccount.keyObject);
  const privateKey = new Buffer(userPrivateKey, 'hex');
  const rawTx = {
    to: receiver,
    value: `0x${balance}`,
  };
  const tx = new Tx(rawTx);
  tx.sign(privateKey);
  const serializedTx = tx.serialize();
  return serializedTx.toString('hex');
};

exports.getEthRawTransaction = async (ethAccount, receiver, value, fee = 0) => {
  const userPrivateKey = keythereum.recover(ethAccount.userId, ethAccount.keyObject);
  const privateKey = '0x'+userPrivateKey.toString('hex');
  let wallet = new ethers.Wallet(privateKey);
  const withdrawalAmount = fee > MIN_FEE ? (Number(value) - fee) : (Number(value) - MIN_FEE);
  let nonce = 0;
  let gasPrice = lastGasPrice;
  try {
    const resp = await getNonce('0x' + ethAccount.address);
    nonce = Number(resp.data.result);
    lastNonceMap[ethAccount.address] = nonce + 1;
    gasPrice = await getFees();
  } catch(err) {
    logger.error('Error getting nonce', err);
    nonce = lastNonceMap[ethAccount.address] || 0;
  }
  const rawTx = {
    nonce: nonce,
    to: receiver,
    gasLimit: 21001,
    gasPrice: Number(gasPrice), // gasPrice in wei, 10Gwei
    value: ethers.utils.parseEther(`${withdrawalAmount}`)
  };
  const signedTransaction = await wallet.sign(rawTx);
  return signedTransaction;
  // const tx = new Tx(rawTx);
  // tx.sign(privateKey);
  // const serializedTx = tx.serialize();
  // return serializedTx.toString('hex');
};

exports.getUSDTRawTransaction = async (ethAccount, receiver, value, fee = 0) => {
  const usdtContract = web3.eth.contract(usdtABI).at(usdtAddress);
  // const usdtContract = new web3.eth.Contract(usdtABI, usdtAddress, {from: ethAccount.address});
  const userPrivateKey = keythereum.recover(ethAccount.userId, ethAccount.keyObject);
  const privateKey = '0x'+userPrivateKey.toString('hex');
  const wallet = new ethers.Wallet(privateKey);

  const withdrawalAmount = fee > USDT_FEE ? (Number(value) - fee) : (Number(value) - USDT_FEE);
  const withdrawalAmountWei = usdtToWei(withdrawalAmount);
  const sourceAddress = '0x' + ethAccount.address;
  let nonce = 0;
  let gasPrice = lastGasPrice;
  try {
    const resp = await getNonce(sourceAddress);
    nonce = Number(resp.data.result);
    lastNonceMap[ethAccount.address] = nonce + 1;
    gasPrice = await getFees();
  } catch(err) {
    logger.error('Error getting nonce', err);
    nonce = lastNonceMap[ethAccount.address] || 0;
  }
  const rawTx = {
    nonce: nonce,
    to: usdtAddress,
    gasLimit: 84000,
    gasPrice: Number(gasPrice), // gasPrice in wei, 10Gwei
    // data: usdtContract.methods.transfer(receiver, withdrawalAmount).encodeABI(),
    data: usdtContract.transfer.getData(receiver, withdrawalAmountWei, {from: sourceAddress}),
    value: '0x0'
  };
  const signedTransaction = await wallet.sign(rawTx);
  return signedTransaction;
};

exports.getBXCRawTransaction = async (ethAccount, receiver, value, fee = 0) => {
  const bxcContract = web3.eth.contract(bxcABI).at(bxcAddress);
  // const bxcContract = new web3.eth.Contract(bxcABI, bxcAddress, {from: myAddress});
  const userPrivateKey = keythereum.recover(ethAccount.userId, ethAccount.keyObject);
  const privateKey = '0x'+userPrivateKey.toString('hex');
  const wallet = new ethers.Wallet(privateKey);

  const withdrawalAmount = fee > BXC_FEE ? (Number(value) - fee) : (Number(value) - BXC_FEE);
  let withdrawalAmountWei = bxcToWei(withdrawalAmount);
  const sourceAddress = '0x' + ethAccount.address;
  let nonce = 0;
  let gasPrice = lastGasPrice;
  try {
    const resp = await getNonce(sourceAddress);
    nonce = Number(resp.data.result);
    lastNonceMap[ethAccount.address] = nonce + 1;
    gasPrice = await getFees();
  } catch(err) {
    logger.error('Error getting nonce', err);
    nonce = lastNonceMap[ethAccount.address] || 0;
  }
  const rawTx = {
    nonce: nonce,
    to: bxcAddress,
    gasLimit: 50000,
    gasPrice: Number(gasPrice), // gasPrice in wei, 10Gwei
    // data: bxcContract.methods.transfer(receiver, withdrawalAmount).encodeABI(),
    data: bxcContract.transfer.getData(receiver, withdrawalAmountWei, {from: sourceAddress}),
    value: '0x0'
  };
  const signedTransaction = await wallet.sign(rawTx);
  return signedTransaction;
};

exports.transferEth = (sender, reciver, userPrivateKey, value) => {
  return new Promise((resolve, reject) => {

    logger.log(`Sender ${sender} Balance: ${web3.eth.getBalance(sender)}`);
    logger.log(`Receiver ${receiver} Balance: ${web3.eth.getBalance(receiver)}`);

    let balance = web3.toWei(value, 'ether');
    balance = parseInt(balance).toString(16);
    try {
      const privateKey = new Buffer(userPrivateKey, 'hex');
      const rawTx = {
        to: reciver,
        value: `0x${balance}`,
      };
      const tx = new Tx(rawTx);
      tx.sign(privateKey);
      const serializedTx = tx.serialize();

      web3.eth.sendRawTransaction(serializedTx.toString('hex'), function (err, res){
        if(err){
          logger.log(`Error ${err}`);
          logger.log(`Transaction : ${web3.eth.getBlock('latest')}`);
          reject(err);
        }
        logger.log(`Sender ${sender} New Balance: ${web3.eth.getBalance(sender)}`);
        logger.log(`Receiver ${receiver} New Balance: ${web3.eth.getBalance(receiver)}`);
        logger.log(`Transaction Object:  ${web3.eth.getTransaction(res)}`);
        logger.log(`Transaction Block: ${web3.eth.getBlock('latest')}`);
        resolve(res);
      });
    } catch(error) {
      reject(error);
    }
  });
};

// eslint-disable-next-line max-statements
exports.getRippleRawTransaction = async (sender, receiver, value, xrpFee = 0, tag, transactionId) => {
  try {
      tag = tag === '' || tag === null ? randomNatural({min: 100000000, max: 999999999}) : +tag;
      const {address: fromAddress} = sender;

      const withdrawalAmount = value - xrpFee;
      // console.log(sender, receiver, value, fee, tag, transactionId);

      const senderInfo = await rippleApi.getAccountInfo(fromAddress);
      // const receiverInfo = await rippleApi.getAccountInfo(receiver);

      // console.log(`SENDER INFO ${JSON.stringify(senderInfo)}`);
      // console.log(`RECEIVER INFO ${JSON.stringify(receiverInfo)}`);

      const transaction = {
          'TransactionType': 'Payment',
          'Account': fromAddress,
          'Fee': '12',
          'Destination': receiver,
          'DestinationTag': tag,
          'Amount': new BigNumber(withdrawalAmount).times(new BigNumber('1000000')).toString(),
          // 'LastLedgerSequence': closedLedger + ledgerAwait, // change those value
          'Sequence': senderInfo.sequence
      };

      const txJSON = JSON.stringify(transaction);
      const secret = config.RIPPLE_SECRET_KEY;

      const signed_tx = rippleApi.sign(txJSON, secret);

      const tx_data = await rippleApi.submit(signed_tx.signedTransaction);
      logger.info('XRP WITHDRAWAL', tx_data, tx_data.tx_json.hash);

      await Transaction.update({
          tag: tag,
          gatewayTransactionId: tx_data.tx_json.hash,
      }, {
          where: {transactionId: transactionId},
          returning: true
      });
      return tx_data;
  } catch (err) {
      logger.error('XRP WITHDRAWAL ERROR', err);
  }
};
