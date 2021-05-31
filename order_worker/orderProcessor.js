const queue = require('../setup/order.kue.js');
const orderService = require('../services/order.service');
const logger = require('winston');

const placeOrder = async (newOrder) => {
  try {
    const placeOrderResponse = await orderService.placeOrder(newOrder);
    if (placeOrderResponse.status === 200) {
      logger.info('Trading Check for Order', placeOrderResponse.createdOrder.orderId);
      const tradingRespone = await orderService.startTrading(placeOrderResponse.createdOrder, placeOrderResponse.createdLevel);
      logger.info('Order Placed Success', placeOrderResponse.createdOrder);
      return placeOrderResponse.createdOrder;
    } else {
      logger.error('Order Placed Error', placeOrderResponse.data);
      return placeOrderResponse.data;
    }
  } catch(error) {
    logger.error('Failed to Place Order', error);
    return error;
  }
};
const cancelOrder = async (orderId) => {
  try {
    const resp = await orderService.cancelOrder(orderId);
    return resp;
  } catch(error) {
    return error;
  }
};
const startOrderProcessor = () => {
  console.log('Processor running');
  queue.process('order', async function(job, done) {
    console.log('New Job to process', job.data);
    if (job.data.jobType === 'CANCEL_ORDER') {
      try {
        const resp = await cancelOrder(job.data.orderId);
        logger.info('Order Cancel success', resp);
        done();
      } catch(error) {
        logger.error('Order Cancel Failed', error);
        done(error);
      }
    } else {
      try {
        const order = await placeOrder(job.data);
        logger.info('Order processed', order);
        done();
      } catch(error) {
        logger.error('Order Placing Failed', error);
        done(error);
      }
    }
  });
};
module.exports = startOrderProcessor;
