// Cashfree payment gateway endpoints.
exports.PG_ENDPOINTS = {
  CREDENTIALS_VERIFY: '/api/v1/credentials/verify',
  ORDER_CREATE: '/api/v1/order/create',
  ORDER_INFO: '/api/v1/order/info',
  ORDER_INFO_LINK: '/api/v1/order/info/link',
  ORDER_INFO_STATUS: '/api/v1/order/info/status',
  ORDER_EMAIL: '/api/v1/order/email',
  ORDER_REFUND: '/api/v1/order/refund',
  TRANSACTIONS: '/api/v1/transactions',
  REFUNDS: '/api/v1/refunds',
  REFUND: '/api/v1/refundStatus',
  SETTLEMENTS: '/api/v1/settlements',
  SETTLEMENT: '/api/v1/settlement',
};

// Cashfree Auto Collect endpoints
exports.AC_ENDPOINTS = {
  AUTHENTICATE: '/cac/v1/authorize',
  VERIFY_TOKEN: '/cac/v1/verifyToken',
  CREATE_VA: '/cac/v1/createVA', // Create Virtual Account
  EDIT_VA: '/cac/v1/editVA',
  ALL_VA: '/cac/v1/allVA',
};
