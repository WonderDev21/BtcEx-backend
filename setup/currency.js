const redisService = require('../services/redis.service');
const config = require('../config');
const redisConstants = require('../constants/redisConstants');
exports.getSupportedCurrencies = async () => {
  const val = await redisService.getValue(redisConstants.SUPPORTED_CURRENCIES);
  return val || Object.keys(config.CURRENCY);
};
