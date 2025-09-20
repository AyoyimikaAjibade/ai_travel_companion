CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL, -- For auth, if implemented
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL, -- e.g., 'seat_class', 'hotel_rating'
    value JSONB NOT NULL, -- e.g., {'class': 'business'}, {'min_rating': 4}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_type)
);

-- Table: trips (The main container)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_code VARCHAR(3) NOT NULL, -- e.g., 'SF'
    origin_name VARCHAR(255) NOT NULL,
    destination_code VARCHAR(3) NOT NULL, -- e.g., 'DOH'
    destination_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    adults INTEGER DEFAULT 1,
    budget DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'saved', 'booked'
    share_code VARCHAR(10) UNIQUE, -- Generated for sharing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: packages (AI-generated options for a trip request)
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    total_price DECIMAL(10, 2) NOT NULL,
    score DECIMAL(5, 2), -- AI's score for this package (0-100)
    explanation TEXT, -- Why this package was chosen (Explainability feature)
    flight_data JSONB,
    hotel_data JSONB,
    car_data JSONB,
    attractions_data JSONB,
    deeplinks JSONB NOT NULL DEFAULT '{}' -- e.g., {'expedia': 'https://...', 'hertz': '...'}
);

-- Table: trip_components (The user's FINAL chosen components, linked to a package)
CREATE TABLE trip_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'flight', 'hotel', 'car', 'attraction'
    details JSONB NOT NULL, -- Snapshot of the chosen component's details
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled' (Future feature)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: booking_references (Future feature: Track external confirmations)
CREATE TABLE booking_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_component_id UUID NOT NULL REFERENCES trip_components(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'expedia', 'booking.com', 'hertz'
    reference_code VARCHAR(255) NOT NULL,
    status VARCHAR(50), -- 'confirmed', 'pending', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_share_code ON trips(share_code);
CREATE INDEX idx_packages_trip_id ON packages(trip_id);
CREATE INDEX idx_trip_components_trip_id ON trip_components(trip_id);
CREATE INDEX idx_booking_refs_user_id ON booking_references(user_id);
CREATE INDEX idx_booking_refs_component_id ON booking_references(trip_component_id);