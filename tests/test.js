var mailQueue = require('../app.js');


var mailQueueClient = new mailQueue.client({
	db: require('../config/mysql.cfg.js'),
	smtp: require('../config/smtp.cfg.js'),
	tableName: 'mailQueue'
});

