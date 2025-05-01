#!/usr/bin/env node

/**
 * Script to check for missed medication doses
 * 
 * This script can be run as a scheduled task (e.g., using cron) to periodically
 * check for missed medication doses and generate alerts.
 * 
 * Example cron entry (runs every hour):
 * 0 * * * * node /path/to/check-missed-doses.js
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  // Set this to your application's base URL
  baseUrl: process.env.APP_URL || 'http://localhost:3000',
  // Set to true to use HTTPS, false for HTTP
  useHttps: process.env.USE_HTTPS === 'true',
  // Optional API key for authentication (if implemented)
  apiKey: process.env.API_KEY || '',
};

// Function to make the API request
async function checkMissedDoses() {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl}/api/alerts?action=check-missed-doses`;
    console.log(`Making request to: ${url}`);
    
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add API key if provided
    if (config.apiKey) {
      options.headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    
    // Choose HTTP or HTTPS
    const client = config.useHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            console.log('Missed dose check completed successfully');
            console.log(`Alerts created: ${result.alertsCreated}`);
            if (result.alerts && result.alerts.length > 0) {
              console.log('Alert details:');
              result.alerts.forEach((alert) => {
                console.log(`- ${alert.type} for medication ${alert.medicationId}`);
              });
            }
            resolve(result);
          } catch (error) {
            console.error('Error parsing response:', error);
            reject(error);
          }
        } else {
          console.error(`Request failed with status code: ${res.statusCode}`);
          console.error(`Response: ${data}`);
          reject(new Error(`Request failed with status code: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making request:', error);
      reject(error);
    });
    
    req.end();
  });
}

// Run the check
checkMissedDoses()
  .then(() => {
    console.log('Missed dose check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error checking missed doses:', error);
    process.exit(1);
  });