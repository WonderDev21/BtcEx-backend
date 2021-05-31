const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tickerSchema = new Schema({
  time: Number,
  high: Number,
  low: Number,
  close: Number,
  open: Number,
  volume: Number,
  misc: Object,
});
module.exports = mongoose.model('Ticker', tickerSchema);
