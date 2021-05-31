const Promise = require('bluebird');
const _ = require('lodash');
const numeral = require('numeral');
const shortid = require('shortid');
const uuid = require('uuid/v4');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

const SERVERID = '1478766d-06d7-4b98-b40d-1e6770796186';
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query('SELECT * from "Users"', {type: Sequelize.QueryTypes.SELECT});
    // console.log('F USERS', users[0]);
    for (user of users) {
      const userId = user.userId;
      // console.log('Current User', user);
      const userAccounts = await queryInterface.sequelize.query(`SELECT *
      FROM "Accounts" JOIN "Users" ON "Accounts"."userId" = "Users"."userId"
      WHERE "Accounts"."userId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT});
      // console.log('User Accounts: ', userAccounts);
      const arr = await Promise.all([
        queryInterface.sequelize.query(`SELECT * from "Orders"
        where "userId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT}),
        queryInterface.sequelize.query(`SELECT * from "Trades" 
        where "sellUserId" = '${userId}' OR "buyUserId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT}),
        queryInterface.sequelize.query(`SELECT * from "Transactions"
        where "customerId" = '${userId}'`, {type: Sequelize.QueryTypes.SELECT}),
      ]);
        arr[0].map(x => x._type = 'ORDER');
        arr[1].map(x => x._type = 'TRADE');
        arr[2].map(x => x._type = 'TXN');
        const orders = arr[0];
        const trades = arr[1];
        const transactions = arr[2];
        const all = [...orders, ...trades, ...transactions];
        const accountCounter = {};
        userAccounts.forEach(ua => accountCounter[ua.currency] = {open: 0, close: 0});
        // console.log('GOT ALL RESPONSE FOR USER', JSON.stringify(all));
        const statements = [];
        all.sort(function (f1, f2) { //
          return new Date(f1.updatedAt) > new Date(f2.updatedAt) ? 1 : -1;
        });
        _.forEach(all, (item, index) => {
          let st = {};
          if (item._type === 'ORDER') {
            const orderSide = item.side;
            const account = userAccounts.find(x => x.currency === (orderSide === 'SELL' ? item.currency : 'INR'));

            // console.log('Account: ', account);
            let totalAmount = 0;
            let sellerCharged = 0;
            if (item.status === 'TRADED') {
              totalAmount = numeral(item.price).multiply(item.filledSize).value();
              sellerCharged = item.filledSize;
            } else {
              totalAmount = numeral(item.price).multiply(item.currentSize).value();
              sellerCharged = item.currentSize;
            }
            // const
            const costAppliedOnINR = numeral(totalAmount).multiply(0.5).divide(100).value();
            const buyerCharged = numeral(totalAmount).add(costAppliedOnINR).value();

            st.accountId = account.id;
            st.txnType = item.status === 'CANCELLED' ? 'DEPOSIT' : 'WITHDRAWAL';
            st.currency = orderSide === 'SELL' ? item.currency : 'INR';
            st.transactionAmount = orderSide === 'SELL' ? sellerCharged : buyerCharged;
            st.userId = userId;
            st.beneficiary = SERVERID;
            st.remarks = item.status === 'CANCELLED' ? 'Order Cancelled' : 'New Order';
            st.refId = item.orderId;
            st.refNo = shortid.generate();
            st.status = 'COMPLETE';
            st.createdAt = item.createdAt;
            st.updatedAt = item.updatedAt;
            if (item.status === 'CANCELLED') {
              // add new order
              const totalAmount2 = numeral(item.price).multiply(numeral(item.currentSize).add(item.filledSize).value()).value();
              const costAppliedOnINR2 = numeral(totalAmount2).multiply(0.5).divide(100).value();
              const buyerCharged2 = numeral(totalAmount2).add(costAppliedOnINR2).value();
              const st2 = _.cloneDeep(st);
              st2.txnType = 'WITHDRAWAL';
              st2.remarks = 'New Order';
              st2.refNo = shortid.generate();
              st2.updatedAt = item.createdAt;
              st2.transactionAmount = orderSide === 'SELL' ? numeral(item.currentSize).add(item.filledSize).value() : buyerCharged2;
              st2.statementId = uuid();
              st2.openingBalance = accountCounter[st2.currency].open;
              st2.closingBalance = st2.txnType === 'DEPOSIT' ? numeral(st2.openingBalance).add(st2.transactionAmount).value() : numeral(st2.openingBalance).subtract(st2.transactionAmount).value();
              accountCounter[st2.currency].open = st2.closingBalance;
              statements.push(st2);
            }
          } else if(item._type === 'TRADE') {
            const isBuyer = item.buyUserId === userId;
            /* Account which will be credited INR for seller and currency for buyer */
            const account = userAccounts.find(x => x.currency === (isBuyer ? item.currency : 'INR'));

            st.accountId = account.id;
            st.txnType = 'DEPOSIT';
            st.currency = isBuyer ? item.currency : 'INR';
            st.transactionAmount = isBuyer ? item.size : numeral(item.price).multiply(item.size).subtract(numeral(item.costApplied).divide(2).value()).value();
            st.userId = userId;
            st.beneficiary = SERVERID;
            st.remarks = 'Order Traded';
            st.refId = item.tradeId;
            st.refNo = shortid.generate();
            st.status = 'COMPLETE';
            st.createdAt = item.createdAt;
            st.updatedAt = item.updatedAt;
          } else if (item._type === 'TXN') {
            const account = userAccounts.find(x => x.currency === item.currency);
            st.accountId = account.id;
            st.txnType = item.type === 'ADD_TO_PLATFORM' ? 'DEPOSIT' : 'WITHDRAWAL';
            st.currency = item.currency;
            st.transactionAmount = item.amount;
            st.userId = userId;
            st.beneficiary = userId;
            st.remarks = `${item.currency} ${item.type === 'ADD_TO_PLATFORM' ? 'Deposit' : 'Withdrawal'}`;
            st.refId = item.transactionId;
            st.refNo = shortid.generate();
            st.status = item.status;
            st.createdAt = item.createdAt;
            st.updatedAt = item.updatedAt;
          }
          st.statementId = uuid();
          st.openingBalance = accountCounter[st.currency].open;
          st.closingBalance = st.txnType === 'DEPOSIT' ? numeral(st.openingBalance).add(st.transactionAmount).value() : numeral(st.openingBalance).subtract(st.transactionAmount).value();
          accountCounter[st.currency].open = st.closingBalance;
          statements.push(st);
        });
        // console.log('INSERT \n', JSON.stringify(statements));
        const resp = !!statements.length && await queryInterface.bulkInsert('Statements', statements);
        console.log('Bulk Statement insert for: ', userId);
    }
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
