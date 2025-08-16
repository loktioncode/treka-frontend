#!/usr/bin/env node

/**
 * Simple test script to verify API connectivity from frontend
 * This helps diagnose CORS and network issues
 */

const axios = require('axios');

// Use the same API URL that the frontend will use
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://100.107.93.105:8000/api/v1';

console.log('🔍 Testing API connectivity...');
console.log(`📡 API Base URL: ${API_BASE_URL}`);
console.log('================================\n');

async function testConnectivity() {
  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic API connectivity...');
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/`);
    console.log('✅ Basic connectivity successful');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Message: ${healthResponse.data.message}`);
    console.log();

    // Test 2: Login test
    console.log('2️⃣ Testing authentication...');
    const formData = new URLSearchParams();
    formData.append('username', 'elishabere4@gmail.com');
    formData.append('password', 'string');
    formData.append('grant_type', 'password');

    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    console.log('✅ Authentication successful');
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Token received: ${loginResponse.data.access_token ? 'Yes' : 'No'}`);
    console.log();

    // Test 3: Authenticated request
    if (loginResponse.data.access_token) {
      console.log('3️⃣ Testing authenticated request...');
      const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.access_token}`,
        },
      });
      
      console.log('✅ Authenticated request successful');
      console.log(`   Status: ${userResponse.status}`);
      console.log(`   User: ${userResponse.data.email}`);
      console.log(`   Role: ${userResponse.data.role}`);
    }

    console.log('\n🎉 All API tests passed! The backend is working correctly.');
    console.log('💡 If the frontend is still showing network errors, try:');
    console.log('   1. Restart the frontend development server');
    console.log('   2. Clear browser cache and localStorage');
    console.log('   3. Check browser developer tools for CORS errors');

  } catch (error) {
    console.error('❌ API test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data?.detail || error.response.statusText}`);
    } else if (error.request) {
      console.error('   Network Error: Could not connect to API');
      console.error('   Check if the API server is running and accessible');
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Verify API server is running on http://100.107.93.105:8000');
    console.log('   2. Check firewall and network connectivity');
    console.log('   3. Verify .env.local configuration in frontend');
    console.log('   4. Check CORS settings in backend');
  }
}

testConnectivity();
