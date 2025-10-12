# 🚀 AI Travel Companion API - Postman Configuration

## 📁 Files in this Directory

| File | Description |
|------|-------------|
| `AI_Travel_Companion_Environment.json` | Postman environment with all variables |
| `AI_Travel_Companion_Collection.json` | Complete API collection with auto-auth |
| `POSTMAN_SETUP_GUIDE.md` | Detailed setup instructions |
| `global_scripts.js` | Advanced scripts for automation |
| `README.md` | This file |

## ⚡ Quick Setup (3 Steps)

### 1️⃣ **Import Environment**
- Open Postman → Environments → Import
- Select: `AI_Travel_Companion_Environment.json`

### 2️⃣ **Import Collection** 
- Open Postman → Collections → Import  
- Select: `AI_Travel_Companion_Collection.json`

### 3️⃣ **Start Testing**
- Select environment: "AI Travel Companion - Local"
- Run: Health Check → Register User → Login User
- All other requests will work automatically! 🎉

## 🎯 Key Features

### 🔐 **Automatic Authentication**
- ✅ Auto-saves tokens after login/register
- ✅ Auto-refreshes expired tokens
- ✅ Collection-level Bearer auth setup
- ✅ Smart pre-request token checking

### 📝 **Pre-filled Test Data**
- ✅ Default test user credentials (username, email, password)
- ✅ Sample trip data (NYC → LAX)  
- ✅ Sample package with flight/hotel
- ✅ All IDs auto-captured and reused

### 🔄 **Smart Variable Management**
- ✅ `access_token` & `refresh_token` (auto-managed)
- ✅ `user_id` (saved after registration)
- ✅ `trip_id` (saved after trip creation)
- ✅ `package_id` (saved after package creation)

### 🧪 **Comprehensive Testing**
- ✅ All API endpoints covered
- ✅ Proper test assertions
- ✅ Response validation
- ✅ Error handling

## 📚 Documentation

For detailed setup instructions, see: **[POSTMAN_SETUP_GUIDE.md](./POSTMAN_SETUP_GUIDE.md)**

## 🎉 Ready to Test!

Your Postman is now configured for seamless API testing with:
- Automatic token management
- Pre-filled realistic data  
- Smart variable handling
- Comprehensive endpoint coverage

Happy testing! 🚀
