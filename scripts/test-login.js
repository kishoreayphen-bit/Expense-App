const axios = require('axios');

// Configuration matching the mobile app's API client
const API_BASE_URL = 'http://localhost:8080';

async function testLogin(email, password) {
  try {
    console.log(`Attempting to login with email: ${email}`);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/auth/login`,
      { email, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    console.log('Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Login failed with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Test with the test user credentials
testLogin('test@example.com', 'admin123');
