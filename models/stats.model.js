const Sequelize = require('sequelize');
const statsObject = {
  statsId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  lowToday: Sequelize.DECIMAL(10, 2),
  highToday: Sequelize.DECIMAL(10, 2),
  highAllTime: Sequelize.DECIMAL(10, 2),
};
module.exports = (sequelize) => sequelize.define('Stats', statsObject, {timestamps: true});
