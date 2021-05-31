const Sequelize = require('sequelize');
const {currencyTypes, orderSide} = require('../constants/orderConstants');
const levelObject = {
  levelId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  side: {
    type: Sequelize.ENUM,
    values: Object.keys(orderSide),
    allowNull: false
  },
  currency: {
    type: Sequelize.STRING,
    // values: Object.keys(currencyTypes),
    allowNull: false
  },
  price: Sequelize.DECIMAL(16, 8), // (price + side) should be unique.
  size: Sequelize.DECIMAL(10, 4), // total seller
  orderQty: Sequelize.INTEGER, // total order
};
module.exports = (sequelize) => {
  const Level = sequelize.define('Level', levelObject, {
    classMethods: {
      associate: function(models) {
        Level.hasMany( models.Order, {as: 'orders', foreignKey: 'levelId'});
      }
    }
  });
  return Level;
};
