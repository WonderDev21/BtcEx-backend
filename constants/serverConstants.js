exports.verificationEmailOptions = {
  senderEmail: 'no-reply@btcex.pro',
  infoEmail: 'info@btcex.pro',
  notificationEmail: 'notification@btcex.pro',
  senderName: 'BtcEX',
  host: 'smtp.zoho.com',
  port: 465,
  auth: {
    user: 'no-reply@coinmint.in',
    pass: '12345678',
  },
  subject: 'Account Verification',
};
exports.gatewayCharges = {
  RAZORPAY: {percent: 2, flat: 0, extra: 0},
};
exports.graphAPI = {
  ETH: {url: 'https://etherchain.org/api/statistics/price'},
};
