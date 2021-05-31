import it from 'ava';
var chai = require('chai');
var chaiSubset = require('chai-subset');
var Promise = require('bluebird');
var _ = require('lodash');
const numeral = require('numeral');
var request = require("supertest-as-promised");
var { SERVER_ACCOUNT } = require('../config');
var { app, sequelize } = require('../index');
const serverAccountId = SERVER_ACCOUNT.userId;

chai.use(chaiSubset);
var expect = chai.expect;
let serverAccount = null;
const faker = require('faker');
const costApplied = 0.5;

const getOrder = (orderPrice, currentSize, filledSize, account, side) => ({
    "orderId": faker.random.uuid(),
    "price": orderPrice || 100,
    "currentSize": currentSize || 2,
    "filledSize": filledSize || 0,
    "userId": faker.random.uuid(),
    "side": side || "SELL",
    "name": faker.name.findName(),
    "status": "PENDING",
    "currency": "ETH",
    "time": faker.date.past(),
    "account": account || [
      { "currency": "INR", "value": 40},
      { "currency": "ETH", "value": 6}
    ]
});

it('1. Should run', async function(t) {
  console.log('w8 2 sec');
  var p = new Promise((res, rej) => {
    sequelize.sync({force: true})
    .then(() => {
      require('../controllers/').createServerAccount(serverAccountId)
      .then(() => {
        res('SYNCED');
      });
    })
  });
  const x = await p;
  console.log(x);
  t.is(1, 1);
});

  it('2. exact match', async function(t) {
    
        const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
        const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
        const orders = [getOrder(100, 2, 0, buyerAccount, 'BUY'), getOrder(100, 2, 0, sellerAccount, 'SELL')];
        
        // create account
        const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
        const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
        
        // serverAccount = await request(app).post(`/account/new/${serverAccountId}`);
        
        // // update account
        const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
        const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
        const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
        const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));

        // // then place order
        const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
        t.is(buyer_order.status, 201);
        const seller_order = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
        t.is(seller_order.status, 201);

        const expectedBuyerAccount = [{ "currency": "INR", "value": 299},{ "currency": "ETH", "value": 2}];
        const expectedSellerAccount = [{ "currency": "INR", "value": 239},{ "currency": "ETH", "value": 4}];
        const expectedServerAccount = [{ "currency": "INR", "value": 2},{ "currency": "ETH", "value": 0}];
        
        // get user account, get server account
        const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
          var o1 = outputBuyerAccount.body;
          expectedBuyerAccount.forEach((ex) => {
              var match = o1.find(function(ele) {
              return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
            });
            // console.log('this is match......', match);
            // console.log('return boolean...', !_.isEmpty(match));
            t.true(!_.isEmpty(match));
          });
        const outputSellerAccount = await request(app).get(`/user/${orders[1].userId}/balance`);  
          var o2 = outputSellerAccount.body;
          expectedSellerAccount.forEach((ex) => {
              var match = o2.find(function(ele) {
              return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
            });
            t.true(!_.isEmpty(match));
          });
        const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
          var o3 = outputServerAccount.body;
          expectedServerAccount.forEach((ex) => {
              var match = o3.find(function(ele) {
              return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
            });
            t.true(!_.isEmpty(match));
          });
      // get trades
    });

    it('3. price overlaps, seller will get best choice', async function(t) {
        const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
        const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
        const orders = [getOrder(90, 2, 0, buyerAccount, 'BUY'), getOrder(80, 2, 0, sellerAccount, 'SELL')];
        
        // create account
        const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
        const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
        // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

        // // update account
        const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
        const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
        const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
        const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));

        // // then place order
        const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
        t.is(buyer_order.status, 201);
        const seller_order = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
        t.is(seller_order.status, 201);

        const expectedBuyerAccount = [{ "currency": "INR", "value": 319.1},{ "currency": "ETH", "value": 2}];
        const expectedSellerAccount = [{ "currency": "INR", "value": 219.1},{ "currency": "ETH", "value": 4}];
        const expectedServerAccount = [{ "currency": "INR", "value": 3.8},{ "currency": "ETH", "value": 0}];
        
        // get user account, get server account
        const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
          var o1 = outputBuyerAccount.body;
          expectedBuyerAccount.forEach((ex) => {
              var match = o1.find(function(ele) {
              return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
            });
            t.true(!_.isEmpty(match));
          });
        const outputSellerAccount = await request(app).get(`/user/${orders[1].userId}/balance`);  
          var o2 = outputSellerAccount.body;
          expectedSellerAccount.forEach((ex) => {
              var match = o2.find(function(ele) {
              return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
            });
            t.true(!_.isEmpty(match));
          });
        const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
          var o3 = outputServerAccount.body;
          console.log('Server Act1 : ', o3);
          expectedServerAccount.forEach((ex) => {
              var match = o3.find(function(ele) {
              return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
            });
            t.true(!_.isEmpty(match));
          });
      // get trades
    });

    it('4. overlaps, trade would not be happened', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const orders = [getOrder(80, 2, 0, buyerAccount, 'BUY'), getOrder(90, 2, 0, sellerAccount, 'SELL')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));

      // // then place order
      const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(buyer_order.status, 201);
      const seller_order = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(seller_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 339.2},{ "currency": "ETH", "value": 0}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 40},{ "currency": "ETH", "value": 4}];
      const expectedServerAccount = [{ "currency": "INR", "value": 164.6},{ "currency": "ETH", "value": 2}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          console.log('match is...', match);
          console.log('boolean value....', !_.isEmpty(match));
            t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o2 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
            t.true(!_.isEmpty(match));
        });
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o3 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
            t.true(!_.isEmpty(match));
        });

      // get trades
    });

it('5. exact match', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const sellerAccount2 = [{ "currency": "INR", "value": 30}, { "currency": "ETH", "value": 4}];
      const orders = [getOrder(100, 2, 0, sellerAccount, 'SELL'), getOrder(100, 2, 0, sellerAccount2, 'SELL'), getOrder(100, 2, 0, buyerAccount, 'BUY')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const seller_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(seller_order.status, 201);
      const seller_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(seller_order2.status, 201);
      const buyer_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(buyer_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 319.1},{ "currency": "ETH", "value": 2}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 40},{ "currency": "ETH", "value": 4}];
      const expectedSellerAccount2 = [{ "currency": "INR", "value": 30},{ "currency": "ETH", "value": 2}];
      const expectedServerAccount = [{ "currency": "INR", "value": 166.4},{ "currency": "ETH", "value": 4}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
            t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);  
        var o2 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
            t.true(!_.isEmpty(match));
        });
      const outputSellerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o3 = outputSellerAccount2.body;
        expectedSellerAccount2.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
            t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
            t.true(!_.isEmpty(match));
        });
      // get trades
    });

    it('6. overlap, buyer will come after 2 seller and he will be given best choice', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const sellerAccount2 = [{ "currency": "INR", "value": 30}, { "currency": "ETH", "value": 4}];
      const orders = [getOrder(90, 2, 0, sellerAccount, 'SELL'), getOrder(80, 2, 0, sellerAccount2, 'SELL'), getOrder(100, 2, 0, buyerAccount, 'BUY')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const seller_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(seller_order.status, 201);
      const seller_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(seller_order2.status, 201);
      const buyer_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(buyer_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 319.1},{ "currency": "ETH", "value": 2}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 219.1},{ "currency": "ETH", "value": 4}];
      const expectedSellerAccount2 = [{ "currency": "INR", "value": 189.2},{ "currency": "ETH", "value": 2}];
      const expectedServerAccount = [{ "currency": "INR", "value": 9},{ "currency": "ETH", "value": 4}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);  
        var o2 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o3 = outputSellerAccount2.body;
        expectedSellerAccount2.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      // get trades
    });

    it('7. overlap, buyer will get 1 ETH from each seller', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const sellerAccount2 = [{ "currency": "INR", "value": 30}, { "currency": "ETH", "value": 4}];
      const orders = [getOrder(90, 1, 0, sellerAccount, 'SELL'), getOrder(80, 1, 0, sellerAccount2, 'SELL'), getOrder(100, 2, 0, buyerAccount, 'BUY')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const seller_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(seller_order.status, 201);
      const seller_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(seller_order2.status, 201);
      const buyer_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(buyer_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 329.15},{ "currency": "ETH", "value": 2}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 129.55},{ "currency": "ETH", "value": 5}];
      const expectedSellerAccount2 = [{ "currency": "INR", "value": 109.6},{ "currency": "ETH", "value": 3}];
      const expectedServerAccount = [{ "currency": "INR", "value": 10.7},{ "currency": "ETH", "value": 4}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);  
        var o2 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o3 = outputSellerAccount2.body;
        expectedSellerAccount2.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      // get trades
    });

    it('8. exact match', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const buyerAccount2 = [{ "currency": "INR", "value": 400}, { "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const orders = [getOrder(100, 2, 0, buyerAccount, 'BUY'), getOrder(100, 2, 0, buyerAccount2, 'BUY'), getOrder(100, 2, 0, sellerAccount, 'SELL')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(buyer_order.status, 201);
      const buyer_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(buyer_order2.status, 201);
      const seller_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(seller_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 299},{ "currency": "ETH", "value": 2}];
      const expectedBuyerAccount2 = [{ "currency": "INR", "value": 199},{ "currency": "ETH", "value": 2}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 40},{ "currency": "ETH", "value": 4}];
      const expectedServerAccount = [{ "currency": "INR", "value": 14.7},{ "currency": "ETH", "value": 2}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputBuyerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o2 = outputBuyerAccount2.body;
        expectedBuyerAccount2.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);  
        var o3 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      // get trades
    });

    it('9. overlap, trade would not be happened', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const buyerAccount2 = [{ "currency": "INR", "value": 400}, { "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const orders = [getOrder(100, 2, 0, buyerAccount, 'BUY'), getOrder(100, 2, 0, buyerAccount2, 'BUY'), getOrder(105, 2, 0, sellerAccount, 'SELL')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(buyer_order.status, 201);
      const buyer_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(buyer_order2.status, 201);
      const seller_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(seller_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 299},{ "currency": "ETH", "value": 2}];
      const expectedBuyerAccount2 = [{ "currency": "INR", "value": 199},{ "currency": "ETH", "value": 0}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 40},{ "currency": "ETH", "value": 4}];
      const expectedServerAccount = [{ "currency": "INR", "value": 217.7},{ "currency": "ETH", "value": 2}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputBuyerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o2 = outputBuyerAccount2.body;
        expectedBuyerAccount2.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);  
        var o3 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      // get trades
    });

    it('10. overlap, seller comes after 2 buyers and he will get best choice', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const buyerAccount2 = [{ "currency": "INR", "value": 400}, { "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const orders = [getOrder(90, 2, 0, buyerAccount, 'BUY'), getOrder(100, 2, 0, buyerAccount2, 'BUY'), getOrder(90, 2, 0, sellerAccount, 'SELL')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(buyer_order.status, 201);
      const buyer_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(buyer_order2.status, 201);
      const seller_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(seller_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 319.1},{ "currency": "ETH", "value": 0}];
      const expectedBuyerAccount2 = [{ "currency": "INR", "value": 199},{ "currency": "ETH", "value": 0}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 239},{ "currency": "ETH", "value": 4}];
      const expectedServerAccount = [{ "currency": "INR", "value": 400.6},{ "currency": "ETH", "value": 2}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputBuyerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o2 = outputBuyerAccount2.body;
        expectedBuyerAccount2.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);  
        var o3 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      // get trades
    });

    it('11. overlap, seller will sell 1 ETH to each buyer', async function(t) {
      const buyerAccount = [{ "currency": "INR", "value": 500},{ "currency": "ETH", "value": 0}];
      const buyerAccount2 = [{ "currency": "INR", "value": 400}, { "currency": "ETH", "value": 0}];
      const sellerAccount = [{ "currency": "INR", "value": 40}, { "currency": "ETH", "value": 6}];
      const orders = [getOrder(90, 1, 0, buyerAccount, 'BUY'), getOrder(100, 1, 0, buyerAccount2, 'BUY'), getOrder(80, 2, 0, sellerAccount, 'SELL')];
      
      // create account
      const acc1 = await request(app).post(`/account/new/${orders[0].userId}`);
      const acc2 = await request(app).post(`/account/new/${orders[1].userId}`);
      const acc3 = await request(app).post(`/account/new/${orders[2].userId}`);
      // const serverAccount = await request(app).post(`/account/new/${serverAccountId}`);

      // // update account
      const updateUser1_0 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[0], {userId: orders[0].userId}));
      const updateUser1_1 = await request(app).put('/user/update').send(_.assign({}, orders[0].account[1], {userId: orders[0].userId}));
      const updateUser2_0 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[0], {userId: orders[1].userId}));
      const updateUser2_1 = await request(app).put('/user/update').send(_.assign({}, orders[1].account[1], {userId: orders[1].userId}));
      const updateUser3_0 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[0], {userId: orders[2].userId}));
      const updateUser3_1 = await request(app).put('/user/update').send(_.assign({}, orders[2].account[1], {userId: orders[2].userId}));

      // // then place order
      const buyer_order = await request(app).post(`/order/neworder/${orders[0].userId}`).send(orders[0]);
      t.is(buyer_order.status, 201);
      const buyer_order2 = await request(app).post(`/order/neworder/${orders[1].userId}`).send(orders[1]);
      t.is(buyer_order2.status, 201);
      const seller_order = await request(app).post(`/order/neworder/${orders[2].userId}`).send(orders[2]);
      t.is(seller_order.status, 201);

      const expectedBuyerAccount = [{ "currency": "INR", "value": 409.55},{ "currency": "ETH", "value": 0}];
      const expectedBuyerAccount2 = [{ "currency": "INR", "value": 299.5},{ "currency": "ETH", "value": 0}];
      const expectedSellerAccount = [{ "currency": "INR", "value": 239},{ "currency": "ETH", "value": 4}];
      const expectedServerAccount = [{ "currency": "INR", "value": 392.55},{ "currency": "ETH", "value": 2}];
      
      // get user account, get server account
      const outputBuyerAccount = await request(app).get(`/user/${orders[0].userId}/balance`);
        var o1 = outputBuyerAccount.body;
        expectedBuyerAccount.forEach((ex) => {
            var match = o1.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputBuyerAccount2 = await request(app).get(`/user/${orders[1].userId}/balance`);  
        var o2 = outputBuyerAccount2.body;
        expectedBuyerAccount2.forEach((ex) => {
            var match = o2.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      const outputSellerAccount = await request(app).get(`/user/${orders[2].userId}/balance`);  
        var o3 = outputSellerAccount.body;
        expectedSellerAccount.forEach((ex) => {
            var match = o3.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });  
      const outputServerAccount = await request(app).get(`/user/${serverAccountId}/balance`);
        var o4 = outputServerAccount.body;
        expectedServerAccount.forEach((ex) => {
            var match = o4.find(function(ele) {
            return ele.currency === ex.currency && numeral(ele.value).value() === ex.value;
          });
          t.true(!_.isEmpty(match));
        });
      // get trades
    });