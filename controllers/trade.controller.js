const tradeService = require('../services/trade.service');
const _ = require('lodash');
const logger = require('winston');

exports.addNewTrade = async (req,res) => {
  try{
    const newTrade = await  tradeService.addNewTrade(req.body);
    res.status(200).send(newTrade);
  } catch(error) {
    res.status(400).send(error);
  }
};
exports.getTrades = async (req, res) => {
  try {
    const allTrades = await tradeService.getAllTrades();
    res.status(200).send(allTrades);
  } catch(error) {
    logger.info('Error getting trades', error);
    res.status(400).send({error: error, message: 'Error fetching trades'});
  }
};
exports.getUserTrades = async (req, res) => {
  const offset = _.get(req, 'query.offset', 0);
  try {
    const allTrades = await tradeService.getUserTrades(req.params.userId, offset);
    res.status(200).send(allTrades);
  } catch (err) {
    logger.info('Error fetching trades for user', err);
    res.send(400).send({error: err, message: 'Error while fetching trades'});
  }
};
exports.getAllCurrencyTrades = async(req, res) => {
  const limit = _.get(req, 'query.limit', 10);
  try {
    const allTrades = await tradeService.getAllCurrencyTrades(limit);
    res.status(200).send(allTrades);
  } catch(error) {
    logger.info('Error getting all trades admin', error);
    res.status(400).send({error: error, message: 'Error fetching trades'});
  }
};
exports.getAllTradesAdmin = async (req, res) => {
  const offset = _.get(req, 'query.offset', 0);
  const tradeId = _.get(req, 'query.tradeId', null);
  try {
    let allTrades = [];
    if (tradeId) {
      allTrades = await tradeService.getTradeById(tradeId);
    } else {
      allTrades = await tradeService.getAllTradesAdmin();
    }
    res.status(200).send(allTrades);
  } catch(error) {
    logger.info('Error getting all trades admin', error);
    res.status(400).send({error: error, message: 'Error fetching trades'});
  }
};
