var mailQueue = require('../app.js');

var winston = require('winston');
log = winston.createLogger({
	transports: [
		new winston.transports.Console({
			level: 'debug',
			handleExceptions: true,
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'HH:mm:ss'
				}),
				winston.format.colorize(),
				winston.format.printf((info) => {
					const {
						timestamp, level, message, ...args
					} = info;

					return `${timestamp} ${level}: ${message} ${Object.keys(args).length ? '\n' + JSON.stringify(args, null, 2) : ''}`;
				})
			)
		})
	],
	exitOnError: false
});

var nodemailer = require('nodemailer');
var mysql = require('mysql');
var db = mysql.createPool(require('../config/mysql.cfg'));

log.info('Hello!');

var mailQueueServer = new mailQueue.server({
	db: db,
	smtp: require('../config/smtp.cfg'),
	logger: log,
	tableName: 'mailQueue',
	from: 'mailqueue@foxbond.info',
	numRetries: 3,
	batchLimit: 10
});

var mailQueueServer2 = new mailQueue.server({
	db: db,
	smtp: nodemailer.createTransport(require('../config/smtp.cfg')),
	logger: log,
	tableName: 'mailQueue',
	from: 'mailqueue@foxbond.info'
});


//mailQueueServer.dedicated();
/*
mailQueueServer.batch(10, function (err) {
	log.error(err);
});
*/

var mail = {
	from: "",
	to: "",
	subject: "Send Email Using Node.js",
	text: "text",
	html: "<b>html</b>"
}

mailQueueServer.send(mail, function (err, res) {
	if (err) {
		log.error(err);
	}
	log.info('Sent! (' + res + ')');
});