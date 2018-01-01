const unixpass = require('unixpass'),
	Args = require('pixl-args');

var args = new Args();

if (!args.get('pass')) {
	console.log("Usage: node passcrypt.js --pass password");
}
else {
	console.log(unixpass.mkpass(args.get('pass')));
}
