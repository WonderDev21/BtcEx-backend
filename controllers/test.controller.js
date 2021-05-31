const _ = require('lodash');
const logger = require('winston');
const orderService = require('../services/order.service');

exports.placeNewOrder = async (req, res) => {
    const newOrder = req.body;
    logger.info(`New Order Request from : userId: ${newOrder.userId}`);
    try {
      const placeOrderResponse = await orderService.placeOrder(newOrder);
      if(placeOrderResponse.status === 200){
        const {ordersForTrading, tradingResponse} = await orderService.startTrading(placeOrderResponse.createdOrder, placeOrderResponse.createdLevel);
        res.status(200).send({
          orderPlaced: placeOrderResponse.createdOrder,
          tradingResponse: tradingResponse
        });
      } else {
        logger.info('Test Order Placed Error', placeOrderResponse.data);
        res.status(400).send(placeOrderResponse.data);
      }
    } catch(error) {
        logger.info('Test Order Placed Error', error);
        res.status(400).send({error: error, message: 'Failed to place order'});
    }
};
