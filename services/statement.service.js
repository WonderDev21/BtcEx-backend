const logger = require('winston');
const Statement = require('../models').models.Statement;

exports.getUserStatement = async (userId, offset, limit) => {
  logger.info('Getting user statments for userId', userId);
  const stmnts = await Statement.findAll({
    attributes: ['updatedAt', 'userId', 'accountId', 'currency', 'remarks', 'refNo', 'txnType', 'status',
    'closingBalance', 'openingBalance', 'transactionAmount'],
    where: {userId: userId},
    order: [['updatedAt', 'DESC']],
    offset: Number(offset) || 0,
    limit: Number(limit) || 10,
  });
  return stmnts;
};
