var chai = require('chai');
var chaiSubset = require('chai-subset');
var Promise = require('bluebird');
var _ = require('lodash');
var request = require("supertest-as-promised");
const orders = require('./orders.json');

function trade(allOrders = [], userOrder) {
    const orderSize = allOrders.length;
    const totalOrderSize = parseInt(userOrder.currentSize) + parseInt(userOrder.filledSize);
    for(let i=0; i < orderSize; i++) {
        console.log(`in loop ${i}`);
        const unitTraded = parseInt(userOrder.currentSize) > parseInt(allOrders[i].currentSize) ? parseInt(allOrders[i].currentSize) : parseInt(allOrders[i].currentSize);
        userOrder.currentSize = parseInt(userOrder.currentSize) - unitTraded;
        userOrder.filledSize = parseInt(allOrders[i].currentSize) + parseInt(userOrder.filledSize);
        if (userOrder.currentSize < 0) {
            userOrder.currentSize = 0;
            userOrder.status = 'TRADED';
        }
        if(userOrder.filledSize > totalOrderSize) {
            userOrder.filledSize = totalOrderSize;
        }
        const traderOrder = allOrders[i];
        traderOrder.filledSize = unitTraded + parseInt(traderOrder.filledSize);
        traderOrder.currentSize = parseInt(traderOrder.currentSize) - unitTraded;

        if(userOrder.currentSize === 0) {
            console.log('DONE!!!');
            console.log(userOrder, traderOrder);
            break;
        }
    }
}

describe('TEST trading on platform', function() {

  it('should do trading', function(done) {
    const a = _.groupBy(orders, 'price');
    const ord = a[80];
    const myOrder = {
      "orderId": "20b363e9-06d6-4ea6-9568-ce52efbf84",
      "price": 80,
      "currentSize": 0,
      "filledSize": 5,
      "userId": "f889036d-ef19-4457-aa62-7a7f4144cdbd",
      "side": "BUYER"
    };
    const myOrder2 = {
      "orderId": "20b33e9-06d6-4ea6-9568-ce52e30fbf84",
      "price": 80,
      "currentSize": 5,
      "filledSize": 0,
      "userId": "f8896d-ef19-4457-aa62-7a7f4144dbd",
      "side": "BUYER"
    };
    const myOrder3 = {
      "orderId": "20b363e9-06d6-4e6-9568-ce52e30bf84",
      "price": 80,
      "currentSize": 1,
      "filledSize": 3,
      "userId": "f889036d-ef19-4457-aa62-7a7f444cdbd",
      "side": "BUYER"
    }
    console.log(ord);
    console.log('Order passed');
    trade(ord, myOrder2);
    console.log('Another order');
    trade(ord, myOrder3);
    console.log('Another order');
    trade(ord, myOrder1);
    // done();
  })
});
