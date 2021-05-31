'use strict';
const Sequelize = require('sequelize');
const documentSchemaObject = {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },
  idProof: Sequelize.JSON,
  addressProof: Sequelize.JSON,
  panNumber: Sequelize.STRING,
  aadharNumber: Sequelize.STRING,
  bankDetails: Sequelize.ARRAY(Sequelize.JSON),
  otherDetails: Sequelize.JSON,
  identity: Sequelize.STRING,  /* Image url */
  signature: Sequelize.STRING, /* Image url */
  photo: Sequelize.STRING, /* Image url */
  address: Sequelize.STRING, /* Image url */
};
// module.exports = (sequelize) => ({Document: sequelize.define('Document', documentSchemaObject, {timestamps: true})});
module.exports = (sequelize) => {
  const Document = sequelize.define('Document', documentSchemaObject, {
    timestamps: true,
    classMethods: {
      associate: function(models) {
        Document.belongsTo( models.User, {as: 'user', foreignKey: 'userId'});
      }
    }
  });
  return Document;
};

/*
[
    {
      ifscCode: '',
      bankName: '',
      accountHolderName: '',
      bankBranch: '',
      bankAccountNumber: '',
      accountType: '',
    }
  ]
  houseNo: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
 */
