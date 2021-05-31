const Sequelize = require('sequelize');
const config = require('../config');
module.exports = () => {
  let sequelize = null;
  if (config.DATABASE_URL) {
    sequelize = new Sequelize(config.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
          ssl: true
        }
      });
  } else {
    sequelize = new Sequelize(config.dbName, config.userName, config.password, {
      host: config.host,
      dialect: 'postgres',
      pool: {
        max: 5,
        min: 0,
        idle: 10000
      },
      logging: false,
    });
  }
  return sequelize;
};

