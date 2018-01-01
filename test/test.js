const assert = require('assert'),
	AWS = require('aws-sdk'),
	FTP = require("jsftp"),
	PixlServer = require('pixl-server');

var gServer = null;

function datePath() {
	var now = new Date();
	var month = now.getMonth() + 1;
	month = "" + ((month<10) ? ("0" + month) : month);
	var day = now.getDate();
	day = "" + ((day<10) ? ("0" + day) : day);
	return now.getFullYear() + "/" + month + "/"+ day;
}

function createServer(done) {
	gServer = new PixlServer({
			__name: 'FTPS3Hub',
			__version: "1.0",

			config: {
					"log_dir": "/var/log",
					"log_filename": "ftptos3_test.log",
					"debug_level": 9,
					"debug": true,
					"echo": false,
					"WebServer": {
							"http_port": 8080,
							"http_htdocs_dir": "/var/www/html"
					},
					"FTPS3Hub": {
						"s3" : {
							"Bucket": "test.dominy.com",
							"ACL": "public-read"
						},
						"ftpLogLevel": "fatal",
						"users" : {
							"test": {
								"password": "$1$test$pi/xDtU5WFVRqYS6BMU8X/",
								"s3" : {
									"Bucket" : "test.dominy.com",
									"path" : "ftptos3/[yyyy]/[mm]/[dd]/",
									"fileName": "s3test.json",
									"ACL": "public-read"
								}
							},
							"floweruser": {
								"password": "$1$test$pi/xDtU5WFVRqYS6BMU8X/",
								"s3" : {
									"Bucket" : "test.dominy.com",
									"path" : "ftptos3/[yyyy]/[mm]/[dd]/",
									"ACL": "public-read"
								}
							}
						}
					}
			},

			components: [
				require('pixl-server-web'),
				require('../index.js')
			]

	});

	gServer.startup( done );
}

describe('FTPS3Hub', function() {
	var ftpClient = null;
	var s3 = null;

	before('setup s3', function(done) {
		var awsConfig = new AWS.Config({"region":"us-west-1"});
		s3 = new AWS.S3();
		done();
	})

	after('shut down server and cleanup', function(done) {
		var params = {
			Bucket: "test.dominy.com",
			Key: "ftptos3/" + datePath() + "/flower.jpg"
		};
		s3.deleteObject(params, function(err, data) {
			params = {
				Bucket: "test.dominy.com",
				Key: "ftptos3/" + datePath() + "/s3test.json"
			};
			s3.deleteObject(params, function(err, data) {
				if (gServer) {
					gServer.shutdown(done);
				}
				else {
					done();
				}
			});
		});
	})

	it('creates the server without error', function(done) {
		createServer(done);
	})
	it('client connects and logs in successfully', function(done) {
		var config = {
						host: 'localhost',
						port: 8880,
						user: 'test',
						pass: 'test',
						debug: false
				};

		ftpClient = new FTP(config);
		ftpClient.auth(config.user, config.pass, done);
	})
	it('client uploads file successfully', function(done) {
		this.timeout(5000);
		ftpClient.put(__dirname + '/test.json', 'test.json', function (err, filename) {
			assert(!err);

			// The put operation may complete before the file is fully uploaded, so do cheesy delay check
			setTimeout(function(){
				// Verify file on S3
				var params = {
					Bucket: "test.dominy.com",
					Key: "ftptos3/" + datePath() + "/s3test.json"
				};
				s3.getObject(params, function(err, data) {
					assert(!err, "s3.getObject error: " + err + " key=" + params.Key);
					assert(data);
					assert.equal(data.ContentType, "application/json");
					assert(data.Body);
					var obj = JSON.parse(data.Body);
					assert.equal(obj.test, 42);
					done();
				 });
			 }, 1000);
		});
	})
	it('client disconnects', function(done) {
		ftpClient.raw("quit", function(err) {
			done(err);
		});
	})
	it('rejects unknown users', function(done) {
		ftpClient.auth('nosuch', 'test', function(err) {
			assert(err);
			done();
		});
	})
	it('rejects bad password', function(done) {
		ftpClient.auth('test', 'badpass', function(err) {
			assert(err);
			done();
		});
	})
	it('client uploads binary file successfully', function(done) {
		this.timeout(10000);
		var config = {
						host: 'localhost',
						port: 8880,
						user: 'floweruser',
						pass: 'test',
						debug: false
				};

		ftpClient = new FTP(config);
		ftpClient.auth('floweruser', 'test', function(err) {
			assert(!err);
			ftpClient.put(__dirname + '/flower.jpg', 'flower.jpg', function (err, filename) {
				assert(!err);

				// The put operation may complete before the file is fully uploaded, so do cheesy delay check
				setTimeout(function() {
					// Verify file on S3
					var params = {
						Bucket: "test.dominy.com",
						Key: "ftptos3/" + datePath() + "/flower.jpg"
					};
					s3.getObject(params, function(err, data) {
						assert(!err, "s3.getObject error: " + err + " key=" + params.Key);
						assert(data);
						assert.equal(data.ContentType, "image/jpeg");
						done();
					});
				}, 5000);
			}); // put
		}); // auth

	})
})
