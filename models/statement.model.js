const Sequelize = require('sequelize');
const statementObject = {
  statementId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  beneficiary: {type: Sequelize.UUID, allowNull: false},
  userId: {type: Sequelize.UUID, allowNull: false},
  txnType: {type: Sequelize.STRING, allowNull: false},
  transactionAmount: {type: Sequelize.DECIMAL(16, 8), allowNull: false},
  openingBalance: {type: Sequelize.DECIMAL(16, 8), allowNull: false},
  closingBalance: {type: Sequelize.DECIMAL(16, 8), allowNull: false},
  currency: {type: Sequelize.STRING, allowNull: false},
  remarks: {type: Sequelize.TEXT},
  refId: {type: Sequelize.UUID},
  refNo: {type: Sequelize.STRING},
  status: {type: Sequelize.STRING, allowNull: false},
};
module.exports = (sequelize) => {
  const Statement = sequelize.define('Statement', statementObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        Statement.belongsTo( models.Account, {as: 'account', foreignKey: 'accountId'});
      }
    }
  });
  return Statement;
};
