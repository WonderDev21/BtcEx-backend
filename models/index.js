'use strict';

const fs           = require('fs');
const path         = require('path');
const basename     = path.basename(module.filename);
// const { NODE_ENV } = require('../setup/env');
const db           = {};
function associateModel(sequelize) {
  fs.readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(function(file) {
    var model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });
  Object.keys(db).forEach(function(modelName) {
    if (db[modelName].associate) {
      console.log('Associating', modelName);
      db[modelName].associate(db);
    }
  });
  return sequelize;
}
// module.exports = sequelize;
// db.Sequelize = Sequelize;
// const sequelize = associateModel(Database.getInstance());
module.exports = associateModel(require('../db')());
