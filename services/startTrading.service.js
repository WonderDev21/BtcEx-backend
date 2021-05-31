const orderService = require('./order.service');
const levelService = require('./level.service');
const logger = require('winston');

const startPrice = process.argv[2];
const endPrice = process.argv[3];
const side = process.argv[4];

const restartTrading = async () => {
  const allOrders = await orderService.getOrdersForRestartTrading(startPrice, endPrice, side);
  for(var i=0;i<allOrders.length;i++) {
    logger.info('Restart Trading for OrderId: ',allOrders[i].orderId );
    await orderService.restartTradingForOrder(allOrders[i]);
  }
};
restartTrading();
