const axios = require('axios');
const qs = require('qs');

const appConstants = require('../../config/index');
const {PG_ENDPOINTS} = require('../../constants/cashfree');
const {NODE_ENV} = require('../../setup/env');

class PaymentGateway {

  constructor() {
    const {PRODUCTION, TEST} = appConstants.CASHFREE_PAYMENT_GATEWAY;
    const {baseUrl, appId, secretKey} = NODE_ENV !== 'development' ? PRODUCTION : TEST;
    this.baseUrl = baseUrl;
    this.appId = appId;
    this.secretKey = secretKey;
  }

  // Method to get request options.
  getRequestOptions(url, data) {
    data.appId = this.appId;
    data.secretKey = this.secretKey;
    const reqOptions = {
      url: this.baseUrl + url,
      method: 'post',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      data: qs.stringify(data),
    };
    return reqOptions;
  }

  // Verifying Credentials
  async verifyCredentials() {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.CREDENTIALS_VERIFY, {});
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // To create orders
  async createOrder(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.ORDER_CREATE, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // To get order info
  async orderInfo(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.ORDER_INFO, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // Returns payment link for an existing order
  async orderInfoLink(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.ORDER_INFO_LINK, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // 	Returns payment status of an existing order
  async orderInfoStatus(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.ORDER_INFO_STATUS, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // Sends Email with payment link to the customer’s mailbox
  async orderEmail(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.ORDER_EMAIL, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // Can do partial/full refund of the payment made for the order
  async orderRefund(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.ORDER_REFUND, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // List the transactions
  async transactions(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.TRANSACTIONS, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // List the refunds
  async refunds(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.REFUNDS, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // Details of refund
  async refundDetails(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.REFUND, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // Fetch settlements processed on your CashFree Account
  async settlements(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.SETTLEMENTS, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }

  // 	Fetch transactions that are part of a settlement
  async settlement(data) {
    const reqOptions = this.getRequestOptions(PG_ENDPOINTS.SETTLEMENT, data);
    const resp = await axios(reqOptions);
    return resp.data;
  }
}

exports.paymentGateway = new PaymentGateway();
