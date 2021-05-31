'use strict';
const _ = require('lodash');
const rippleService = require('../services/ripple.service');
const etherService = require('../services/ethereum.service');
const iotaService = require('../services/iota.service');
const bitcoinService = require('../services/bitcoin.service');
const litecoinService = require('../services/litecoin.service');
const {currencyTypes} = require('../constants/orderConstants');
const numeral = require('numeral');

const uuid = require('uuid/v4');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query('SELECT * from "Users"', {type: Sequelize.QueryTypes.SELECT});
    const newAccounts = [];
    const nullAccounts = await queryInterface.sequelize.query(`SELECT * from "Accounts"
      where "currency" IS NULL`, {type: Sequelize.QueryTypes.SELECT});
    console.log('Null Accounts: ', nullAccounts.length);
    let balanceSum = 0; let balanceCount = 0;
    if (!nullAccounts.length) {

      for (let user of users) {
        const userId = user.userId;
        const userAccounts = await queryInterface.sequelize.query(`SELECT *
        FROM "Accounts" JOIN "Users" ON "Accounts"."userId" = "Users"."userId"
        WHERE "Accounts"."userId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT});
        const balanceAccounts = await queryInterface.sequelize.query(`SELECT *
        FROM "Accounts" JOIN "Users" ON "Accounts"."userId" = "Users"."userId"
        WHERE "Accounts"."userId" = '${userId}' AND "Accounts"."value" > 0`, {type: Sequelize.QueryTypes.SELECT});
        // console.log('Balance Account of users: ', balanceAccounts);
        balanceCount += balanceAccounts.length;
        balanceSum += balanceAccounts.reduce((p, c) => numeral(p).add(c.value).value(), 0);
        const userNewAccounts = createAccount(user, userAccounts);
        newAccounts.push(...userNewAccounts);
      }
      console.log('BALANCE BEFORE', balanceCount, balanceSum);
      let afterSum = 0; let afterCount = 0;
      const resp = await queryInterface.bulkInsert('Accounts', newAccounts);
      for (let user of users) {
        const userId = user.userId;
        const userAccounts = await queryInterface.sequelize.query(`SELECT *
        FROM "Accounts" JOIN "Users" ON "Accounts"."userId" = "Users"."userId"
        WHERE "Accounts"."userId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT});
        const balanceAccounts = await queryInterface.sequelize.query(`SELECT *
        FROM "Accounts" JOIN "Users" ON "Accounts"."userId" = "Users"."userId"
        WHERE "Accounts"."userId" = '${userId}' AND "Accounts"."value" > 0`, {type: Sequelize.QueryTypes.SELECT});
        afterCount += balanceAccounts.length;
        afterSum += balanceAccounts.reduce((p, c) => numeral(p).add(c.value).value(), 0);
        console.log('No. of account of user ', user.fullName, ' = ' + userAccounts.length);
      }
      console.log('BALANCE AFTER', afterCount, afterSum);
      if (afterSum === balanceSum && balanceCount === afterCount) {
        console.log('MIGRATION SUCCESFULL');
      } else {
        throw new Error('Migration Failed!!!! :(');
      }
    }
  },

  down: (queryInterface, Sequelize) => {
  }
};
const createAccount = (user, accounts) => {
  const userId = user.userId;
  const existingCurrencies = {};
  const walletArray = [];
  _.forEach(accounts, (ac) => {
    existingCurrencies[ac.currency] = 1;
  });
  console.log(`Accounts of user: ${user.fullName} ${user.email} count: ${Object.keys(existingCurrencies).length}`);
  if (!existingCurrencies.INR) {
    walletArray.push({userId: userId, currency: currencyTypes.INR, value: 0});
  }
  if (!existingCurrencies.BTC) {
    const btcKeyObject = bitcoinService.createWallet(userId);
    const btcAddress = btcKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.BTC, value: 0, address: btcAddress, keyObject: JSON.stringify(btcKeyObject)});
  }
  if (!existingCurrencies.ETH) {
    const ethKeyObject = etherService.createEtherWallet(userId);
    const ethAddress = ethKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.ETH, value: 0, address: ethAddress, keyObject: JSON.stringify(ethKeyObject)});
  }
  if (!existingCurrencies.XRP) {
    const xrpKeyObject = rippleService.createWallet();
    const xrpAddress = xrpKeyObject.address;
    walletArray.push({userId: userId, currency: currencyTypes.XRP, value: 0, address: xrpAddress, keyObject: JSON.stringify(xrpKeyObject)});
  }
  if (!existingCurrencies.LTC) {
    const ltcKeyObject = litecoinService.createWallet(userId);
    const ltcAddress = ltcKeyObject.address;
    walletArray.push({userId, currency: currencyTypes.LTC, value: 0, address: ltcAddress, keyObject: JSON.stringify(ltcKeyObject)});
  }
  if (!existingCurrencies.MIOTA) {
    const iotaKeyObject = iotaService.createSeed(userId);
    const iotaAddress = iotaService.getNewAddress(iotaKeyObject.seed, iotaKeyObject.key);
    walletArray.push({userId, currency: currencyTypes.MIOTA, value: 0, address: iotaAddress, keyObject: JSON.stringify(iotaKeyObject)});
  }
  console.log('New Wallet of user: ', walletArray.length);
  return walletArray.map(x => _.assign({}, x, {id: uuid(), createdAt: user.createdAt, updatedAt: user.createdAt}));
};
