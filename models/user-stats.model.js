const Sequelize = require('sequelize');
const userStatsSchemaObject = {
  balance: Sequelize.DECIMAL(10, 2),
  profit: Sequelize.DECIMAL(10, 2),
};
module.exports = (sequelize) => sequelize.define('userStats', userStatsSchemaObject);
