const Sequelize = require('sequelize');

const ieoSaleObject = {
  saleId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  coinId: Sequelize.INTEGER, // coinId which was purchase
  bonusPercent: Sequelize.DECIMAL(5, 2),
  discountPercent: Sequelize.DECIMAL(5, 2),
  size: Sequelize.DECIMAL(16, 4), // total no. of tokens
  rate: {// rate at which it was purchased ex: BTC/ETH etc.
    type: Sequelize.DECIMAL(16, 8),
    allowNull: false
  },
  totalAmt: Sequelize.DECIMAL(16, 8),
  token: Sequelize.STRING, /// ex: CWT etc.
  currency: Sequelize.STRING, /// ex: BTC/ETH etc.
  userId: Sequelize.UUID,
  refSaleId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    unique: true,
  },
  meta: Sequelize.JSON,
};
module.exports = (sequelize) => {
  var IeoSale =  sequelize.define('IeoSale', ieoSaleObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        IeoSale.belongsTo(models.Ieoproject, {as: 'Ieoproject', foreignKey: 'projectId'});
      }
    }
  });
  return IeoSale;
};
