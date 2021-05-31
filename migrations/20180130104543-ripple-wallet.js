'use strict';
const randomNatural = require('random-natural');
const _  = require('lodash');
const getTag = (refId) => {
    let tag = '';
    if (refId <= 999) { // 1000110 - 9999999
        const paddedRef = _.padStart(refId, 3, '0');
        tag = `${randomNatural({min: 10, max: 99})}${paddedRef}${randomNatural({min: 10, max: 99})}`;
    } else if(refId <= 9999) { // 10100010 - 99999999
        tag = `${randomNatural({min: 10, max: 99})}${refId}${randomNatural({min: 10, max: 99})}`;
    } else if(refId <= 99999) { // 101000010 - 999999999
        tag = `${randomNatural({min: 10, max: 99})}${refId}${randomNatural({min: 10, max: 99})}`;
    } else { // 1100000100 - 1xxxxxxx999
        tag = `1${refId}${randomNatural({min: 100, max: 999})}`;
    }
    return tag;
};
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const accounts = await queryInterface.sequelize
      .query(`SELECT *, "Users"."refId" from "Accounts" 
      join "Users"
      on "Accounts"."userId" = "Users"."userId"
      where "Accounts"."currency" = 'XRP' `,
      {type: Sequelize.QueryTypes.SELECT});

      for (let acnt of accounts) {
        const tag = getTag(acnt.refId);
        const accountId = acnt.id;
        const resp = await queryInterface.sequelize
              .query(`update "Accounts" set 
              "address" = 'rBkKHhUJMJnnwmw6aeu4W1dBYNFL6vseoN',
              "keyObject" = '{"tag": "${tag}"}'
              where "id" = '${accountId}' AND "currency" = 'XRP'
            `);
      }
      console.log('Account Migration success');
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
  },

  down: (queryInterface, Sequelize) => {
    console.log('Account Migration Failed');
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};
