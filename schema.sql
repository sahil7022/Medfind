-- MedFind PostgreSQL Production Database Schema
-- Database setup script for local PostgreSQL or Render PostgreSQL

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Pharmacies
CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    open_hours VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Inventory (Stock items per pharmacy)
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    stock_count INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    price_inr VARCHAR(50) NOT NULL DEFAULT '₹30',
    stock_state VARCHAR(20) DEFAULT 'good', -- 'good', 'warn', 'out'
    last_confirmed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Reservations (30-Minute Hold Requests)
CREATE TABLE IF NOT EXISTS reservations (
    id VARCHAR(50) PRIMARY KEY, -- e.g. MF1024
    user_id VARCHAR(255),       -- Firebase UID or guest ID
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    pharmacy_name VARCHAR(255) NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Confirmed', 'Ready', 'Completed', 'Expired'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial and Search Indexes
CREATE INDEX IF NOT EXISTS idx_pharmacies_coords ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_inventory_medicine ON inventory(medicine_name);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Seed Data (Bengaluru Coordinates Prototype Data)
INSERT INTO pharmacies (id, name, latitude, longitude, address, open_hours, contact_phone)
VALUES 
  ('a1b2c3d4-0001-4000-8000-000000000001', 'CityCare Pharmacy', 12.9716, 77.5946, 'MG Road, Indiranagar, Bengaluru', 'Open until 10:30 PM', '+91 98765 43210'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'HealthPlus Medicals', 12.9789, 77.5912, 'Koramangala 4th Block, Bengaluru', 'Open until 9:45 PM', '+91 98765 43211'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'GreenCross Pharmacy', 12.9650, 77.6010, 'HSR Layout Sector 1, Bengaluru', 'Open until 10:00 PM', '+91 98765 43212'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'MediPoint', 12.9500, 77.5800, 'Jayanagar 3rd Block, Bengaluru', 'Closed', '+91 98765 43213')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (pharmacy_id, medicine_name, stock_count, unit, price_inr, stock_state)
VALUES 
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Paracetamol 500 mg', 8, 'units', '₹32', 'good'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Azithromycin 500 mg', 3, 'strips', '₹120', 'good'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Cetirizine 10 mg', 1, 'strips', '₹25', 'warn'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Pantoprazole 40 mg', 12, 'strips', '₹85', 'good'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'ORS Sachets', 5, 'packs', '₹40', 'good'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Amoxicillin 500 mg', 2, 'strips', '₹95', 'warn')
ON CONFLICT DO NOTHING;
