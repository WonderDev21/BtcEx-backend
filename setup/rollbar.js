const Rollbar = require('rollbar');
module.exports = () => {
  var rollbar = new Rollbar({
    accessToken: '6f08f85b82c04916ab49535c7379a73f',
    captureUncaught: true,
    captureUnhandledRejections: true
  });
  // record a generic message and send it to Rollbar
  rollbar.log('App Restart!');
};
