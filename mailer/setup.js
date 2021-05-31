const inky = require('inky');
inky({
  src: './mailer.html',
  dest: './output',
}, () => {
  console.log('Done parsing.');
});
