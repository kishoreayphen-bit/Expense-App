const https = require('https');

const postData = JSON.stringify({
  requestor: 'ExpenseApp',
  version: '1.0.0'
});

const options = {
  hostname: 'api.nodemailer.com',
  port: 443,
  path: '/user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

console.log('Creating Ethereal account...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const account = JSON.parse(data);
      
      console.log('✅ Ethereal Account Created!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Email:    ${account.user}`);
      console.log(`Password: ${account.pass}`);
      console.log(`Host:     ${account.smtp.host}`);
      console.log(`Port:     ${account.smtp.port}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('📝 Update your .env file with:\n');
      console.log(`SMTP_HOST=smtp.ethereal.email`);
      console.log(`SMTP_PORT=587`);
      console.log(`SMTP_USERNAME=${account.user}`);
      console.log(`SMTP_PASSWORD=${account.pass}`);
      console.log(`FROM_EMAIL=${account.user}\n`);
      
      console.log('🌐 View emails at: https://ethereal.email/login');
      console.log(`Username: ${account.user}`);
      console.log(`Password: ${account.pass}\n`);
      
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error creating account:', error.message);
});

req.write(postData);
req.end();
