// Quick script to create Ethereal email account
// Run: node create-ethereal-account.js

const https = require('https');

console.log('🔄 Creating Ethereal email account...\n');

const options = {
  hostname: 'api.nodemailer.com',
  port: 443,
  path: '/user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const account = JSON.parse(data);
      
      console.log('✅ Ethereal Account Created!\n');
      console.log('📧 Email Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Name:     ${account.name}`);
      console.log(`Email:    ${account.user}`);
      console.log(`Password: ${account.pass}`);
      console.log(`Host:     ${account.smtp.host}`);
      console.log(`Port:     ${account.smtp.port}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('📝 Copy these to your .env file:\n');
      console.log('SMTP_HOST=smtp.ethereal.email');
      console.log('SMTP_PORT=587');
      console.log(`SMTP_USERNAME=${account.user}`);
      console.log(`SMTP_PASSWORD=${account.pass}`);
      console.log(`FROM_EMAIL=${account.user}\n`);
      
      console.log('🌐 View emails at:');
      console.log(`https://ethereal.email/messages\n`);
      
      console.log('🔑 Login with:');
      console.log(`Username: ${account.user}`);
      console.log(`Password: ${account.pass}\n`);
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error creating account:', error.message);
  console.log('\n💡 Alternative: Create account manually at https://ethereal.email/create');
});

req.end();
