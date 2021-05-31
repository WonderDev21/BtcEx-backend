module.exports = {
  // Misc
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',

  // Job-related constants
  DAILY_EMAIL: 'DAILY_EMAIL', // invoked recurringly for sending daily emails & sms
  DAILY_SMS: 'DAILY_SMS',
  JOB_CLEANUP: 'JOB_CLEANUP' // invoked recurringly to clean completed jobs from queue
};
