var https = require('https');

var data = JSON.stringify({
 api_key: '39d25fc4',
 api_secret: '318ea424b5368ddd',
 to: '+919599622943',
 from: '441632960961',
 text: 'Hello from Nexmo'
});

var options = {
 host: 'rest.nexmo.com',
 path: '/sms/json',
 port: 443,
 method: 'POST',
 headers: {
   'Content-Type': 'application/json',
   'Content-Length': Buffer.byteLength(data)
 }
};

var req = https.request(options);

req.write(data);
req.end();

var responseData = '';
req.on('response', function(res){
 res.on('data', function(chunk){
   responseData += chunk;
 });

 res.on('end', function(){
   console.log(JSON.parse(responseData));
 });
});
