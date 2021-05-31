const Sequelize = require('sequelize');
const numeral = require('numeral');
const {currencyTypes, orderStatus, orderTypes, orderSide} = require('../constants/orderConstants');// get from config.
const orderObject = {
  orderId: {
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
  price: {
    type: Sequelize.DECIMAL(16, 8),
    validate: {
      isDecimal: {
        msg: 'price must be a number'
      },
      min: 0,
    },
  },
  currentSize: {
    type: Sequelize.DECIMAL(10, 4),
    min: 0,
  },
  filledSize: {
    type: Sequelize.DECIMAL(10, 4),
    defaultValue: 0,
    min: 0,
  },
  type: {
    type: Sequelize.ENUM,
    values: Object.keys(orderTypes),
    defaultValue: orderTypes.GTC,
  },
  status: {
    type: Sequelize.ENUM,
    values: Object.keys(orderStatus),
    defaultValue: orderStatus.PENDING,
  },
  userId: {
    type: Sequelize.UUID,
    allowNull: false
  },
  misc: Sequelize.JSON
};
module.exports = (sequelize) => {
  var Order =  sequelize.define('Order', orderObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        Order.belongsTo( models.Level, {as: 'level', foreignKey: 'levelId'});
        // Order.hasMany( models.Trade, { as: 'Trade', foreignKey: 'orderId'});
      }
    }
  });
  return Order;
};
