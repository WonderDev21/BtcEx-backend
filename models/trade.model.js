const Sequelize = require('sequelize');
const {currencyTypes} = require('../constants/orderConstants');
const numeral = require('numeral');
const shortid = require('shortid');

const tradeObject = {
  tradeId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  price: Sequelize.DECIMAL(16, 4),
  size: Sequelize.DECIMAL(16, 4),
  costApplied: {
    type: Sequelize.DECIMAL(10, 4),
    allowNull: false
  },
  buyerFee: {
    type: Sequelize.DECIMAL(10, 4),
    allowNull: false,
  },
  sellerFee: {
    type: Sequelize.DECIMAL(10, 4),
    allowNull: false,
  },
  currency: {
    type: Sequelize.STRING,
    // values: Object.keys(currencyTypes),
    allowNull: false,
  },
  buyOrderId: Sequelize.UUID,
  sellOrderId: Sequelize.UUID,
  buyUserId: Sequelize.UUID,
  sellUserId: Sequelize.UUID,
  refNo: Sequelize.STRING,
  refId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    unique: true,
  },
};
module.exports = (sequelize) => {
  var Trade = sequelize.define('Trade', tradeObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        Trade.belongsTo(models.Order, {foreignKey: 'buyOrderId', as: 'buyTrade'});
        Trade.belongsTo(models.Order, {foreignKey: 'sellOrderId', as: 'sellTrade'});
      }
    },
    getterMethods: {
      // totalAmt : function() {
      //   var total = numeral(this.price).multiply(this.size).add(this.costApplied).value();
      //   return total;
      // }
    },
    hooks: {
      beforeCreate: function(trade, options, callback) {
        try {
          trade.set('refNo', shortid.generate());
          return callback(null, options);
        } catch(error) {
          return callback(error, options);
        }
      }
    },
  });
  return Trade;
};
