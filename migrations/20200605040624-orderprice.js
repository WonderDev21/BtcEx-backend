'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
  await queryInterface.changeColumn('Orders', 'price', {
    type: Sequelize.DECIMAL(16, 8),
  });
  console.log('Orders Migration sucess');
  await queryInterface.changeColumn('Levels', 'price', {
    type: Sequelize.DECIMAL(16, 8),
  });
  console.log('Levels Migration sucess');
  await queryInterface.changeColumn('Trades', 'buyerFee', {
    type: Sequelize.DECIMAL(10, 4),
  });
  console.log('Trades Migration sucess');
  await queryInterface.changeColumn('Trades', 'sellerFee', {
    type: Sequelize.DECIMAL(10, 4),
  });
  console.log('Trades2 Migration sucess');
  await queryInterface.changeColumn('Trades', 'costApplied', {
    type: Sequelize.DECIMAL(10, 4),
  });
  console.log('Migration sucess');
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
