// ============================================================================
// AI Travel Companion API - Global Postman Scripts
// ============================================================================

// PRE-REQUEST SCRIPT (Add to Collection level)
// ============================================================================

// Function to check if token is expired or expiring soon
function isTokenExpiring(token, bufferMinutes = 5) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = payload.exp;
        const bufferTime = bufferMinutes * 60;
        
        return (expirationTime - currentTime) <= bufferTime;
    } catch (error) {
        console.log('Error parsing token:', error);
        return true; // Assume expired if can't parse
    }
}

// Function to refresh token
function refreshToken() {
    const refreshToken = pm.environment.get('refresh_token');
    
    if (!refreshToken) {
        console.log('No refresh token available');
        return;
    }
    
    return new Promise((resolve, reject) => {
        pm.sendRequest({
            url: pm.environment.get('full_url') + '/auth/refresh',
            method: 'POST',
            header: {
                'Content-Type': 'application/json'
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    refresh_token: refreshToken
                })
            }
        }, function (err, response) {
            if (err) {
                console.error('Error refreshing token:', err);
                reject(err);
                return;
            }
            
            if (response.code === 200) {
                const responseData = response.json();
                pm.environment.set('access_token', responseData.access_token);
                pm.environment.set('refresh_token', responseData.refresh_token);
                console.log('✅ Token refreshed successfully');
                resolve(responseData);
            } else {
                console.error('Failed to refresh token:', response.code, response.text());
                // Clear invalid tokens
                pm.environment.unset('access_token');
                pm.environment.unset('refresh_token');
                reject(new Error('Token refresh failed'));
            }
        });
    });
}

// Main pre-request logic
(async function() {
    const accessToken = pm.environment.get('access_token');
    const refreshToken = pm.environment.get('refresh_token');
    
    // Skip token check for auth endpoints
    const requestUrl = pm.request.url.toString();
    const isAuthEndpoint = requestUrl.includes('/auth/') || requestUrl.includes('/health');
    
    if (isAuthEndpoint) {
        console.log('🔓 Auth endpoint detected, skipping token check');
        return;
    }
    
    // Check if we have tokens
    if (!accessToken || !refreshToken) {
        console.log('⚠️ No tokens found. Please login first.');
        return;
    }
    
    // Check if token is expiring
    if (isTokenExpiring(accessToken)) {
        console.log('🔄 Access token expiring soon, refreshing...');
        try {
            await refreshToken();
        } catch (error) {
            console.error('❌ Token refresh failed:', error.message);
        }
    } else {
        console.log('✅ Access token is valid');
    }
})();

// ============================================================================
// TEST SCRIPT (Add to Collection level)
// ============================================================================

// Common test assertions
pm.test('Response time is acceptable', function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

pm.test('Response has proper headers', function () {
    pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');
});

// Handle authentication responses
if (pm.request.url.toString().includes('/auth/login') || 
    pm.request.url.toString().includes('/auth/register')) {
    
    if (pm.response.code === 200) {
        const responseData = pm.response.json();
        
        // Save tokens if present
        if (responseData.access_token) {
            pm.environment.set('access_token', responseData.access_token);
            console.log('💾 Access token saved');
        }
        
        if (responseData.refresh_token) {
            pm.environment.set('refresh_token', responseData.refresh_token);
            console.log('💾 Refresh token saved');
        }
        
        // Save user ID if present (from register response)
        if (responseData.id) {
            pm.environment.set('user_id', responseData.id);
            console.log('💾 User ID saved:', responseData.id);
        }
    }
}

// Handle trip creation responses
if (pm.request.url.toString().includes('/trips') && pm.request.method === 'POST') {
    if (pm.response.code === 200 || pm.response.code === 201) {
        const responseData = pm.response.json();
        if (responseData.id) {
            pm.environment.set('trip_id', responseData.id);
            console.log('💾 Trip ID saved:', responseData.id);
        }
    }
}

// Handle package creation responses
if (pm.request.url.toString().includes('/packages') && pm.request.method === 'POST') {
    if (pm.response.code === 200 || pm.response.code === 201) {
        const responseData = pm.response.json();
        if (responseData.id) {
            pm.environment.set('package_id', responseData.id);
            console.log('💾 Package ID saved:', responseData.id);
        }
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Function to generate random test data
function generateTestData() {
    const randomId = Math.random().toString(36).substr(2, 9);
    return {
        username: `testuser_${randomId}`,
        email: `test_${randomId}@example.com`,
        password: 'testpass123'
    };
}

// Function to log environment variables (for debugging)
function logEnvironmentVariables() {
    console.log('🔍 Current Environment Variables:');
    console.log('- base_url:', pm.environment.get('base_url'));
    console.log('- access_token:', pm.environment.get('access_token') ? '***SET***' : 'NOT SET');
    console.log('- refresh_token:', pm.environment.get('refresh_token') ? '***SET***' : 'NOT SET');
    console.log('- user_id:', pm.environment.get('user_id'));
    console.log('- trip_id:', pm.environment.get('trip_id'));
    console.log('- package_id:', pm.environment.get('package_id'));
}

// Uncomment the line below to debug environment variables
// logEnvironmentVariables();
