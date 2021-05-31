'use strict';
const Sequelize = require('sequelize');
const config = require('../config');
const Hashids = require('hashids/cjs');
const {HASHID_SALT} = config;

const hashids = new Hashids(HASHID_SALT, 5, 'abcdefghijklmnopqrstuvwxyz0123456789');

const ieoProjectSchemaObject = {
  slug: Sequelize.STRING,
  projectId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  coinId: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    unique: true,
    /* ALTER SEQUENCE Coins_refId_seq RESTART WITH 100 to start counter from 100  */
  },
  ieoUnitCurrency: Sequelize.STRING, // currency to measure value ex: USD for CWT
  projectName: Sequelize.STRING,
  symbol: Sequelize.STRING,
  unitPrice: Sequelize.DECIMAL(16, 8), // price per token
  minPurchase: Sequelize.JSON,
  maxPurchase: Sequelize.JSON,
  totalSupply: Sequelize.DECIMAL(16, 8),
  info: Sequelize.JSON,
  logo: Sequelize.STRING,
  buyTypes: Sequelize.ARRAY(Sequelize.STRING),
  assets: Sequelize.ARRAY(Sequelize.JSON),
  saleStartDate: Sequelize.DATE,
  saleEndDate: Sequelize.DATE,
  status: Sequelize.STRING,
  bonuses: Sequelize.ARRAY(Sequelize.JSON),
  documents: Sequelize.JSON,
  social: Sequelize.ARRAY(Sequelize.JSON),
  teamMembers: Sequelize.ARRAY(Sequelize.JSON),
  meta: Sequelize.JSON,
};
module.exports = (sequelize) => {
  const IeoProject = sequelize.define('Ieoproject', ieoProjectSchemaObject, {
    timestamps: true,
    hooks: {
      afterCreate: async function(project, options, callback) {
        try {
          await project.updateAttributes({'slug': hashids.encode(project.coinId)});
          return callback(null, options);
        } catch(error) {
          return callback(error, options);
        }
      }
    },
  });
  return IeoProject;
};
