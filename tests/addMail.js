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

var mailQueueClient = new mailQueue.client({
	db: db,
	logger: log,
	tableName: 'mailQueue',
	from: 'mailqueue@foxbond.info'
});

var mailQueueClient2 = new mailQueue.client({
	db: require('../config/mysql.cfg'),
	from: 'mailqueue@foxbond.info'
});

var mail = {
	from: "",
	to: "",
	subject: "Send Email Using Node.js",
	text: "text",
	html: "<b>html</b>"
}

mailQueueClient.send([mail, mail], function (err, mailIds) {
	if (err) {
		log.error(err);
	}
	log.info('Sent! (mailId:'+mailIds+')');
});