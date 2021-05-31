const express = require('express');
const multer = require('multer');

const tickerController = require('./controllers/ticker.controller');

const router = express.Router();
/* MONGO ROUTES */
router.get('/ticker', tickerController.getTicker);
router.post('/addTicker', tickerController.initTickerWithData);
router.get('/new', tickerController.addOrUpdateTicker);
module.exports = router;
