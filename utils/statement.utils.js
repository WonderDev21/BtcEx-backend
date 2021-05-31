const numeral = require('numeral');
const {allowedTypes} = require('../constants/tradeConstants');
/*
  statement:
  date, desc, amount, currency, id
*/
function toTitleCase(txt) {
  return String(txt[0]).toUpperCase() + String(txt.slice(1)).toLowerCase();
}
/*

const Sequelize = require('sequelize');
const {currencyTypes} = require('../constants/orderConstants');
const statementObject = {
  statementId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  type: Sequelize.STRING,
  refId: Sequelize.UUID, // reference to txnId, orderId, tradeId
  currency: {
    type: Sequelize.ENUM,
    values: Object.keys(currencyTypes),
    allowNull: false
  },
  txnType: Sequelize.STRING, // deposit or withdrawal
  currentBalance: Sequelize.DECIMAL(10, 2),
  prevBalance: Sequelize.DECIMAL(10, 2),
  description: Sequelize.TEXT,
};
module.exports = (sequelize) => {
  const Statement = sequelize.define('Statement', statementObject, {
    classMethods: {
      associate: function(models) {
        Statement.belongsTo( models.User, {as: 'user', foreignKey: 'userId'});
      }
    }
  });
  return Statement;
};


*/
