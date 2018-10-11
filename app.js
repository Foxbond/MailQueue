var nodemailer = require('nodemailer');

var client = class MailQueueClient{
	constructor(config) {
		console.log('MailQueueClient');
	}
};

var server = class MailQueueServer{
	constructor(config) {
		console.log('MailQueueServer');
	}

};


module.exports.client = client;
module.exports.server = server;