const Promise = require('bluebird');
const logger = require('winston');
const Level = require('../models').models.Level;
const Order = require('../models').models.Order;
const {arrayToJSON, objectToJSON} = require('../utils/jsonUtils');

exports.addLevel = (requestData, t=null) => new Promise((resolve, reject) => {
  // console.log('Add Level',requestData);
  logger.info('New Level request for ', requestData);
  Level.findOrCreate({
    where: {
      $and:[
        {price: requestData.price},
        {side: requestData.side},
        {currency: requestData.currency},
      ]
    },
    transaction : t,
    defaults:{
      side: requestData.side,
      price: requestData.price,
      currency: requestData.currency,
      size: requestData.currentSize,
      orderQty: 1,
    }
  })
    .spread((level, created) => {
      // const Level = level.get({ plain: true });
      if(created){
        // console.log('Created Level', level.get({ plain: true }));
        logger.info('New Level Created ', level.get({plain: true}));
        resolve(level);
      } else {
        level.increment({size:requestData.currentSize, orderQty: 1},{transaction : t})
        .then(updatedLevel => {
          logger.info('Existing Level updated ', objectToJSON(updatedLevel));
          // console.log('Updated Level',objectToJSON(updatedLevel));
          resolve(updatedLevel);
        });
      }
    });
});

exports.findAndUpdatebyLevelId = async (levelId, updateData, t=null) => {
    const level = await Level.findOne({
      where: {levelId: levelId},
    });
    return objectToJSON(await level.decrement({size: updateData.size, orderQty: updateData.orderQty}, {transaction: t}));
};

exports.getLevelById = async levelId => {
  return objectToJSON(await Level.findOne({
    where: {levelId: levelId}
  }));
};

exports.getLevelByPriceAndSide = async requestData => {
  logger.info('Get Level By Price And Side');
  return arrayToJSON(await Level.findAll({
    where: {
      $and: [
        {price: requestData.side === 'SELL' ? {$lte: requestData.price} : {$gte: requestData.price}},
        {side: requestData.side},
        {orderQty: {$gte: parseInt(1)}},
      ]
    }
  }));
};

exports.updateLevelByPriceAndSide = async (data, t=null) => {
  const level = await Level.findOne({
    where: {
      price: data.price,
      side: data.side
    },
  });
  return objectToJSON(await level.decrement({size: data.size, orderQty: data.orderQty},{transaction: t}));
};

exports.getLevel = async ({price, side} , t=null) => {
  return objectToJSON(await Level.findOne({
    where: {
      price: price,
      side: side
    },
    transaction: t,
  }) || {});
};

exports.findOrdersForTrading = async (createdOrder, t = null) => {
  const orderPrice = createdOrder.price,
    orderSide = createdOrder.side,
    orderCurrency = createdOrder.currency;
  logger.info(`Finding Orders for Trading, orderId: ${createdOrder.orderId}`);
  const level = await Level.findAll({
    include: [{
      model: Order, as: 'orders',
      where: {status: 'PENDING', side: orderSide === 'BUY' ? 'SELL' : 'BUY',},
      order: [['createdAt','ASC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    }],
    where: {
      $and: [
        {price: orderSide === 'BUY' ? {$lte: orderPrice} : {$gte: orderPrice}},
        {side:  orderSide === 'BUY' ? 'SELL' : 'BUY',},
        {currency: orderCurrency},
        {orderQty: {$gte: 0.001}}
      ]
    },
    order: orderSide === 'BUY' ? [['price','ASC'],['createdAt','ASC']] : [['price','DESC'],['createdAt','ASC']],
  });
  return level.map(l => l.toJSON());
};

exports.updateLevel = async (levelId, data, t=null) => {
  const level = await Level.update(data,
  {
    where:{
      levelId: levelId,
    },
    transaction: t,
    lock: t.LOCK.UPDATE,
    returning: true,
    plain: true
  });
  // logger.info('Level Updated: ', objectToJSON(level[1]));
  return objectToJSON(level[1]);
};

exports.decrementSizeAndQty = async (levelId, size, orderQty, t=null) => {
  const levelDetails = await Level.findOne({
    where: {
      levelId: levelId,
    },
    transaction: t,
    lock: t.LOCK.UPDATE
  });
  return objectToJSON(await levelDetails.decrement({size: size, orderQty: orderQty}, {transaction: t}));
};
