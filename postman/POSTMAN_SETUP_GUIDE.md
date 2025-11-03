# 🚀 AI Travel Companion API - Postman Setup Guide

## 📋 Overview
This guide will help you set up Postman for testing the AI Travel Companion API with automatic token management, pre-filled test data, and seamless authentication handling.

## 🔧 Prerequisites
- Postman Desktop App (recommended) or Web version
- AI Travel Companion API server running on `http://localhost:8000`
- PostgreSQL database configured and running

## 📦 Step 1: Import Environment

1. **Open Postman**
2. **Click on "Environments" in the sidebar**
3. **Click "Import" button**
4. **Select the file**: `AI_Travel_Companion_Environment.json`
5. **Click "Import"**

### 🌍 Environment Variables Explained:

| Variable | Description | Auto-Populated |
|----------|-------------|----------------|
| `base_url` | API server URL | ❌ |
| `api_version` | API version prefix | ❌ |
| `full_url` | Complete API URL | ❌ |
| `access_token` | JWT Access Token | ✅ |
| `refresh_token` | JWT Refresh Token | ✅ |
| `user_id` | Current user ID | ✅ |
| `test_username` | Test user username | ❌ |
| `test_email` | Test user email | ❌ |
| `test_password` | Test user password | ❌ |
| `temp_password` | Temporary password from reset | ✅ |
| `chat_id` | Current chat ID (auto-populated) | ✅ |
| `slot_id` | AI service slot_id for chat tracking | ✅ |
| `plan_id` | Current plan ID (auto-populated) | ✅ |
| `share_code` | Chat share code for public access | ✅ |
| `ai_service_url` | AI service base URL | ❌ |

## 📚 Step 2: Import Collection

1. **Click on "Collections" in the sidebar**
2. **Click "Import" button**
3. **Select the file**: `AI_Travel_Companion_Collection.json`
4. **Click "Import"**

## ⚙️ Step 3: Configure Environment

1. **Select the "AI Travel Companion - Local" environment** from the dropdown (top-right)
2. **Verify the following variables are set correctly:**
   - `base_url`: `http://localhost:8000`
   - `api_version`: `/api/v1`
   - `test_username`: `testuser` (or your preferred test username)
   - `test_email`: `testuser@example.com` (or your preferred test email)
   - `test_password`: `testpass123` (or your preferred test password)

## 🔐 Step 4: Authentication Flow

### 🎯 **Automatic Token Handling**
The collection includes automatic token management:

1. **Pre-request Script**: Automatically checks token expiration and refreshes if needed
2. **Collection-level Auth**: Uses Bearer token with `{{access_token}}` variable
3. **Test Scripts**: Automatically save tokens from login/register responses

### 🚀 **Quick Start Testing:**

1. **Health Check** (No auth required)
   ```
   GET {{full_url}}/health
   ```

2. **Register User** (Creates test user)
   ```
   POST {{full_url}}/auth/register
   ```
   - Uses pre-filled test data (username, email, password)
   - Automatically saves `user_id`

3. **Login User** (Gets tokens)
   ```
   POST {{full_url}}/auth/login
   ```
   - Uses pre-filled credentials
   - Automatically saves `access_token` and `refresh_token`

4. **All other requests** will now work automatically with saved tokens!

## 🧪 Step 5: Testing Workflow

### 🔄 **Recommended Testing Order:**

1. **🏥 Health Check** → Verify API is running
2. **🔐 Register User** → Create test user
3. **🔐 Login User** → Get authentication tokens
4. **👤 Get Current User** → Verify authentication works
5. **💬 Parse Chat Message** → Start AI chat conversation
6. **💬 Search Travel Options** → Generate travel plans (when all info collected)
7. **📋 Get Draft Plans** → View plans in Redis cache
8. **📋 Confirm Chat and Plans** → Save to PostgreSQL database
9. **💬 Get My Chats** → View all saved chats
10. **Continue with other endpoints...**

### 🤖 **AI Chat Flow (Recommended):**

1. **🤖 Parse Chat Message** → Send initial message (e.g., "I want to fly from San Francisco to Paris")
   - This creates a chat session and returns `chat_id` and `slot_id`
   - Continue parsing messages to collect all required information
2. **🤖 Search Travel Options** → When all info is collected, generate travel plans
   - Plans are saved to Redis cache for quick access
3. **📋 Get Draft Plans** → View generated plans in cache
4. **📋 Update Draft Plan** → Edit plans as needed
5. **🤖 Confirm Chat and Plans** → Save everything to PostgreSQL database
   - All messages and plans are persisted
   - Cache is cleared after confirmation

### 🔄 **Password Reset Testing Flow:**

1. **🔐 Password Reset Request** → Get temporary password
2. **🔐 Login User** (with temporary password) → Get new access token
3. **🔐 Change Password** (with access token) → Set new permanent password

### 🎯 **Key Features:**

#### ✨ **Automatic Token Management:**
- Tokens are automatically saved after login/register
- Pre-request script checks token expiration
- Auto-refreshes tokens when they're about to expire
- All authenticated requests use saved tokens

#### 📝 **Pre-filled Test Data:**
- Default test user credentials
- Sample chat data (San Francisco → Paris)
- Sample plan data with flight/hotel info
- All IDs are automatically captured and reused

#### 🔄 **Smart Variable Management:**
- `user_id` saved after registration
- `chat_id` and `slot_id` saved after chat message parsing
- `plan_id` saved after plan creation
- Tokens automatically refreshed

## 🛠️ Step 6: Customization

### 🎨 **Modify Test Data:**
Edit environment variables to use your preferred test data:

```json
{
  "test_username": "your-username",
  "test_email": "your-email@example.com",
  "test_password": "your-password"
}
```

### 🌐 **Multiple Environments:**
Create additional environments for different stages:

1. **Local Development**: `http://localhost:8000`
2. **Staging**: `https://staging-api.yourapp.com`
3. **Production**: `https://api.yourapp.com`

## 🔍 Step 7: Advanced Features

### 📊 **Collection Runner:**
1. Click on collection → "Run"
2. Select all requests
3. Choose environment
4. Click "Run AI Travel Companion API"
5. Watch automated testing of entire API!

### 🧪 **Test Scripts:**
Each request includes test scripts that:
- Verify response status codes
- Save important data to variables
- Log success/error messages
- Validate response structure

### 📈 **Monitoring:**
Set up Postman monitoring to:
- Run tests automatically
- Monitor API health
- Get alerts on failures
- Track performance metrics

## 🐛 Troubleshooting

### ❌ **Common Issues:**

1. **"Connection refused"**
   - ✅ Ensure API server is running on port 8000
   - ✅ Check `base_url` in environment

2. **"Unauthorized" errors**
   - ✅ Run "Login User" request first
   - ✅ Check if `access_token` is saved in environment
   - ✅ Verify token hasn't expired

3. **"User already exists"**
   - ✅ Change `test_username` or `test_email` to new values
   - ✅ Or use "Login User" instead of "Register User"

4. **Token refresh issues**
   - ✅ Check if `refresh_token` is saved
   - ✅ Manually run "Refresh Token" request

### 🔧 **Debug Tips:**
- Open Postman Console (View → Show Postman Console)
- Check environment variables (click eye icon)
- Look at request/response headers
- Review test script logs

## 🎉 Success! 

You now have a fully automated Postman setup that:
- ✅ Handles authentication automatically
- ✅ Manages tokens seamlessly  
- ✅ Uses realistic test data
- ✅ Captures and reuses IDs
- ✅ Refreshes expired tokens
- ✅ Provides comprehensive API coverage

Happy testing! 🚀

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the API documentation at `http://localhost:8000/docs`
3. Verify your server is running and database is connected
4. Check Postman console for detailed error messages
