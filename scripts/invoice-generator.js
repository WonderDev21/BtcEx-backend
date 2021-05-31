const _ = require('lodash');
const numeral = require('numeral');
const {baseCurrency} = require('../config');
const moment = require('moment');
const Promise = require('bluebird');
const https   = require('https');
const path = require('path');
const fs      = require('fs');

const generateInvoice = function (invoice, filename) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(invoice);
    const options = {
        hostname  : 'invoice-generator.com',
        port      : 443,
        path      : '/',
        method    : 'POST',
        headers   : {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    const file = fs.createWriteStream(filename);
    const req = https.request(options, function(res) {
        res.on('data', function(chunk) {
            file.write(chunk);
        })
        .on('end', function() {
            file.end();
            resolve();
        });
    });
    req.write(postData);
    req.end();
    req.on('error', reject);
  });
};
const waitForMe = (time = 500) => new Promise((res, reject) => {
  setTimeout(res, time);
});
module.exports = async (invoices) => {
  _.forEach(invoices, async inv => {
    const invoice = {
      logo: 'http://172.104.36.253:9000/logo-1x.png',
      from: `Quicksilver Technologies Pvt. Ltd.\n
            C-1243,Ansal Esencia, Gurugram,\n Haryana - 122001\n
            PAN No: AAACQ4803C\n
            GSTIN: 06AAACQ4803C1ZZ`,
      to: `${inv[2]}\n
          PAN: ${inv[3]}\n
          ${inv[15]}\n
          ${inv[14]}`,
      currency: baseCurrency,
      number: `${inv[9]}/${inv[1]}`,
      date: inv[10],
      payment_terms: 'Auto-Billed',
      balance_title: 'Amount',
      to_title: 'To',
      items: [
          {
              name: `${inv[4]} ${inv[16] === 'BUY' ? 'Purchase' : 'Sell'}`,
              quantity: inv[6],
              unit_cost: inv[5]
          }
      ],
      tax_title: 'Trade Fee',
      shipping_title: 'CGST (9%) + SGST (9%)',
      discounts_title: 'Trade Fee inclusive of (GST 18%)',
      fields: {
          tax: inv[16] === 'BUY',
          shipping: inv[16] === 'BUY',
          discounts: inv[16] === 'SELL',
      },
      shipping: inv[16] === 'BUY' ? inv[12] : 0,
      tax: inv[16] === 'BUY'? inv[13] : 0,
      discounts: inv[16] === 'SELL' ? numeral(inv[12]).add(inv[13]).value() : 0,
      notes: 'Thanks for trading at Coinmint!',
      // terms: `${inv[16]} & ${numeral(inv[12]).add(inv[13] + 1).value()}`
    };
    const x = await generateInvoice(invoice, path.join(process.cwd(), `invoices/${inv[9]}.pdf`));
    await waitForMe(100);
  });
};
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
