const _ = require('lodash');
const numeral = require('numeral');
/*
bonus = [
  {percent: 20, currency: 'USD', minAmount: 200}
  {percent: 15, currency: 'USD', minAmount: 100}
  {percent: 10, currency: 'USD', minAmount: 25}
  {percent: 5, currency: 'USD', minAmount: 15}
]
minPurchase = { currency: 'USD', amount: 200 }
maxPurchase = { currency: 'USD', amount: 400 }

rates: {"ETH": {"price":209.1},"LTC":{"price":88.7},"BTC":{"price":9485},"BXC":{"price":0.3}}
*/
exports.calculateAmount = (ieoProject, rates, saleData) => {
  /* Everything is in ieoUnitCurrency */
  const {size, purchaseCurrency} = saleData; // purchaseCurrency = BTC/ETH/USD etc.
  const {minPurchase, unitPrice, bonuses, ieoUnitCurrency} = ieoProject;

  if(purchaseCurrency !== ieoUnitCurrency) { // since purchase=BTC, ieoUnitCurrency = USD
    const baseCoinRate = _.get(rates, `[${purchaseCurrency}].price`, null);
    if(!baseCoinRate) {
      return {success: false, message: `Purchase currency ${purchaseCurrency} not supported`};
    }
    const subTotal = numeral(size).multiply(unitPrice).value();
    if(size < minPurchase) {
      return {success: false, message: `Minimum quantity should be ${minPurchase}`};
    }
    const appliedBonus = bonuses.find(bonus => {
      if(subTotal >= bonus.minAmount) {
        return bonus;
      }
    });
    if(!appliedBonus) {
      const totalAmountConverted = numeral(subTotal).divide(baseCoinRate || 1).value();
      return {success: true, discount: 0, amount: totalAmountConverted};
    }
    const {percent} =  appliedBonus;
    const discount = numeral(percent).divide(100).multiply(subTotal).value();
    const totalAmount = numeral(subTotal).subtract(discount).value();
    const discountConverted = numeral(discount).divide(baseCoinRate || 1).value();
    const totalAmountConverted = numeral(totalAmount).divide(baseCoinRate || 1).value();
    return {success: true, discount: discountConverted, amount: totalAmountConverted};
  }
};
