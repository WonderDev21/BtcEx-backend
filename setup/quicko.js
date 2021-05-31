const axios = require('axios');

const {QUICKO} = require('../config/index');

/**
 * AUTHENTICATE: 'https://api.quicko.com/authenticate'
 * AUTHORIZE: 'https://api.quicko.com/authorize?request_token={{request_token}}'
 * VERIFY_PAN: 'https://api.quicko.com/pans/:pan/verify?consent={{consent}}&reason={{reason}}'
 */

class Quicko {
  constructor() {
    const {API_KEY, API_SECRET, BASE_URL} = QUICKO;
    this.apiKey = API_KEY;
    this.apiSecret = API_SECRET;
    this.baseUrl = BASE_URL;
    this.accessToken = null;

    this.authenticateUser();
  }

  async authenticateUser() {
    const reqOptions = {
      method: 'POST',
      url: this.baseUrl + '/authenticate',
      headers: {
        'x-api-key': this.apiKey,
        'x-api-secret': this.apiSecret,
        'x-api-version': '3.1'
      },
    };
    const resp = await axios(reqOptions);
    if (resp.data) {
      this.accessToken = resp.data.access_token;
    }
    return resp.data;
  }

  async verifyToken() {
    const reqOptions = {
      url: `${this.baseUrl}/authorize?request_token=${this.accessToken}`,
      method: 'post',
      headers: {
        'Authorization': this.accessToken,
        'x-api-key': this.apiKey,
        'x-api-version': '3.1'
      }
    };
    const resp = await axios(reqOptions);
    return resp.data;
  }

  async verifyPan(pan) {
    const reqOptions = {
      url: `${this.baseUrl}/pans/${pan}/verify?consent=Y&reason=For verifying BTCEx account`,
      method: 'get',
      headers: {
        'Authorization': this.accessToken,
        'x-api-key': this.apiKey,
        'x-api-version': '3.1'
      }
    };
    const resp = await axios(reqOptions);
    return resp.data;
  }

}

exports.quicko = new Quicko();
