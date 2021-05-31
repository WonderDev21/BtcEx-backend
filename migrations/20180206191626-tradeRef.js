'use strict';
const shortid = require('shortid');
/* eslint-disable quotes */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const allTrades = await queryInterface.sequelize
      .query(`SELECT * from "Trades"`, {type: Sequelize.QueryTypes.SELECT});
    await queryInterface.addColumn('Trades', 'refNo', {type: Sequelize.STRING});
    for (let trade of allTrades) {
      const resp = await queryInterface.sequelize
            .query(`update "Trades" set "refNo" = '${shortid.generate()}' where "tradeId" = '${trade.tradeId}'`);
    }
    console.log('Migration success');
  },

  down: (queryInterface, Sequelize) => {
    console.log('Executing down');
    return queryInterface.removeColumn('Trades', 'refNo')
    .then(x => console.log('Migration failed'));
  }
};
