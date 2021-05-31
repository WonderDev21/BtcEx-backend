const Sequelize = require('sequelize');
const notificationObject = {
  notificationId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  title: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  message: Sequelize.TEXT,
  image: Sequelize.STRING,
  priority: {
    type: Sequelize.INTEGER, // 0 is highest priority
    defaultValue: 1,
  },
  type: {
    type: Sequelize.STRING, // ['global', 'user', 'admin']
    allowNull: false,
    defaultValue: 'user'
  },
  template: Sequelize.STRING,
  readFlag: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  expireAt: Sequelize.DATE,
  misc: Sequelize.JSON
};
module.exports = (sequelize) => sequelize.define('Notification', notificationObject, {timestamps: true});

/* Priority

  0 - HIGHEST [change password request, some issue in server, ]
  1 - NORMAL [transactional: for order placed, traded, kyc verified, withdraw completed etc, low balance]
  2 - LOW [promotional: new features in app, ]
*/

