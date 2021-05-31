const _ = require('lodash');

exports.arrayToJSON = (array = []) => array.map(x => x && x.dataValues);
exports.objectToJSON = obj => obj && obj.dataValues;
exports.filterUserObj = (user) =>  _.omit(user, ['TFAKey', 'password', 'createdAt', 'updatedAt', 'lastLogin', 'isAdmin', 'refId']);
exports.filterAccounts = (accounts = []) => accounts.map((ac) => _.omit(ac, ['keyObject', 'address', 'createdAt', 'updatedAt']));
