var nodemailer = require('nodemailer');

/*
var smtpTransport = mailer.createTransport("SMTP", {
	service: "Gmail",
	auth: {
		user: "gmail_id@gmail.com",
		pass: "gmail_password"
	}
});

*/

/*
let smtpConfig = {
	host: 'smtp.example.com',
	port: 587,
	secure: false, // upgrade later with STARTTLS
	auth: {
		user: 'username',
		pass: 'password'
	}
};
*/

/*
// verify connection configuration
transporter.verify(function (error, success) {
	if (error) {
		console.log(error);
	} else {
		console.log('Server is ready to take our messages');
	}
});
*/
let poolConfig = require('../config/smtp.cfg.js');

var mail = {
	from: "Foxbond <[cut]>",
	to: "[cut]",
	subject: "Send Email Using Node.js",
	text: "text",
	html: "<b>html</b>"
}

let transporter = nodemailer.createTransport(poolConfig);

transporter.sendMail(mail, function (error, response) {
	if (error) {
		console.log(error);
	} else {
		console.log("Message sent: " + response.message);
	}

	transporter.close();
});