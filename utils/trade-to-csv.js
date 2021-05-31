const _ = require('lodash');
const numeral = require('numeral');
const moment = require('moment');
const Promise = require('bluebird');
const https   = require('https');
const path = require('path');
const fs      = require('fs');
/*
 User ID
Transaction ID
Currency name
Customer Name
INR charged
Transaction fees
Invoice no, date, time
Place of supply
Rate and Amount of Taxes Charged
Authorised Person
HSN / SAC Code
*/
const RATE = 18; // 18 % cgst + sgst

module.exports = (buyers, sellers) => {
  const obj = [];
  _.forEach(buyers, buyer => {

    const charged = parseFloat(numeral(buyer.size).multiply(buyer.price).value()).toFixed(2);
    const invNo = `INV-B-${buyer.currency}-${buyer.refId}`;
    const time = moment(buyer.createdAt).format('DD/MM/YYYY HH:MM a');
    const taxRate = 'CGST (9.00%) + SGST (9.00%)';

    const tradeFee = parseFloat(numeral(buyer.buyerFee).multiply(100).divide(RATE + 100).value()).toFixed(2);
    const totalTax = parseFloat(numeral(tradeFee).multiply(RATE).divide(100).value()).toFixed(2);
    obj.push([buyer.customerId, buyer.refNo, buyer.fullName, buyer.pan, buyer.currency, buyer.price, buyer.size, charged, buyer.buyerFee, invNo, time, taxRate, totalTax, tradeFee, buyer.email, buyer.phone, 'BUY']);
  });

  _.forEach(sellers, buyer => {
    const charged = parseFloat(numeral(buyer.size).multiply(buyer.price).value()).toFixed(2);
    const invNo = `INV-S-${buyer.currency}-${buyer.refId}`;
    const time = moment(buyer.createdAt).format('DD/MM/YYYY HH:MM a');
    const taxRate = 'CGST (9.00%) + SGST (9.00%)';
    const tradeFee = parseFloat(numeral(buyer.sellerFee).multiply(100).divide(RATE + 100).value()).toFixed(2);
    const totalTax = parseFloat(numeral(tradeFee).multiply(RATE).divide(100).value()).toFixed(2);
    obj.push([buyer.customerId, buyer.refNo, buyer.fullName, buyer.pan, buyer.currency, buyer.price, buyer.size, charged, buyer.sellerFee, invNo, time, taxRate, totalTax, tradeFee, buyer.email, buyer.phone, 'SELL']);
  });
  return obj;
};

