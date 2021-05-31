const _ = require('lodash');
const numeral = require('numeral');
const logger = require('winston');

exports.calculateIEOAmount = (ieoProject, rates, saleData) => {
  const {size} = saleData;
  const {symbol} = ieoProject;
  const configFileName = `${symbol.toLowerCase()}.js`;
  try {
    const configFile = require(`../ieoutils/${configFileName}`);
    if (size > 0) {
      return configFile.calculateAmount(ieoProject, rates, saleData);
    } else {
      return {success: false, message: `Invalid size ${size}`};
    }
  } catch(err) {
    return {success: false, message: `No config for ${symbol} IEO`};
  }
  // // const discount = bonuses
  // const saleObj = {};
  // if (size > 0 && rate > 0) {
  //   if (bonusPercent && bonusPercent < 1) {
  //     const bonusToken = numeral(bonusPercent).multiply(size).value();
  //     saleObj.bonus = bonusToken;
  //     saleObj.size = numeral(size).add(bonusToken).value();
  //   } else if(bonus) {
  //     saleObj.bonus = bonus;
  //     saleObj.size = numeral(size).add(bonus).value();
  //   }
  //   const subTotal = numeral(size).multiply(rate).value();
  //   if(discountPercent > 0 && discountPercent < 1) {
  //     const discount = numeral(discountPercent).multiply(subTotal).value();
  //     saleObj.discount = discountPercent;
  //     saleObj.totalAmt = numeral(subTotal).subtract(discount).value();
  //   } else {
  //     saleObj.totalAmt = subTotal;
  //   }
  //   logger.info('token sale obj: ', saleObj);
  //   return _.assign({}, saleData, saleObj);
  // }
};
