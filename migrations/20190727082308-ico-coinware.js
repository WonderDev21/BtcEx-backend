'use strict';
const config = require('../config');
const _ = require('lodash');
const {IEO_CURRENCY} = config;
const uuid = require('uuid/v4');


const createAccount = (user, accounts) => {
  let userWallet = null;
  const userId = user.userId;
  const existingCurrencies = {};
  _.forEach(accounts, (ac) => {
    existingCurrencies[ac.currency] = 1;
  });
  if (!existingCurrencies.CWT) {
    userWallet = {
      type: 'IEO_WALLET',
      id: uuid(),
      createdAt: user.createdAt, updatedAt: user.createdAt,
      userId, currency: IEO_CURRENCY.CWT, value: 0};
  }
  return userWallet;
};


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const newAccounts = [];
    const users = await queryInterface.sequelize
      .query('SELECT * from "Users"', {type: Sequelize.QueryTypes.SELECT});
    await queryInterface.addColumn('Accounts', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'ACTIVE'
    });
    console.log('Adding column Account status');
    await queryInterface.addColumn('Accounts', 'type', {
      type: Sequelize.STRING,
      defaultValue: 'EXCHANGE_WALLET'
    });
    console.log('Adding column Account type');
    for (let user of users) {
      const userId = user.userId;
      const userAccounts = await queryInterface.sequelize.query(`SELECT *
      FROM "Accounts" JOIN "Users" ON "Accounts"."userId" = "Users"."userId"
      WHERE "Accounts"."userId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT});
      const ieoaccount = createAccount(user, userAccounts);
      if(ieoaccount) {
        newAccounts.push(ieoaccount);
      }
    }
    console.log('New accounts to be added', newAccounts.length);
    if (newAccounts.length) {
      await queryInterface.bulkInsert('Accounts', newAccounts);
    }
    console.log('Account Migration success');
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};
