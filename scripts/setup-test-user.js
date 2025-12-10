const axios = require('axios');
const { execSync } = require('child_process');

const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123',
  name: 'Admin User'
};

const API_BASE_URL = 'http://localhost:8080/api/v1';

async function checkBackend() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.status === 200;
  } catch (error) {
    console.error('Backend is not reachable. Please make sure the backend is running.');
    return false;
  }
}

async function createTestUser() {
  try {
    console.log('Creating test user...');
    await axios.post(`${API_BASE_URL}/auth/signup`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      name: TEST_USER.name,
      phone: '1234567890' // Adding phone as it's a required field
    });
    console.log('Test user created successfully!');
    return true;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      console.log('Test user already exists');
      return true;
    }
    console.error('Error creating test user:', error.message);
    return false;
  }
}

async function testLogin() {
  try {
    console.log('Testing login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.accessToken) {
      console.log('Login successful!');
      console.log('Access Token:', response.data.accessToken);
      return true;
    }
  } catch (error) {
    console.error('Login test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('Setting up test user...');
  
  // Check if backend is running
  console.log('Checking backend...');
  const isBackendUp = await checkBackend();
  if (!isBackendUp) {
    console.log('Starting backend...');
    try {
      // Try to start the backend using docker-compose
      execSync('docker-compose up -d', { cwd: 'd:\\Expenses', stdio: 'inherit' });
      console.log('Backend started. Waiting for it to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds for backend to start
    } catch (error) {
      console.error('Failed to start backend:', error.message);
      process.exit(1);
    }
  }

  // Create test user
  const userCreated = await createTestUser();
  if (!userCreated) {
    process.exit(1);
  }

  // Test login
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    process.exit(1);
  }

  console.log('\nSetup completed successfully!');
  console.log('You can now log in with:');
  console.log(`Email: ${TEST_USER.email}`);
  console.log(`Password: ${TEST_USER.password}`);
}

main().catch(console.error);
