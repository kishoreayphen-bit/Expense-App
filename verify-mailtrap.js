// Verify Mailtrap credentials
const nodemailer = require('nodemailer');

const config = {
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: '2c1a36eb4e373b',
        pass: 'f52722be55d1ae'
    }
};

console.log('Testing Mailtrap credentials...');
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('User:', config.user);
console.log('Pass:', config.pass);

const transporter = nodemailer.createTransporter(config);

transporter.verify((error, success) => {
    if (error) {
        console.log('\n❌ FAILED:', error.message);
        console.log('\nThe credentials are INCORRECT or Mailtrap is blocking the connection.');
        console.log('\nPlease:');
        console.log('1. Go to https://mailtrap.io/');
        console.log('2. Login to your account');
        console.log('3. Go to: Inboxes → My Sandbox');
        console.log('4. Copy the EXACT username and password');
        console.log('5. Update .env file');
    } else {
        console.log('\n✅ SUCCESS! Credentials are valid!');
        console.log('Mailtrap is ready to send emails.');
    }
});
