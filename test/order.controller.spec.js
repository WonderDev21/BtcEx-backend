var chai = require('chai');
var chaiSubset = require('chai-subset');
var Promise = require('bluebird');
var _ = require('lodash');
var request = require("supertest-as-promised");
var { app, sequelize } = require('../index');

chai.use(chaiSubset);
var expect = chai.expect;

var fakeOrdersData = require('./orders.json');
var method = require('../utils/order.utils.js');

describe('order Controller', function () {
  before(function(done) {
    setTimeout(() => done(), 2000);
  })
  it('test place order method', function (done) {
    const orders = fakeOrdersData.orders;
    const buyer = {
        side: "BUY",
        price: 86,
        currentSize: 5,
        filledSize: 0,
        type: "GTC",
        status: "PENDING"
    }
    const result = method.getOrderForTrade(orders, buyer);
    console.log('result', result);
    done();
  });
  it('should place new order', function (done) {
    const orders = fakeOrdersData.orders;
    const id = '123456';
    const promiseArr = [];
    orders.forEach((order) => promiseArr.push(request(app).post(`/order/neworder/${id}`).send(order)))
    Promise.all(promiseArr)
    .then((placedOrders) => {
      placedOrders.forEach((res, index) => {
        expect(res.status).to.equal(201);
        expect(res.body).to.be.ok;
        expect(res.body).to.containSubset(orders[index]);
      })
      done();
    })
  });
  it('should return all orders', function(done) {
    request(app).get('/orders')
    .end((err, res) => {
         if (err) {
           expect(true).to.be.false;
         }
         expect(res.status).to.equal(201);
         done();
   });
  });
  it('should return orders with given userId', function(done) {
    const userId = '123456'; // pass valid id
    request(app).get(`/orders/${userId}`)
    .end((err, res) => {
        if(err) {
            expect(true).to.be.false;
        }
        expect(res.status).to.equal(201);
        done();
    });
  });
});


