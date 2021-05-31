const _ = require('lodash');

const {CURRENCY_LIMITS, UCI_DATA} = require('../constants/coninMarketCap');
const {baseCurrency, CURRENCY} = require('../config');
const coinGecko = require('../services/coinGecko.service');
const coinmarketcap = require('../services/coinmarketcap.service');
const tradeServices = require('../services/trade.service');

const calculatePercentChange = async () => {
  const result = {};
  const currencies = Object.keys(CURRENCY);
  for (const currency of currencies) {
    if (currency !== baseCurrency) {
      const lastTrade = await tradeServices.getCurrencyLastTrade(currency);
      const before24HrsPrice = await tradeServices.get24HrsTrades(currency);
      const percentChange = ((Number(lastTrade.price) - Number(before24HrsPrice.price)) * 100) / (Number(before24HrsPrice.price) || 1);
      result[currency] = {
        percentChange: Number(Number(percentChange).toFixed(2))
      };
    }
  }
  return result;
};

const getLatestPrice = async () => {
  const finalRes = [];
  const currencies = Object.keys(CURRENCY);
  for (const currency of currencies) {
    if (currency !== baseCurrency) {
      const latestPrice = await coinmarketcap.getLatestPrice(currency);
      finalRes.push(latestPrice);
    }
  }
  return finalRes;
};

// eslint-disable-next-line max-statements
exports.getSummary = async (req, res) => {
  let startTime = null;
  let endTime = null;
  if (+req.query.startTime) {
    startTime = +req.query.startTime;
  } else {
    startTime = (new Date() - (24 * 60 * 60 * 1000));
  }

  if (+req.query.endTime) {
    endTime = +req.query.endTime;
  } else {
    endTime = new Date();
  }

  const currency = req.query.currency || null;
  try {
    const latestPrice = await getLatestPrice();

    const bidAndAsk = await coinmarketcap.getBidAndAsk(currency, startTime, endTime);
    const highAndLow = await coinmarketcap.getHighAndLow(currency, startTime, endTime);
    const sellerVolume = await coinmarketcap.getSellerVolume(currency, startTime, endTime);
    const buyerVolume = await coinmarketcap.getBuyerVolume(currency, startTime, endTime);
    const percentChanges = await calculatePercentChange();

    const combineArray = [...latestPrice, ...bidAndAsk, ...highAndLow, ...sellerVolume, ...buyerVolume];
    const groupedCurrency = _.groupBy(combineArray, 'target_currency');
    const data = [];
    Object.keys(groupedCurrency).forEach(key => {
      let mergeItems = {
        ticker_id: null,
        base_currency: baseCurrency,
        target_currency: null,
        last: 0,
        base_volume: 0,
        quote_volume: 0,
        percentChange: 0,
        highestBid: 0,
        lowestAsk: 0,
        high24hr: 0,
        low24hr: 0,
        isFrozen: 0,
      };
      const combineObjects = {};
      groupedCurrency[key].forEach(item => {
        Object.keys(item).forEach(itemKey => {
          if (combineObjects[itemKey] === undefined) {
            combineObjects[itemKey] = item[itemKey];
          }
        });
      });
      data.push(Object.assign({}, mergeItems, combineObjects));
    });
    data.forEach(item => {
      item.ticker_id = `${item.base_currency}_${item.target_currency}`;
      item.percentChange = percentChanges[item.target_currency].percentChange || 0;
    });
    const groupItem = _.groupBy(data, 'ticker_id');
    const finalRes = {};
    for (let key in groupItem) {
      if (finalRes[key] === undefined) {
        finalRes[key] = groupItem[key][0];
      }
    }
    res.status(200).send(finalRes);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};

exports.getAssets = async (req, res) => {
  const data = {};
  const extraData = {
    can_withdraw: true,
    can_deposit: true,
    maker_fee: 0.1,
    taker_fee: 0.1,
  };
  try {
    for(const key in CURRENCY) {
      if (CURRENCY[key] && CURRENCY[key] !== baseCurrency) {
        data[key] = Object.assign({}, extraData, {
          name: UCI_DATA[key].name,
          unified_cryptoasset_id: UCI_DATA[key].id,
          min_withdraw: CURRENCY_LIMITS[key].MIN_WITHDRAW,
          max_withdraw: CURRENCY_LIMITS[key].MAX_WITHDRAW,
        });
      }
    }
    res.status(200).send(data);
  } catch (err) {
    res.status(400).send(err);
  }
};

// eslint-disable-next-line max-statements
exports.getTickers = async (req, res) => {
  let startTime = null;
  let endTime = null;
  if (+req.query.startTime) {
    startTime = +req.query.startTime;
  } else {
    startTime = new Date() - (24 * 60 * 60 * 1000);
  }

  if (+req.query.endTime) {
    endTime = +req.query.endTime;
  } else {
    endTime = new Date();
  }

  const currency = req.query.currency;
  try {
    const latestPrice = await coinGecko.getLatestPrice(currency, startTime, endTime);
    const latestPriceGroupedByCurrency = _.groupBy(latestPrice, 'target_currency');
    const lastPrice = [];
    Object.keys(latestPriceGroupedByCurrency).forEach(priceItem => {
      if (latestPriceGroupedByCurrency[priceItem]) {
        lastPrice.push(latestPriceGroupedByCurrency[priceItem][0]);
      }
    });
    // const bidAndAsk = await coinmarketcap.getBidAndAsk(currency, startTime, endTime);
    // const highAndLow = await coinmarketcap.getHighAndLow(currency, startTime, endTime);
    const sellerVolume = await coinmarketcap.getSellerVolume(currency, startTime, endTime);
    const buyerVolume = await coinmarketcap.getBuyerVolume(currency, startTime, endTime);

    const combineArray = [...lastPrice, ...sellerVolume, ...buyerVolume];
    const groupedCurrency = _.groupBy(combineArray, 'target_currency');
    const data = [];
    Object.keys(groupedCurrency).forEach(key => {
      let mergeItems = {
        base_id: null,
        quote_id: null,
        ticker_id: null,
        base_currency: baseCurrency,
        target_currency: null,
        last_price: 0,
        base_volume: 0,
        quote_volume: 0,
      };
      const combineObjects = {};
      groupedCurrency[key].forEach(item => {
        Object.keys(item).forEach(itemKey => {
          if (combineObjects[itemKey] === undefined) {
            combineObjects[itemKey] = item[itemKey];
          }
        });
      });
      data.push(Object.assign({}, mergeItems, combineObjects));
    });
    data.forEach(item => {
      item.ticker_id = `${item.base_currency}_${item.target_currency}`;
      item.base_id = UCI_DATA[item.base_currency].id;
      item.quote_id = UCI_DATA[item.target_currency].id;
      item.type = item.target_currency === 'BXC' ? 'perpetual' : 'spot';
      item.isFrozen = 0;
      item.open_interest = 0;
      item.funding_rate = 0;
    });
    const groupItem = _.groupBy(data, 'ticker_id');
    const finalRes = {};
    for (let key in groupItem) {
      if (finalRes[key] === undefined) {
        finalRes[key] = groupItem[key][0];
      }
    }
    res.status(200).send(finalRes);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};

exports.getOrderbook = async (req, res) => {
  const {market_pair} = req.params;
  const {depth=100, level} = req.query;
  try {
    const target_currency = market_pair.split('_')[1];
    const bids = await coinGecko.getBids(target_currency, depth / 2);
    const modifiedBids = bids.map(bid => [bid.price, (+bid.currentSize + +bid.filledSize)]);
    const asks = await coinGecko.getAsks(target_currency, depth / 2);
    const modifiedAsks = asks.map(ask => [ask.price, (+ask.currentSize + +ask.filledSize)]);
    const finalRes = {
      market_pair,
      timestamp: Date.now(),
      bids: modifiedBids,
      asks: modifiedAsks,
    };
    res.status(200).send(finalRes);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};

exports.getTrades = async (req, res) => {
  const {market_pair} = req.params;
  const {limit = 20, type, start_time, end_time} = req.query;
  try {
    const target_currency = market_pair.split('_')[1];
    const trades = await coinmarketcap.getTrades(target_currency, limit, type, start_time, end_time);
    trades.forEach(item => {
      item.base_volume = '1';
      item.type = item.buyTrade.type;
      delete item.buyTrade;
    });
    res.status(200).send(trades);
  } catch(error) {
    console.log(error);
    res.status(400).send(error);
  }
};
