const axios = require('axios');
const crypto = require('crypto');

const appConstants = require('../../config/index');
const {AC_ENDPOINTS} = require('../../constants/cashfree');
const {NODE_ENV} = require('../../setup/env');

class AutoCollect {
  constructor() {
    const {PRODUCTION, TEST} = appConstants.CASHFREE_AUTO_COLLECT;
    const {baseUrl, xClientId, xClientSecret} = NODE_ENV !== 'development' ? PRODUCTION : TEST;
    this.baseUrl = baseUrl;
    this.xClientId = xClientId;
    this.xClientSecret = xClientSecret;
    this.authorization = null;
  }

  async authenticateUser() {
    const reqOptions = {
      url: this.baseUrl + AC_ENDPOINTS.AUTHENTICATE,
      method: 'post',
      headers: {
        'X-Client-Id': this.xClientId,
        'X-Client-Secret': this.xClientSecret
      },
    };
    const resp = await axios(reqOptions);
    if (resp.data.data) {
      this.authorization = resp.data.data.token;
    }
    return resp.data;
  }

  async verifyToken() {
    const reqOptions = {
      url: this.baseUrl + AC_ENDPOINTS.VERIFY_TOKEN,
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.authorization}`
      }
    };
    const resp = await axios(reqOptions);
    return resp.data;
  }

  async validateAuthToken() {
    const validResp = await this.verifyToken();
    if (validResp.subCode === '200') {
      return validResp;
    }
    const newAuthResp = await this.authenticateUser();
    if (newAuthResp.subCode !== '200') {
      return newAuthResp;
    }
    const newAuthValid = await this.verifyToken();
    return newAuthValid;
  }

  async createVA(data) {
    const reqOptions = {
      url: this.baseUrl + AC_ENDPOINTS.CREATE_VA,
      method: 'post',
      headers: {
        Authorization: `Bearer ${this.authorization}`
      },
      data
    };
    const resp = await axios(reqOptions);
    return resp.data;
  }

  async listAllVA(data) {
    const reqOptions = {
      url: this.baseUrl + AC_ENDPOINTS.ALL_VA,
      method: 'get',
      headers: {
        Authorization: `Bearer ${this.authorization}`
      },
      params: data
    };
    const resp = await axios(reqOptions);
    return resp.data;
  }

  verifySignature(postData) {
    if (postData != null && postData.signature !== undefined) {
      const keys = Object.keys(postData);
      const signature = postData.signature;
      keys.sort();
      let signatureData = '';

      keys.forEach((key) => {
        if (key !== 'signature') {
          signatureData += postData[key];
        }
      });

      const computedSignature = crypto.createHmac('sha256', this.xClientSecret).update(signatureData).digest('base64');

      if (computedSignature === signature) {
        return true;
      }
      return false;
    } else {
      return false;
    }
  }
}

exports.autoCollect = new AutoCollect();
