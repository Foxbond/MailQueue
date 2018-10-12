var nodemailer = require('nodemailer');
var mysql = require('mysql');
var async = require('async');

var dummyLogger = {
	timestamp: function timestamp() {
		var time = new Date();
		return ("0" + time.getHours()).slice(-2) + ":" + ("0" + time.getMinutes()).slice(-2) + ":" + ("0" + time.getSeconds()).slice(-2);
	},

	info: function info(msg){
		console.log(this.timestamp() + ' info: ' + msg);
	},

	error: function error() {
		console.log(this.timestamp() + ' error: ' + msg);
	}
};

var resolveAddress = function (addr) {
	if (typeof addr === 'string') {
		return addr;
	}
	if (addr instanceof Array) {
		return addr[0] + '<' + addr[1] + '>';
	}

	return addr.name + '<' + addr.mail + '>';
};//resolveAddress

var client = class MailQueueClient{
	constructor(params) {
		if (params.logger) {
			this.logger = params.logger;
		} else {
			this.logger = dummyLogger;
		}

		if (params.db.constructor.name == 'Pool' || params.db.constructor.name == 'Connection') {
			this.db = params.db;
		} else {
			this.db = mysql.createConnection(params.db);
		}

		if (typeof params.tableName !== 'string') {
			this.tableName = 'mailQueue';
		} else {
			this.tableName = params.tableName;
		}

		if (typeof params.priority === 'undefined') {
			this.defaultPriority = 0;
		} else {
			this.defaultPriority = parseInt(params.priority);
		}

		if (typeof params.noHtml !== 'string') {
			this.noHtml = 'This message requires HTML support!';
		} else {
			this.noHtml = params.noHtml;
		}

		this.defaultFrom = resolveAddress(params.from);
	}//constructor

	send(message, callback) {
		this.add(message, callback);
	}//send

	add(messages, callback) {
		if (!(messages instanceof Array)) {
			messages = [messages];
		}

		var hack = this;

		async.map(messages, function (mail, cb) {
			hack.addSingleMail(mail, cb);
		}, callback);
	}//add

	addSingleMail(mail, callback) {
		this.db.query('INSERT INTO ' + this.tableName + ' (mailId, mailTimestamp, mailPriority, mailStatus, mailRetries, mailFrom, mailTo, mailSubject, mailContent, mailContentHtml) VALUES (NULL, ?, ?, ?, 0, ?, ?, ?, ?, ?)', [
			(+new Date()),
			(typeof mail.priority === 'undefined' ? this.defaultPriority : parseInt(mail.priority)),
			mailStatus.new,
			resolveAddress(mail.from),
			resolveAddress(mail.to),
			mail.subject,
			(typeof mail.text === 'string' ? mail.text : this.noHtml),
			mail.html], function (err, res) {
				if (err) return callback(err, 0);

				return callback(null, res.insertId);
			});
	}//addSingleMail

};

var server = class MailQueueServer{
	constructor(params) {
		if (params.logger) {
			this.logger = params.logger;
		} else {
			this.logger = dummyLogger;
		}

		if (params.db.constructor.name == 'Pool' || params.db.constructor.name == 'Connection') {
			this.db = params.db;
		} else {
			this.db = mysql.createConnection(params.db);
		}

		if (typeof params.tableName !== 'string') {
			this.tableName = 'mailQueue';
		} else {
			this.tableName = params.tableName;
		}

		this.defaultFrom = resolveAddress(params.from);

		if (params.smtp.constructor.name == 'Mail') {
			this.smtp = params.smtp;
		} else {
			this.smtp = nodemailer.createTransport(params.smtp);
		}

		if (typeof params.numRetries !== 'undefined') {
			this.numRetries = parseInt(params.numRetries);
		} else {
			this.numRetries = 3;
		}

		if (typeof params.batchLimit !== 'undefined') {
			this.batchLimit = parseInt(params.batchLimit);
		} else {
			this.batchLimit = 10;
		}
	}//constructor


	dedicated() {

	}//dedicated

	batch(limit, callback) {
		var hack = this;

		var _batch = function _batch(limit, callback, dbc) {
			dbc.beginTransaction(function (err) {
				if (err) {
					return callback(err);
				}

				dbc.query('SELECT * FROM ' + hack.tableName + ' ' +
					'WHERE mailStatus=0 or (mailStatus=2 AND mailRetries<' + hack.numRetries+') ' +
					'ORDER BY mailPriority DESC, mailStatus DESC, mailRetries DESC, mailTimestamp ASC ' +
					'LIMIT 0, ' + (typeof limit !== 'undefined' ? parseInt(limit) : hack.batchLimit) + ' ' +
					'FOR UPDATE', function (err, data) {
						if (err) {
							return callback(err);
						}
						
						var ids = [];
						data.forEach(function (rowData) {
							ids.push(rowData.mailId);
						});
						

						dbc.release();
				});
			});
		};

		if (this.db.constructor.name == 'Pool') {
			this.db.getConnection(function (err, connection) {
				if (err) {
					return callback(err);
				}
				_batch(limit, callback, connection);
			});
		} else {
			_batch(limit, callback, this.db);
		}
		
	}//batch

	send(mail, callback) {
		this.smtp.sendMail(mail, callback);
	}//send
};

var mailStatus = {
	0: 'New',			'new': 0,
	1: 'Processing',	'processing': 1,
	2: 'Failed',		'failed': 2,
	3: 'Sent',			'sent': 3,
	4: 'Aborted',		'aborted': 4
};

module.exports.client = client;
module.exports.server = server;
module.exports.mailStatus = mailStatus;