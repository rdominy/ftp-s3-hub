The *ftp-s3-hub* module was built with the purpose of enabling webcams to transfer images to S3.  Many webcams, especially IP webcams natively support FTP file transfer, but rather than run a hosted FTP server you can instead run a local *hub* (for example, on a Raspberry Pi) that accepts FTP files and then transfers them to Amazon S3.  This module provides that hub, using the [ftp-srv](http://www.npmjs.com/package/ftp-srv) module to supply the FTP protocol implementation.  You can then have many cameras, each with a different user, uploading to different buckets or the same bucket with different key/paths.

This module is implemented as a component of the [pixl-server](http://www.npmjs.com/package/pixl-server) framework.

**Features**
* Accepts FTP logins and file uploads (other FTP commands such as directory listing are **not** implemented)
* Saves uploaded files to S3
* Per FTP user S3 bucket and path configuration
* File naming using date/time macros

~~~~javascript
const PixlServer = require('pixl-server');

var Server = new PixlServer({
		__name: 'FTPS3Hub',
		__version: "1.0",

		config: {
				"log_dir": "/var/log",
				"log_filename": "ftptos3_test.log",
				"debug_level": 5,

				"WebServer": {
						"http_port": 8080,
						"http_htdocs_dir": "/var/www/html"
				},

				"FTPToS3": {
					"ftpAddr": "ftp://127.0.0.1:8880",
					"ftpConfig": {
						"greeting":"FTP to S3 Hub",
						"pasv_range": 8881,
						"file_format": "ep"
					},
					"s3" : {
						"Bucket": "testbucket",
						"ACL": "public-read"
					},
					"ftpLogLevel": "fatal",
					"users" : {
						"test1": {
							"password": "$1$test$pi/xDtU5WFVRqYS6BMU8X/",
							"s3" : {
								"Bucket" : "testbucket",
								"path" : "testuser1/[yyyy]/[mm]/[dd]/",
								"fileName":  "[hh]_[mi]_cam.jpg",
								"ACL": "public-read"
							}
						},
						"test2": {
							"password": "$1$test$pi/xDtU5WFVRqYS6BMU8X/",
							"s3" : {
								"Bucket" : "testbucket",
								"path" : "testuser2/[yyyy]/[mm]/[dd]/",
								"fileName":  "[hh]_[mi]_cam.jpg",
								"ACL": "public-read"
							}
						}
					}
				}
		},

		components: [
			require('pixl-server-web'),
			require('ftp-s3-hub')
		]

});

server.startup();
~~~~

# Setup
You can start with the sample above and modify the configuration for your own S3 buckets and FTP users.

AWS authentication is done through the standard AWS.Config method which automatically looks for credentials (typically in ~/.aws/credentials).

FTP user passwords can be stored as hashes using a variety of algorithms supported by [unixpass](http://www.npmjs.com/package/unixpass).  You can use the enclosed CLI script *passcrypt.js* to generate the encrypted password hash.

To run the server and watch debug output:
~~~~
node sample.js --debug --echo
~~~~

Or to run as a daemon in the background:
~~~~
node sample.js
~~~~

## Configuration settings
TBD
