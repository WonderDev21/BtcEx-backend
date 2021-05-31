const tickerService = require('../services/ticker.service');
exports.getTicker = async (req, res) => {
  const from = req.query.from || 1454412703;
  const to = req.query.to || parseInt(Date.now()/1000);
  const ticker = await tickerService.getTicker(from, to);
  res.status(200).send(ticker);
};
exports.addOrUpdateTicker = async (req, res) => {
  const trade = req.body;
  try {
    const ticker = await tickerService.addOrUpdateTicker(trade);
    res.status(200).send(ticker);
  } catch(err) {
    res.status(400).send({msg: 'Some error while updating ticker', err: err});
  }
};
exports.initTickerWithData = async(req, res) => {
  const values = req.body;
  const ticker = await tickerService.initTickerWithData(values);
  res.status(200).send(ticker);
};
