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

	error: function error(msg) {
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

var mailStatus = {
	0: 'New', 'new': 0,
	1: 'Processing', 'processing': 1,
	2: 'Failed', 'failed': 2,
	3: 'Sent', 'sent': 3,
	4: 'Aborted', 'aborted': 4
};

var mailQueue = class MailQueue{
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

		if (params.smtp.constructor.name == 'Mail') {
			this.smtp = params.smtp;
		} else {
			this.smtp = nodemailer.createTransport(params.smtp);
		}
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
		var hack = this;
		this.smtp.sendMail(mail, function (error, response) {
			
			var status = mailStatus.sent;
			if (error) {
				hack.logger.error('sendMail failed!', error);
				status = mailStatus.failed;
			}

			hack.db.query('INSERT INTO ' + hack.tableName + ' (mailId, mailTimestamp, mailPriority, mailStatus, mailRetries, mailFrom, mailTo, mailSubject, mailContent, mailContentHtml) VALUES (NULL, ?, ?, ?, 0, ?, ?, ?, ?, ?)', [
				(+new Date()),
				(typeof mail.priority === 'undefined' ? hack.defaultPriority : parseInt(mail.priority)),
				status,
				resolveAddress(mail.from),
				resolveAddress(mail.to),
				mail.subject,
				(typeof mail.text === 'string' ? mail.text : hack.noHtml),
				mail.html], function (err, res) {
					if (err) return callback(err, 0);
					
					return callback((status == mailStatus.failed ? error : null), res.insertId);
				});
		});
	}//addSingleMail

};

module.exports = mailQueue;