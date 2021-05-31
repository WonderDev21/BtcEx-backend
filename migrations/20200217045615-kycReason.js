'use strict';
const {verificationStatus} = require('../constants/userConstants');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
      ALTER TABLE "Users" ADD COLUMN "sumSubKycVerified" "enum_Users_kycVerified" DEFAULT 'UNVERIFIED'::"enum_Users_kycVerified"
    */
    await queryInterface.addColumn('Users', 'kycReason', {type: Sequelize.STRING});
    await queryInterface.addColumn('Users', 'sumSubKycVerified', {
        type: Sequelize.ENUM,
        values: Object.keys(verificationStatus),
        defaultValue: verificationStatus.UNVERIFIED,
    });
    console.log('Migration success');
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    console.log('Migration failed');
  }
};
