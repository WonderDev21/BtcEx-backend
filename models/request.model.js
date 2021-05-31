const Sequelize = require('sequelize');
const {transactionStatus} = require('../constants/tradeConstants');

const requestObject = {
  requestId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  mode: Sequelize.STRING,
  currency: {
    type: Sequelize.STRING,
    allowNull: false
  },
  receipt: Sequelize.STRING,
  bankName: Sequelize.STRING,
  address: Sequelize.STRING,
  transactionNo: {type: Sequelize.TEXT, allowNull: false},
  remarks: Sequelize.TEXT,
  refNo: Sequelize.STRING,
  amount: {
    type: Sequelize.DECIMAL(16, 8), allowNull: false,
    validate: {
      isNonZero(val) {
        if (parseFloat(val) <= 0) {
          throw new Error('Amount must be non-zero.');
        }
      }
    },
  },
  time: {
    type: Sequelize.DATE,
    defaultValue: new Date().toISOString(),
  },
  status: {type: Sequelize.ENUM, values: Object.keys(transactionStatus), defaultValue: transactionStatus.PENDING},
};
module.exports = (sequelize) => {
  const Request = sequelize.define('Request', requestObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        Request.belongsTo( models.User, {as: 'user', foreignKey: 'userId'});
      }
    }
  });
  return Request;
};
