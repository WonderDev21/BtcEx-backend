'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const t = await Promise.all([
      queryInterface.changeColumn('Accounts', 'currency', {
        type: 'VARCHAR(255) USING CAST("currency" as VARCHAR(255))'
      }),
      queryInterface.changeColumn('Levels', 'currency', {
        type: 'VARCHAR(255) USING CAST("currency" as VARCHAR(255))'
      }),
      queryInterface.changeColumn('Orders', 'currency', {
        type: 'VARCHAR(255) USING CAST("currency" as VARCHAR(255))'
      }),
      queryInterface.changeColumn('Trades', 'currency', {
        type: 'VARCHAR(255) USING CAST("currency" as VARCHAR(255))'
      }),
      queryInterface.changeColumn('Transactions', 'currency', {
        type: 'VARCHAR(255) USING CAST("currency" as VARCHAR(255))'
      })
    ]);
    console.log('Migration done for ENUMS');
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
