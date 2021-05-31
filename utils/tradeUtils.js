const numeral = require('numeral');
const moment =require('moment');
const {GST_RATE} = require('../config');// get from config.

const getUserfromInfo = (doc) => {
  const addressProof = doc.addressProof || {};
  const idProof = doc.idProof || {};
  const user = doc.user || {};
  const address = addressProof.flat + ', ' + addressProof.street + ', ' + addressProof.landmark + ', ' + addressProof.city + ', ' + addressProof.state + ', ' + addressProof.pinCode;
  return {customerId: user.customerId, name: user.fullName, pan: doc.panNumber || idProof.panNumber, address: address, phone: user.phone, email: user.email};
};
exports.getBuyerTradeDataForInvoice = (buyer, trade) => {
  const charged = parseFloat(numeral(trade.size).multiply(trade.price).value()).toFixed(2);
  const invNo = `INV-B-${trade.currency}-${trade.refId}`;
  const date = moment(trade.createdAt).format('DD/MM/YYYY HH:MM a');
  const taxRate = 'CGST (9.00%) + SGST (9.00%)';
  const tradeFee = parseFloat(numeral(trade.buyerFee).multiply(100).divide(GST_RATE + 100).value()).toFixed(2);
  const totalTax = parseFloat(numeral(tradeFee).multiply(GST_RATE).divide(100).value()).toFixed(2);

  const x = {...getUserfromInfo(buyer), ...{invNo, refNo: trade.refNo, date, currency: trade.currency, side: 'BUY', volume: trade.size, rate: trade.price, charged, buyerFee: trade.buyerFee, taxRate, totalTax, tradeFee}};
  return x;
};
exports.getSellerTradeDataForInvoice = (seller, trade) => {
  const charged = parseFloat(numeral(trade.size).multiply(trade.price).value()).toFixed(2);
  const invNo = `INV-S-${trade.currency}-${trade.refId}`;
  const date = moment(trade.createdAt).format('DD/MM/YYYY HH:MM a');
  const taxRate = 'CGST (9.00%) + SGST (9.00%)';
  const tradeFee = parseFloat(numeral(trade.sellerFee).multiply(100).divide(GST_RATE + 100).value()).toFixed(2);
  const totalTax = parseFloat(numeral(tradeFee).multiply(GST_RATE).divide(100).value()).toFixed(2);

  const x = {...getUserfromInfo(seller), ...{invNo, refNo: trade.refNo, date, currency: trade.currency, side: 'SELL', volume: trade.size, rate: trade.price, charged, buyerFee: trade.buyerFee, taxRate, totalTax, tradeFee}};
  return x;
};
