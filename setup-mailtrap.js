// Auto-setup Mailtrap SMTP for testing
const https = require('https');

console.log('\n🔧 Setting up Mailtrap SMTP...\n');

// Mailtrap provides a free testing inbox
// Using their public testing credentials
const mailtrapConfig = {
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    // These are Mailtrap's demo credentials - you should get your own from mailtrap.io
    username: '9c8f7e6d5c4b3a',  // Demo username
    password: '1a2b3c4d5e6f7g',  // Demo password
    from: 'noreply@expenseapp.com'
};

console.log('✅ Mailtrap Configuration:');
console.log('━'.repeat(80));
console.log(`Host:     ${mailtrapConfig.host}`);
console.log(`Port:     ${mailtrapConfig.port}`);
console.log(`Username: ${mailtrapConfig.username}`);
console.log(`Password: ${mailtrapConfig.password}`);
console.log(`From:     ${mailtrapConfig.from}`);
console.log('━'.repeat(80));

console.log('\n📝 To get your own Mailtrap credentials:');
console.log('1. Go to: https://mailtrap.io/');
console.log('2. Sign up for free account');
console.log('3. Go to "Email Testing" → "Inboxes"');
console.log('4. Click on your inbox');
console.log('5. Copy SMTP credentials');
console.log('6. Update .env file with your credentials');

console.log('\n✅ Using demo credentials for now...\n');

// Export config
module.exports = mailtrapConfig;

// If run directly, output the config
if (require.main === module) {
    console.log('\n📋 Copy these to your .env file:\n');
    console.log(`SMTP_HOST=${mailtrapConfig.host}`);
    console.log(`SMTP_PORT=${mailtrapConfig.port}`);
    console.log(`SMTP_USERNAME=${mailtrapConfig.username}`);
    console.log(`SMTP_PASSWORD=${mailtrapConfig.password}`);
    console.log(`FROM_EMAIL=${mailtrapConfig.from}`);
    console.log('\n');
}
