# ai_travel_companion
backend/
├── core/
│   ├── config.py      # 🎯 Main configuration hub
│   ├── database.py    # 🎯 Database engine & session management
│   └── security.py    # 🔐 Authentication & JWT handling
├── database.py        # 🔄 Compatibility layer (re-exports)
├── models/            # 📊 Individual model files
├── api/v1/           # 🌐 API endpoints
├── services/         # 🔧 Business logic
├── repositories/     # 💾 Data access layer
└── schemas/          # 📝 Pydantic models