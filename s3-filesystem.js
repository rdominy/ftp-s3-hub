const {FtpSrv, FileSystem} = require('ftp-srv'),
	PassThrough = require('stream').PassThrough,
	EventEmitter = require('events'),
	AWS = require('aws-sdk'),
	path = require('path'),
	mime = require('mime-types'),
	Tools = require('pixl-tools');


var awsConfig = null;
var s3 = null;

class S3FileSystem extends FileSystem {
	constructor(config, connection, options) {
		super(connection, options);
		this.config = config;
		this.emitter = new EventEmitter();
	}

	static initModule(awsConfig) {
		awsConfig = new AWS.Config(awsConfig);
		s3 = new AWS.S3();
	}

	on(eventName, callback) {
		this.emitter.on(eventName, callback);
	}

	baseName(fileName) {
		var fullPath = "";
		var dateArgs = Tools.getDateArgs(new Date());

		if (this.config.path) {
			fullPath = Tools.substitute(this.config.path, dateArgs);
		}

		if (this.config.fileName) {
			fullPath += Tools.substitute(this.config.fileName, dateArgs);
		}
		else {
			var matches = fileName.match(/([\w\.\-]+)$/);
			fullPath +=  (matches && matches.length>1) ?  matches[1] : 'unknown.txt';
		}

		return fullPath;
	}

	write(fileName, {append = false, start = undefined} = {}) {
		var self = this;
		var passThroughStream = new PassThrough();

		passThroughStream.once('close', () => {
			passThroughStream.end();
		});

		var contentType = mime.lookup(fileName);
		if (!contentType) {
			contentType = 'application/octet-stream';
		}

		var params = {
			Bucket: this.config.Bucket,
			Key: this.baseName(fileName),
			Body: passThroughStream,
			ContentType: contentType,
			ACL: this.config.ACL
		};

		s3.upload(params, function(err, data){
			if (err) {
				self.emitter.emit('upload', params.Key, false, JSON.stringify(err));
			}
			else {
				self.emitter.emit('upload', params.Key, true);
			}
		});

		return passThroughStream;
	}


}

module.exports = S3FileSystem;
