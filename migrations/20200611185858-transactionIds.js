'use strict';
const Hashids = require('hashids/cjs');

const {HASHID_SALT} = require('../config/index');

const hashids = new Hashids(HASHID_SALT, 15);

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    await queryInterface.addColumn('Transactions', 'refId', {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      unique: true,
    });
    const allTxn = await queryInterface.sequelize.query('SELECT * from "Transactions"', {type: Sequelize.QueryTypes.SELECT});
    for (const txn of allTxn) {
      await queryInterface.sequelize.query(`UPDATE "Transactions" SET "refNo" = '${hashids.encode(txn.refId)}' WHERE "transactionId" = '${txn.transactionId}'`);
    }
    console.log('Migration is successful!');
  },

  // eslint-disable-next-line no-unused-vars
  down: async (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
   await queryInterface.removeColumn('Transactions', 'refId');
   console.log('Executing down');
  }
};
