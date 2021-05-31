const Account = require('../models').models.Account;
const User = require('../models').models.User;
const etherService = require('./ethereum.service');
const bitcoinService = require('./bitcoin.service');
const rippleService = require('./ripple.service');
const litecoinService = require('./litecoin.service');
const iotaService = require('./iota.service');
const numeral = require('numeral');
const logger = require('winston');
const Promise = require('bluebird');
const _ = require('lodash');
const {SERVER_ACCOUNT, FIAT_CURRENCY, baseCurrency, SUPPORTED_CURRENCY, IEO_CURRENCY} = require('../config');
const {arrayToJSON, objectToJSON, filterAccounts} = require('../utils/jsonUtils');
const orderUtils = require('../utils/order.utils');
const {currencyTypes} = require('../constants/orderConstants');
const {walletPublisher} = require('../worker/transaction');
const supportedCurrencies = Object.keys(SUPPORTED_CURRENCY);
const serverAccountId = SERVER_ACCOUNT.userId;

const Ampq = require('../setup/amqp');
const amqp = new Ampq();

exports.createAccount = async user => {
  const walletArray = [];
  const userId = user.userId;
  const accounts = arrayToJSON(await Account.findAll({where: {userId}})) || [];
  const existingCurrencies = {};
  logger.info('Creating account for user : ' + userId);
  _.forEach(accounts, (ac) => {
    existingCurrencies[ac.currency] = 1;
  });
  logger.info(`No. of accounts of user with userId: ${userId} n: ${Object.keys(existingCurrencies).length}`);
  if (!existingCurrencies.BTC) {
    const btcKeyObject = bitcoinService.createWallet(userId);
    const btcAddress = btcKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.BTC, value: 0, address: btcAddress, keyObject: btcKeyObject});
  }
  if (!existingCurrencies.ETH) {
    const ethKeyObject = etherService.createEtherWallet(userId);
    const ethAddress = ethKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.ETH, value: 0, address: ethAddress, keyObject: ethKeyObject});
  }
  if (!existingCurrencies.BXC) {
    const bxcKeyObject = etherService.createEtherWallet(userId);
    const bxcAddress = bxcKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.BXC, value: 0, address: bxcAddress, keyObject: bxcKeyObject});
  }
  if (!existingCurrencies.XRP) {
    const {tag, address: xrpAddress} = rippleService.getRippleTag(user.refId);
    walletArray.push({userId: userId, currency: currencyTypes.XRP, value: 0, address: xrpAddress, keyObject: {tag: tag}});
  }
  if (!existingCurrencies.LTC) {
    const ltcKeyObject = litecoinService.createWallet(userId);
    const ltcAddress = ltcKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.LTC, value: 0, address: ltcAddress, keyObject: ltcKeyObject});
  }
  if (!existingCurrencies.USDT) {
    const usdtKeyObject = etherService.createEtherWallet(userId);
    const usdtAddress = usdtKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.USDT, value: 0, address: usdtAddress, keyObject: usdtKeyObject});
  }

  const result = walletArray.length > 0 && arrayToJSON(await Account.bulkCreate(walletArray));
  await walletPublisher(walletArray);
  return result;
};

exports.createIEOAccount = async (userId, currency, t = null) => {
  const acc = await Account.findOne({
    where: {userId, currency, type: 'IEO_WALLET'}
  });
  if(!acc) {
    const IEOWallet = {type: 'IEO_WALLET', userId, currency, value: 0};
    return objectToJSON(await Account.create(IEOWallet, {transaction: t}));
  }
  return acc;
};

exports.createFiatAccount = async (fiatWallet, t = null) => {
  const {currency, userId} = fiatWallet;
  const acc = await Account.findOne({where: {currency, userId, type: 'FIAT_WALLET'}});
  if (!acc) {
    return objectToJSON(await Account.create(fiatWallet, {transaction: t}));
  }
  return acc;
};

exports.getBalanceByUserId = async ({userId}, t=null) => {
  logger.info('Fetching account balance for user : ' + userId);
  return arrayToJSON(await Account.findAll({
      attributes: ['currency', 'value'],
      where: {userId, currency: {$in: supportedCurrencies}},
      exclude: ['keyObject'],
      transaction: t,
    }));
};

// exports.getAllAccounts = async () => arrayToJSON(await Account.findAll());
exports.getAllAccounts = async (offset) => {
  return arrayToJSON(await Account.findAll({
    limit: 10,
    offset: offset || 0,
    include: [{model: User, as: 'user', attributes: ['fullName', 'phone', 'email', 'customerId']}]
  }));
};

exports.fetchAccountById = async accountId => {
  return await Account.find({
    include: [{model: User, as: 'user', attributes: ['fullName', 'phone', 'email', 'customerId']}],
    where: {id: accountId}
  });
};

exports.getAccountsByUserId = async userId => {
  return arrayToJSON(await Account.findAll({
    include: [{model: User, as: 'user', attributes: ['fullName', 'phone', 'email', 'customerId']}],
    where: {userId: userId}
  }));
};

exports.getCurrencyAccount = async(userId, currency) => {
  return objectToJSON(await Account.findOne({
    where: {userId: userId, currency: currency}
  }));
};

exports.checkBalance = async (userId, currency, totalAmt) => {
  const accountDetails = objectToJSON(await Account.findOne({
    where: {userId: userId, currency: currency}
  }));
  logger.info(`Check Account ${totalAmt} ${accountDetails.id}`);
  accountDetails.isEligible = parseFloat(totalAmt) <= parseFloat(accountDetails.value);
  logger.info(`Account is Eligible ${accountDetails.isEligible}`);
  return accountDetails;
};

exports.updateUserBalance = async (userId, currency, value, t=null) => {
  const updatedUserAccount = await Account.update({value: value},
    {
      where: {userId: userId, currency: currency},
      transaction : t,
      returning: true,
      plain: true
  });
  return updatedUserAccount[1].dataValues;
};
const debitBalance = async (userId, currency, value, t=null, options = {}) => {
  const userAccount = await Account.findOne({
    attributes: ['value', 'currency', 'id', 'userId'],
    where:{userId: userId, currency: currency},
    transaction: t,
  });
  if(parseFloat(value) > 0) {
    const newBalance = numeral(userAccount.value).subtract(value).value();
    if (newBalance >= 0) {
      const updatedUserAccount = await userAccount.update({value: newBalance}, _.assign({}, options, {transaction: t}));
      return updatedUserAccount.dataValues;
    } else {
      return userAccount;
    }
  }
  return userAccount;
};
const creditBalance = async (userId, currency, value, t=null, options = {}) => {
  const userAccount = await Account.findOne({
    attributes: ['value', 'currency', 'id', 'userId'],
    where:{userId: userId, currency: currency},
    transaction: t,
  });
  if(parseFloat(value) > 0) {
    const newBalance = numeral(userAccount.value).add(value).value();
    const updatedUserAccount = await userAccount.update({value: newBalance}, _.assign({}, options, {transaction: t}));
    return updatedUserAccount.dataValues;
  }
  return userAccount;
};
exports.creditBalance = async (userId, currency, value, t=null, options={}) => {
  return await creditBalance(userId, currency, value, t, options);
};

exports.debitBalance = async (userId, currency, value, t=null, options={}) => {
  return await debitBalance(userId, currency, value, t, options);
};

exports.checkUserTradeEligibility = async (order) => {
  let userAccountDetails = null;
  const amountToBeTransferred = orderUtils.calculateUserAmount(order.price, order.currentSize, order.side, 'DEBIT');
  const {userId, side, currency} = order;
  if (side === 'BUY') {
    userAccountDetails = await Account.findOne({where: {userId: userId, currency: baseCurrency}});
  } else {
    userAccountDetails = await Account.findOne({where: {userId: userId, currency: currency}});
  }
  return numeral(userAccountDetails.value).value() >= numeral(amountToBeTransferred).value();
};
exports.transferToServer = async (userId, side, currency, amount, t=null, options) => {
  let userAccountDetails = null, serverAccountDetails = null;
  if (side === 'BUY') {
    userAccountDetails = await Account.findOne({where: {userId: userId, currency: baseCurrency}, transaction: t, lock: t.LOCK.UPDATE});
    serverAccountDetails = await Account.findOne({where: {userId: serverAccountId, currency: baseCurrency}, transaction: t, lock: t.LOCK.UPDATE});
  } else {
    userAccountDetails = await Account.findOne({where: {userId: userId, currency: currency}, transaction: t, lock: t.LOCK.UPDATE});
    serverAccountDetails = await Account.findOne({where: {userId: serverAccountId, currency: currency}, transaction: t, lock: t.LOCK.UPDATE});
  }
  if (numeral(userAccountDetails.value).value() >= numeral(amount).value() && serverAccountDetails) {
    return await Promise.all([
      creditBalance(serverAccountId, side === 'BUY' ? baseCurrency : currency, amount, t, _.assign({}, options, {beneficiary: userId})),
      debitBalance(userId, side === 'BUY' ? baseCurrency : currency, amount, t, _.assign({}, options, {beneficiary: serverAccountId}))
    ])
    .then((data) => {
      logger.info(`Transfered from User : ${userId} to Server Account currency= ${side === 'SELL' ? currency : baseCurrency}, value = ${amount} `);
      return {status: 200, message: 'Successfully Transfered', data: filterAccounts([objectToJSON(data[0])])};
    })
    .catch((err) => {
      return {status: 400, message: 'Failed to transfer balance', error: err};
    });
  } else {
    return {status: 400, message: 'Not Enough Balance'};
  }
};

exports.transferFromServer = async (userId, currency, amount, t=null, options) => {
  let userAccountDetails = await Account.findOne({where: {userId: userId, currency: currency}, transaction: t, lock: t.LOCK.UPDATE});
  let serverAccountDetails = await Account.findOne({where: {userId: serverAccountId, currency: currency}, transaction: t, lock: t.LOCK.UPDATE});
  if (numeral(serverAccountDetails.value).value() >= numeral(amount).value() && userAccountDetails) {
    const data = await Promise.all([
      creditBalance(userId, currency, amount, t, _.assign({}, options, {beneficiary: serverAccountId})),
      debitBalance(serverAccountId, currency, amount, t, _.assign({}, options, {beneficiary: userId})),
    ]);
    logger.info(`Transfered from Server to User: ${userId} Account currency = ${currency}, value = ${amount} `);
    return {status: 200, data: filterAccounts([objectToJSON(data[0])]), message: 'Successfully Transfered'};
  } else {
    return {status: 400, message: 'Not Enough Balance'};
  }
};

exports.getWalletAddress = async (userId, currency) => {
  const userAccountDetails = await Account.findOne({attributes: ['userId', 'currency', 'address', 'keyObject'], where: {userId: userId, currency: currency}});
  const wallet  = objectToJSON(userAccountDetails);
  const tag = _.get(wallet, 'keyObject.tag', undefined); // for ripple and stellar
  return {
    address: wallet.address,
    userId: wallet.userId,
    currency: wallet.currency,
    tag,
  };
};
exports.getUserIdByAddress = async (currency, address, tag) => {
  const tagSupported = ['XRP'];
  if (address) {
    if (tagSupported.indexOf(currency) !== -1) {
      const account = await Account.findOne({
        where: {
          address,
          currency,
          keyObject: {tag},
        }
      });
      return objectToJSON(account);
    }
    const account = await Account.findOne({
      where: {address, currency}
    });
    return objectToJSON(account);
  }
  return null;
};
exports.getAccountById = async(accountId) => { // only for getAccount by admin
  return objectToJSON(await Account.findOne({attributes: ['userId', 'id', 'currency', 'address', 'keyObject'], where: {id: accountId}}));
};
exports.updateWalletDetails = async(accountId, address, keyObject) => {
  const updatedAccount = await Account.update(
    {address: address, keyObject: keyObject},
    {where: {id: accountId}, returning: true,plain: true});
  return objectToJSON(updatedAccount[1]);
};
