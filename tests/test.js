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

var mysql = require('mysql');
var db = mysql.createPool(require('../config/mysql.cfg'));

log.info('Hello!');

var mailQueue = new mailQueue({
	db: db,
	smtp: require('../config/smtp.cfg'),
	logger: log,
	tableName: 'mailQueue',
	from: 'mailqueue@foxbond.info',
	numRetries: 3,
	batchLimit: 10,
	defaultPriority:0
});

var mail = {
	from: "mailqueue@foxbond.info",
	to: "foxbondpl@gmail.com",
	subject: "Send Email Using Node.js",
	text: "text",
	html: "<b>html</b>"
}

mailQueue.send([mail], function (err, mailIds) {
	if (err) {
		log.error(err);
	}
	log.info('Sent! (mailId:' + mailIds + ')');
});