const logger = require('winston');
const Sequelize = require('sequelize');
const numeral = require('numeral');
const shortid = require('shortid');
const {currencyTypes} = require('../constants/orderConstants'); // get from config.

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

const accountSchemaObject = {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },
  type: {
    type: Sequelize.STRING,
    defaultValue: 'EXCHANGE_WALLET'
  },
  status: {
    type: Sequelize.STRING,
    defaultValue: 'ACTIVE'
  },
  currency: {
    type: Sequelize.STRING,
    // values: Object.keys(currencyTypes),
    allowNull: false,
  },
  value: {type: Sequelize.DECIMAL(16, 8), defaultValue: 0},
  address: Sequelize.STRING, // in case of wallet
  keyObject: Sequelize.JSON,
};

module.exports = (sequelize) => {
  const Account = sequelize.define('Account', accountSchemaObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        Account.belongsTo( models.User, {as: 'user', foreignKey: 'userId'});
      }
    }
  });
  Account.beforeUpdate( async function(ac, options, fn) {
    const prevAcount = ac._previousDataValues;
    const account = ac.dataValues;
    const Statement = sequelize.models.Statement;
    const stmnt = await Statement.create({
      txnType: parseFloat(prevAcount.value) > parseFloat(account.value) ? 'WITHDRAWAL' : 'DEPOSIT',
      currency: account.currency,
      closingBalance: account.value,
      openingBalance: prevAcount.value,
      transactionAmount: Math.abs(numeral(prevAcount.value).subtract(account.value).value()),
      userId: account.userId,
      beneficiary: options.beneficiary,
      remarks: options.remarks,
      refId: options.refId,
      refNo: 'St-'+shortid.generate(),
      accountId: account.id,
      status: 'COMPLETED',
    }, {transaction: options.transaction});
    return fn(null, options);
  });
  Account.afterUpdate(function(account, options, fn) {
    // console.log('After update', account._previousDataValues, account.dataValues);
    fn(null, options);
  });
  return Account;
};
