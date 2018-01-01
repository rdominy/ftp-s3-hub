const Component = require("pixl-server/component"),
	unixpass = require('unixpass'),
	S3FileSystem = require("./s3-filesystem.js"),
	FtpSrv = require('ftp-srv');

class FTPS3Hub extends Component {
	constructor() {
		super();
		this.__name = "FTPS3Hub";
		this.defaultConfig = {
			"aws": {"region":"us-west-1"},
			"s3": {

			},
			"users": {

			},
			"ftpAddr": "ftp://127.0.0.1:8880",
			"ftpConfig": {
				"greeting":"FTP to S3 Hub",
				"pasv_range": 8881,
				"file_format": "ep"
			},
			"ftpLogLevel": "trace",
			"blacklist":["ALLO", "APPE", "LIST", "MDTM", "MKD", "XMKD", "NLST", "REST", "RETR", "RMD", "RNFR", "RNTO", "STAT", "DELE", "SIZE"],
			"maxHistory" : 20
		};

		this.ftpServer = null;
		this.eventHistory = [];
	}

	logEvent(name, info, success, details) {
		var event = {
			name: name,
			info: info,
			success: success,
			details: (details) ? details : ""
		};
		this.logDebug(5, "Event", event);
		this.eventHistory.unshift(event);
		if (this.eventHistory.length > this.config.get('maxHistory')) {
			this.eventHistory.pop();
		}
	}

	getStats() {
		return {
			history: this.eventHistory
		};
	}

	serverStatus(args, callback) {
		callback(this.getStats());
	}

	startup(callback) {
		var self = this;

		if (this.server.WebServer) {
			this.server.WebServer.addURIHandler(/^\/ftps3hub\/rest\/v1\.0\/status$/, 'FTPS3Hub Status', this.serverStatus.bind(this));
		}

		S3FileSystem.initModule(this.config.get('aws'));

		this.ftpServer = new FtpSrv(this.config.get('ftpAddr'), this.config.get('ftpConfig'));
		this.ftpServer.log.level(this.config.get('ftpLogLevel'));

		this.ftpServer.on('login', function(connection, resolve, reject) {
			var config = self.config.get();

			if (config.users[connection.username] && unixpass.check(connection.password, config.users[connection.username].password)) {
				self.logEvent("login", connection.username, true);
				var s3Config = {};
				s3Config = Object.assign(s3Config, config.s3, config.users[connection.username].s3);
				var fs = new S3FileSystem(s3Config, connection, {root:__dirname});

				fs.on('upload', self.logEvent.bind(self, 'upload'));

				resolve( {
					fs: fs,
					blacklist: config.blacklist
				});
			}
			else {
				self.logEvent("login", connection.username, false);
				reject(new Error("Could not authenticate"));
			}

		 });

		this.ftpServer.on('client-error', function(connection, context, error) {
			self.logError('ftp_client','Client error for ' + connection.username + error);
		});

		this.ftpServer.listen()
		 .then(() => {
				self.logDebug(2, "Listening at " + self.config.get('ftpAddr'));

				callback();
			});


	}

	shutdown(callback) {
		callback();
	}
}

module.exports = FTPS3Hub;
