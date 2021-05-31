'use strict';

const Amqp = require('../setup/amqp');
const amqp = new Amqp('amqp://pvatqfwu:q2IArlfzojvCwH4bbygXNe8Q5UugpK6W@mustang.rmq.cloudamqp.com/pvatqfwu');
// const amqp = new Amqp('amqp://rsiukvat:xetyJ8CYgu4Jz5HvDD63K-O_uU8ofKs7@mustang.rmq.cloudamqp.com/rsiukvat');
const etherService = require('../services/ethereum.service');

const isETHWallet = address => address.length === 40;

const delayFn = t => new Promise(resolve => setTimeout(resolve, t));

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await amqp.bindQueue('bxlend-wallet-events', 'bxlend-wallet', '');
    const usdtAccounts = await queryInterface.sequelize.query(
    `SELECT "Accounts"."id", "Accounts"."userId", "Accounts"."address", "Accounts"."currency" from "Accounts"
      where "Accounts"."currency" = 'USDT'
    `, {type: Sequelize.QueryTypes.SELECT});
    const bxcAccounts = await queryInterface.sequelize.query(
      `SELECT "Accounts"."id", "Accounts"."userId", "Accounts"."address", "Accounts"."currency" from "Accounts"
        where "Accounts"."currency" = 'BXC'
      `, {type: Sequelize.QueryTypes.SELECT});

    const bxcAccountsSize = bxcAccounts.length;
    const usdtAccountsSize = usdtAccounts.length;

    for (let i=0;i<bxcAccountsSize;i+=1) {
        const account = bxcAccounts[i];
        if (account.userId && account.currency) {
          const data = {
            type: 'ADD_WALLET',
            userId: account.userId,
            currency: account.currency,
            wallet: {
              address: '0x'+account.address,
              tag: null,
            }
          };
          try {
            await amqp.publish('bxlend-wallet-events', 'bxlend-wallet', data);
            await delayFn(50);
          } catch(err) {
            console.log('Publish Error', err);
          }
          console.log('Added wallet for ', account.userId, account.currency);
        }
    }
    for (let i=0;i<usdtAccountsSize;i+=1) {
      const account = usdtAccounts[i];
      if (account.userId && account.currency) {
        let usdtAddress = account.address;
        if(!isETHWallet(account.address)) {
          const usdtKeyObject = etherService.createEtherWallet(account.userId);
          usdtAddress = usdtKeyObject.address;
          await queryInterface.sequelize
              .query(`update "Accounts" set 
              "address" = '${usdtAddress}',
              "keyObject" = '${JSON.stringify(usdtKeyObject)}'
              where "id" = '${account.id}' AND "currency" = '${account.currency}'
            `);
        }
        const data = {
          type: 'ADD_WALLET',
          userId: account.userId,
          currency: account.currency,
          wallet: {
            address: '0x'+usdtAddress,
            tag: null,
          }
        };
        try {
          await amqp.publish('bxlend-wallet-events', 'bxlend-wallet', data);
          await delayFn(50);
        } catch(err) {
          console.log('Publish Error', err);
        }
        console.log('Added wallet for ', account.userId, account.currency);
      }
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
