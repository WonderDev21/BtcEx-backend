const Sequelize = require('sequelize');
const Hashids = require('hashids/cjs');

const {allowedModes, allowedTypes, transactionStatus} = require('../constants/tradeConstants');
const {currencyTypes} = require('../constants/orderConstants');
const {HASHID_SALT} = require('../config/index');

const hashids = new Hashids(HASHID_SALT, 15);

const transactionObject = {
  transactionId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  mode: {
    type: Sequelize.STRING,
    defaultValue: allowedModes.OTHERS
  },
  fee: {
    type: Sequelize.DECIMAL(16, 8),
    defaultValue: 0,
  },
  currency: {
    type: Sequelize.STRING,
    // values: Object.keys(currencyTypes),
    allowNull: false
  },
  tag: Sequelize.STRING, // for ripple withdrawal
  address: Sequelize.STRING, // for wallet withdrawal
  amount: {
    type: Sequelize.DECIMAL(16, 8),
    allowedNull: false,
  },
  refNo: Sequelize.STRING,
  time: Sequelize.DATE,
  type: {type: Sequelize.ENUM, values: Object.keys(allowedTypes), allowNull: false},
  userId: {type: Sequelize.UUID}, // from
  customerId: {type: Sequelize.UUID}, // whose account will be debited/credited
  status: {type: Sequelize.ENUM, values: Object.keys(transactionStatus), defaultValue: transactionStatus.PENDING},
  // TODO: add currency and exchange Rate.
  /* Third Party Payment info For RazorPay */
  transactionInfo: Sequelize.JSON,
  gatewayTransactionId: Sequelize.TEXT,
  refId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    unique: true,
  }
};

module.exports = (sequelize) => sequelize.define('Transaction', transactionObject, {
  timestamps: true,
  hooks: {
    afterCreate: function(transaction, options, callback) {
      try {
        console.log('BEFORE MODEL', transaction.refId, transaction.refNo);
        transaction.set('refNo', hashids.encode(transaction.refId));
        console.log('AFTER MODEL', transaction.refId, transaction.refNo);
        return callback(null, options);
      } catch(error) {
        return callback(error, options);
      }
    }
  },
});
