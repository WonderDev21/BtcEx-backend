const logger = require('winston');
const statementService = require('../services/statement.service');
const _ = require('lodash');

exports.getAccountStatement = async (req, res) => {
  const offset = Number(_.get(req, 'query.offset', 0));
  const limit = Number(_.get(req, 'query.limit', 10));
  try {
    const userId = req.params.userId;
    const statement = await statementService.getUserStatement(userId, offset, limit);
    res.status(200).send(statement);
  } catch(error) {
    logger.error('Error while fetching users account statment', error);
    res.status(400).send({message: 'Some error while getting users account statement', error: error});
  }
};
