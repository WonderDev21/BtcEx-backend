const Order = require('../models').models.Order;
const _ = require('lodash');
const sequelize = require('../models');
const Sequelize = require('sequelize');
const orderService = require('../services/order.service');
const levelService = require('../services/level.service');
const tradeService = require('../services/trade.service');
const accountService = require('../services/account.service');
const orderUtils = require('../utils/order.utils');
const logger = require('winston');
const numeral = require('numeral');
const {currencyTypes} = require('../constants/orderConstants');
const orderQueue = require('../order_worker/orderQueue');
// const { NotificationTypes } = require('../constants/notificationConstants');
// const channel = require('../setup/channel.js');
// const { channelNames } = require('../constants/channelConstants');
// const globalQueue = channel.getChannel(channelNames.QUEUE);

exports.getAllOrders = async (req, res) => {
  const currency = _.get(req, 'query.currency', currencyTypes.ETH);
  try {
    const orders = await orderService.getCurrencyOrder(currency);
    res.status(200).send(orders);
  } catch(err) {
    res.status(400).send({error: err, message: `Error in fetching orders for ${currency}`});
  }
};
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await orderService.getAllOrdersAdmin();
    res.status(200).send(orders);
  } catch(err) {
    res.status(400).send(err);
  }
};

exports.getOrderByOrderId = async (req, res) => {
  try {
    const order = await orderService.getorderByOrderId(req.params.orderId);
    res.status(200).send(order);
  } catch(err) {
    res.status(400).send(err);
  }
};

exports.getOrdersByUserId = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByUserId(req.params.userId);
    res.status(200).send(orders);
  } catch(err) {
    res.status(400).send(err);
  }
};
exports.getUserPendingOrders = async (req, res) => {
  const currency = _.get(req, 'query.currency', currencyTypes.ETH);
  try {
    const orders = await orderService.getUserPendingOrders(req.params.userId, currency);
    res.status(200).send(orders);
  } catch(err) {
    res.status(400).send(err);
  }
};
/*
var enqueue = Queue(function (newOrder, callback) {
    logger.info('New Order Request from', newOrder.userId);
    // const placeOrderResponse = await orderService.placeOrder(newOrder);
    orderService.placeOrder(newOrder)
    .then(placeOrderResponse => {
      if (placeOrderResponse.status === 200) {
        logger.info('Trading  Start for Order', placeOrderResponse.createdOrder.orderId);
        orderService.startTrading(placeOrderResponse.createdOrder, placeOrderResponse.createdLevel)
        .then(() => {
          logger.info('Order Placed Success', placeOrderResponse.createdOrder);
          callback(200, placeOrderResponse.createdOrder);
        });
      } else {
        logger.error('Order Placed Error', placeOrderResponse.data);
        callback(400, placeOrderResponse.data);
      }
    });
});
*/
exports.placeNewOrder = async (req, res) => {
    const newOrder = req.body;
    logger.info(`New Order Request from: userId: ${newOrder.userId}`);
    const userId = _.get(req, 'user.userId', null);
    if (newOrder.userId !== userId) {
      logger.error(`PRIORITY-1: User ${userId} placing another userId: ${newOrder.userId} order`);
      return res.status(401).send({message: 'Your account might get suspended for such activity'});
    };
    try {
      const errorMsg = orderUtils.validateOrder(newOrder); // put order validations
      if (!errorMsg) {
        logger.info('Order is valid', newOrder);
        const isEligible = await accountService.checkUserTradeEligibility(newOrder);
        if (isEligible) {
            logger.info('User is eligible to place order');
            orderQueue.push(_.assign({}, newOrder, {title: `NEW ${newOrder.side} ORDER` , jobType: 'NEW_ORDER'}), function(err) {
            if (err) {
              res.status(400).send({message: 'Failed to place order', error: err});
            } else {
              res.status(200).send({message: 'Your order is enqueued'});
            }
          });
        } else {
          res.status(400).send({message: 'Not enough balance in users account'});
        }
      } else {
        res.status(400).send({message: errorMsg});
      }
    } catch(error) {
        logger.info('Order Placed Error', error);
        res.status(400).send({error: error, message: 'Failed to place order'});
    }
};
exports.cancelOrder = async function(req, res) {
  try {
    const userId = _.get(req, 'user.userId', null);
    const orderId = req.params.orderId;
    const order = await orderService.getorderByOrderId(orderId);
    if (order.userId === userId) {
      orderQueue.push(_.assign({}, {orderId: orderId, userId: userId}, {title: 'CANCEL ORDER', jobType: 'CANCEL_ORDER'}), function(err) {
        if (err) {
          res.status(400).send({message: 'Failed to cancel order', error: err});
        } else {
          res.status(200).send({message: 'Cancel request queued'});
        }
      });
    } else {
      res.status(401).send({message: 'Order is placed by another user', error: error});
    }
  } catch (error) {
    res.status(400).send({message: 'Error in order cancel', error: error});
  }
};

exports.updateOrder = async (req, res) => {
  try {
    logger.info('Update order request', req.body.orderDetails);
    const orderDetails = req.body.orderDetails;
    const updatedOrder = await orderService.updateOrder(orderDetails.orderId, orderDetails);
    res.status(200).send(updatedOrder);
  } catch(error) {
    logger.error('Error while updating order', error);
    res.status(400).send({message: 'Error in order cancel', error: error});
  }
};

exports.restartTrading = async (req,res) => {
  try{
    const orderResponse = await orderService.restartTrading(req.body.orders);
    res.status(200).send(orderResponse);
  } catch(error) {
     res.status(400).send({message: 'Error in order restart', error: error});
  }
};
