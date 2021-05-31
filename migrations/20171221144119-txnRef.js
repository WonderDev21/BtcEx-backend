'use strict';
const shortid = require('shortid');
/* eslint-disable quotes */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const allTxns = await queryInterface.sequelize
      .query(`SELECT * from "Transactions"`, {type: Sequelize.QueryTypes.SELECT});
    await queryInterface.addColumn('Transactions', 'refNo', {type: Sequelize.STRING});
    for (let txn of allTxns) {
      const resp = await queryInterface.sequelize
            .query(`update "Transactions" set "refNo" = '${shortid.generate()}' where "transactionId" = '${txn.transactionId}'`);
    }
    console.log('Migration success');
  },

  down: (queryInterface, Sequelize) => {
    console.log('Executing down');
    return queryInterface.removeColumn('Transactions', 'refNo')
    .then(x => console.log('Migration failed'));
  }
};
