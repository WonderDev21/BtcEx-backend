const Ticker = require('../models/ticker.model');
const moment = require('moment');
exports.initTickerWithData = async (ticker) => {
  const open = ticker.o;
  const close = ticker.c;
  const high = ticker.h;
  const low = ticker.l;
  const volume = ticker.v;
  const time = ticker.t;
  const arr = [];
  for (let i=0; i < open.length; i += 1) {
    const obj = {
      time: parseInt(time[i]),
      high: high[i],
      low: low[i],
      close: close[i],
      open: open[i],
      volume: volume[i],
    };
    arr.push(obj);
  }
  function onInsert(err, docs) {
    if (err) {
        console.log('Some error while adding data', err);
    } else {
        console.info('potatoes were successfully stored.', docs);
    }
  }
  const resp = await Ticker.collection.insert(arr, onInsert);
  return resp;
};
exports.getTicker = async (from, to) => {
  const ticker = await Ticker.find({
    time: {
      $gte: from,
      $lt: to
    }
  });
  return ticker;
};
exports.addOrUpdateTicker = async (trade) => {
  const date = parseInt(Date.parse(trade.createdAt)/1000);
  const diff = parseInt(date) % 86400;
  const time = parseInt(date) - diff;
  const tickerData = await Ticker.findOne({
    time: {
      $eq: time,
    }
  });
  const ticker = tickerData && tickerData.toObject();
  if (ticker) {
    // update
    const updatedTicker = {
      time: ticker.time,
      high: trade.price > ticker.high ? trade.price : ticker.high,
      low: trade.price < ticker.low ? trade.price : ticker.low,
      close: trade.price,
      volume: trade.size + ticker.volume,
    };
    return await Ticker.findOneAndUpdate({'_id': String(ticker._id)}, updatedTicker, {new: true});
  } else {
    const newTicker = {
      time: time,
      high: trade.price,
      low: trade.price,
      open: trade.price,
      close: trade.price,
      volume: trade.size,
    };
    return await Ticker.create(newTicker);
  }
};
