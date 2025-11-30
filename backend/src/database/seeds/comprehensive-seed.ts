/**
 * Comprehensive Seed Data - 30 entries for each data point
 * Run with: npx ts-node src/database/seeds/comprehensive-seed.ts
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Generate UUID
const generateId = () => uuidv4();

// Hash password
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// Current timestamp
const now = new Date().toISOString();

// ================================
// USERS - 30 Sample Users
// ================================
export const users = [
  // Regular Diners (20)
  { id: generateId(), first_name: 'John', last_name: 'Smith', email: 'john.smith@email.com', password: hashPassword('password123'), phone: '+1-555-0101', role: 'diner', loyalty_points: 1250, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@email.com', password: hashPassword('password123'), phone: '+1-555-0102', role: 'diner', loyalty_points: 2500, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Michael', last_name: 'Williams', email: 'michael.w@email.com', password: hashPassword('password123'), phone: '+1-555-0103', role: 'diner', loyalty_points: 800, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Emily', last_name: 'Brown', email: 'emily.b@email.com', password: hashPassword('password123'), phone: '+1-555-0104', role: 'diner', loyalty_points: 3200, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'David', last_name: 'Jones', email: 'david.jones@email.com', password: hashPassword('password123'), phone: '+1-555-0105', role: 'diner', loyalty_points: 150, is_active: true, email_verified: false },
  { id: generateId(), first_name: 'Jessica', last_name: 'Garcia', email: 'jess.garcia@email.com', password: hashPassword('password123'), phone: '+1-555-0106', role: 'diner', loyalty_points: 4500, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Robert', last_name: 'Miller', email: 'robert.m@email.com', password: hashPassword('password123'), phone: '+1-555-0107', role: 'diner', loyalty_points: 950, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Amanda', last_name: 'Davis', email: 'amanda.d@email.com', password: hashPassword('password123'), phone: '+1-555-0108', role: 'diner', loyalty_points: 2100, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'James', last_name: 'Martinez', email: 'james.martinez@email.com', password: hashPassword('password123'), phone: '+1-555-0109', role: 'diner', loyalty_points: 780, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Ashley', last_name: 'Anderson', email: 'ashley.a@email.com', password: hashPassword('password123'), phone: '+1-555-0110', role: 'diner', loyalty_points: 5600, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Christopher', last_name: 'Taylor', email: 'chris.t@email.com', password: hashPassword('password123'), phone: '+1-555-0111', role: 'diner', loyalty_points: 320, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Nicole', last_name: 'Thomas', email: 'nicole.t@email.com', password: hashPassword('password123'), phone: '+1-555-0112', role: 'diner', loyalty_points: 1800, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Matthew', last_name: 'Hernandez', email: 'matt.h@email.com', password: hashPassword('password123'), phone: '+1-555-0113', role: 'diner', loyalty_points: 650, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Stephanie', last_name: 'Moore', email: 'steph.m@email.com', password: hashPassword('password123'), phone: '+1-555-0114', role: 'diner', loyalty_points: 4200, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Daniel', last_name: 'Jackson', email: 'dan.jackson@email.com', password: hashPassword('password123'), phone: '+1-555-0115', role: 'diner', loyalty_points: 1100, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Jennifer', last_name: 'White', email: 'jen.white@email.com', password: hashPassword('password123'), phone: '+1-555-0116', role: 'diner', loyalty_points: 890, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Anthony', last_name: 'Harris', email: 'anthony.h@email.com', password: hashPassword('password123'), phone: '+1-555-0117', role: 'diner', loyalty_points: 2750, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Elizabeth', last_name: 'Martin', email: 'liz.martin@email.com', password: hashPassword('password123'), phone: '+1-555-0118', role: 'diner', loyalty_points: 3100, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Kevin', last_name: 'Thompson', email: 'kevin.t@email.com', password: hashPassword('password123'), phone: '+1-555-0119', role: 'diner', loyalty_points: 450, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Melissa', last_name: 'Robinson', email: 'melissa.r@email.com', password: hashPassword('password123'), phone: '+1-555-0120', role: 'diner', loyalty_points: 1950, is_active: true, email_verified: true },
  // Restaurant Owners (5)
  { id: generateId(), first_name: 'Marco', last_name: 'Rossi', email: 'marco@italianplace.com', password: hashPassword('owner123'), phone: '+1-555-0201', role: 'owner', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Yuki', last_name: 'Tanaka', email: 'yuki@sushimaster.com', password: hashPassword('owner123'), phone: '+1-555-0202', role: 'owner', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Pierre', last_name: 'Dupont', email: 'pierre@frenchbistro.com', password: hashPassword('owner123'), phone: '+1-555-0203', role: 'owner', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Carlos', last_name: 'Rivera', email: 'carlos@mexicangrill.com', password: hashPassword('owner123'), phone: '+1-555-0204', role: 'owner', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Raj', last_name: 'Patel', email: 'raj@indianspice.com', password: hashPassword('owner123'), phone: '+1-555-0205', role: 'owner', loyalty_points: 0, is_active: true, email_verified: true },
  // Admins (5)
  { id: generateId(), first_name: 'Admin', last_name: 'User', email: 'admin@opentable.com', password: hashPassword('admin123'), phone: '+1-555-0301', role: 'admin', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Support', last_name: 'Team', email: 'support@opentable.com', password: hashPassword('admin123'), phone: '+1-555-0302', role: 'admin', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Manager', last_name: 'One', email: 'manager1@opentable.com', password: hashPassword('admin123'), phone: '+1-555-0303', role: 'admin', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Manager', last_name: 'Two', email: 'manager2@opentable.com', password: hashPassword('admin123'), phone: '+1-555-0304', role: 'admin', loyalty_points: 0, is_active: true, email_verified: true },
  { id: generateId(), first_name: 'Super', last_name: 'Admin', email: 'superadmin@opentable.com', password: hashPassword('admin123'), phone: '+1-555-0305', role: 'admin', loyalty_points: 0, is_active: true, email_verified: true },
];

// ================================
// RESTAURANTS - 30 Sample Restaurants
// ================================
export const restaurants = [
  // Italian (5)
  { id: generateId(), name: 'Trattoria Milano', description: 'Authentic Italian cuisine with handmade pasta and wood-fired pizzas. Family recipes passed down through generations.', cuisine_type: 'Italian', address: '123 Main Street', city: 'San Francisco', state: 'CA', zip_code: '94102', country: 'USA', latitude: 37.7749, longitude: -122.4194, phone: '+1-415-555-0001', email: 'info@trattoriamilano.com', website: 'https://trattoriamilano.com', price_range: '$$$', total_capacity: 80, images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'], amenities: ['WiFi', 'Outdoor Seating', 'Private Dining', 'Full Bar'], average_rating: 4.7, total_reviews: 342, is_active: true },
  { id: generateId(), name: 'Pasta Paradise', description: 'Traditional Italian pasta and pizza made with imported ingredients.', cuisine_type: 'Italian', address: '456 Oak Avenue', city: 'San Francisco', state: 'CA', zip_code: '94103', country: 'USA', latitude: 37.7751, longitude: -122.4180, phone: '+1-415-555-0002', email: 'info@pastaparadise.com', website: 'https://pastaparadise.com', price_range: '$$', total_capacity: 60, images: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800'], amenities: ['WiFi', 'Takeout', 'Delivery'], average_rating: 4.5, total_reviews: 256, is_active: true },
  { id: generateId(), name: 'Bella Napoli', description: 'Neapolitan-style pizzeria with certified VPN pizzas.', cuisine_type: 'Italian', address: '789 Pine Street', city: 'San Francisco', state: 'CA', zip_code: '94104', country: 'USA', latitude: 37.7755, longitude: -122.4170, phone: '+1-415-555-0003', email: 'info@bellanapoli.com', website: 'https://bellanapoli.com', price_range: '$$', total_capacity: 45, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'], amenities: ['WiFi', 'Outdoor Seating'], average_rating: 4.8, total_reviews: 189, is_active: true },
  { id: generateId(), name: 'Ristorante Venezia', description: 'Upscale Italian dining featuring fresh seafood and regional wines.', cuisine_type: 'Italian', address: '321 Market Street', city: 'San Francisco', state: 'CA', zip_code: '94105', country: 'USA', latitude: 37.7760, longitude: -122.4160, phone: '+1-415-555-0004', email: 'info@venezia.com', website: 'https://ristorantevenezia.com', price_range: '$$$$', total_capacity: 70, images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=800'], amenities: ['WiFi', 'Private Dining', 'Valet Parking', 'Full Bar'], average_rating: 4.9, total_reviews: 412, is_active: true },
  { id: generateId(), name: 'Osteria Toscana', description: 'Rustic Tuscan cuisine in a warm, inviting atmosphere.', cuisine_type: 'Italian', address: '654 Union Street', city: 'San Francisco', state: 'CA', zip_code: '94106', country: 'USA', latitude: 37.7765, longitude: -122.4150, phone: '+1-415-555-0005', email: 'info@osteriatoscana.com', website: 'https://osteriatoscana.com', price_range: '$$$', total_capacity: 55, images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'], amenities: ['WiFi', 'Outdoor Seating', 'Full Bar'], average_rating: 4.6, total_reviews: 278, is_active: true },
  
  // Japanese (5)
  { id: generateId(), name: 'Sakura Sushi House', description: 'Authentic Japanese sushi and sashimi prepared by master chefs.', cuisine_type: 'Japanese', address: '111 Cherry Blossom Lane', city: 'San Francisco', state: 'CA', zip_code: '94107', country: 'USA', latitude: 37.7770, longitude: -122.4140, phone: '+1-415-555-0006', email: 'info@sakurasushi.com', website: 'https://sakurasushi.com', price_range: '$$$$', total_capacity: 40, images: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800'], amenities: ['Sushi Bar', 'Private Rooms', 'Sake Selection'], average_rating: 4.9, total_reviews: 567, is_active: true },
  { id: generateId(), name: 'Tokyo Ramen', description: 'Traditional Japanese ramen with rich, flavorful broths.', cuisine_type: 'Japanese', address: '222 Noodle Street', city: 'San Francisco', state: 'CA', zip_code: '94108', country: 'USA', latitude: 37.7775, longitude: -122.4130, phone: '+1-415-555-0007', email: 'info@tokyoramen.com', website: 'https://tokyoramen.com', price_range: '$$', total_capacity: 35, images: ['https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800'], amenities: ['Counter Seating', 'Takeout'], average_rating: 4.6, total_reviews: 423, is_active: true },
  { id: generateId(), name: 'Izakaya Zen', description: 'Japanese pub-style dining with small plates and sake.', cuisine_type: 'Japanese', address: '333 Sake Avenue', city: 'San Francisco', state: 'CA', zip_code: '94109', country: 'USA', latitude: 37.7780, longitude: -122.4120, phone: '+1-415-555-0008', email: 'info@izakayazen.com', website: 'https://izakayazen.com', price_range: '$$$', total_capacity: 50, images: ['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800'], amenities: ['Full Bar', 'Late Night', 'Private Rooms'], average_rating: 4.5, total_reviews: 312, is_active: true },
  { id: generateId(), name: 'Omakase Master', description: 'Premium omakase experience with seasonal ingredients.', cuisine_type: 'Japanese', address: '444 Chef Street', city: 'San Francisco', state: 'CA', zip_code: '94110', country: 'USA', latitude: 37.7785, longitude: -122.4110, phone: '+1-415-555-0009', email: 'info@omakasemaster.com', website: 'https://omakasemaster.com', price_range: '$$$$', total_capacity: 16, images: ['https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800'], amenities: ['Omakase Only', 'Counter Seating'], average_rating: 4.9, total_reviews: 234, is_active: true },
  { id: generateId(), name: 'Tempura House', description: 'Crispy, light tempura made with the finest ingredients.', cuisine_type: 'Japanese', address: '555 Fry Lane', city: 'San Francisco', state: 'CA', zip_code: '94111', country: 'USA', latitude: 37.7790, longitude: -122.4100, phone: '+1-415-555-0010', email: 'info@tempurahouse.com', website: 'https://tempurahouse.com', price_range: '$$$', total_capacity: 40, images: ['https://images.unsplash.com/photo-1578674473215-9e07ee2e577d?w=800'], amenities: ['Counter Seating', 'Private Dining'], average_rating: 4.7, total_reviews: 189, is_active: true },

  // French (5)
  { id: generateId(), name: 'Le Petit Bistro', description: 'Classic French bistro with a modern twist.', cuisine_type: 'French', address: '666 Paris Street', city: 'San Francisco', state: 'CA', zip_code: '94112', country: 'USA', latitude: 37.7795, longitude: -122.4090, phone: '+1-415-555-0011', email: 'info@lepetitbistro.com', website: 'https://lepetitbistro.com', price_range: '$$$', total_capacity: 55, images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'], amenities: ['Wine Cellar', 'Outdoor Seating', 'Private Dining'], average_rating: 4.8, total_reviews: 298, is_active: true },
  { id: generateId(), name: 'Brasserie Lyon', description: 'Traditional French brasserie cuisine.', cuisine_type: 'French', address: '777 Lyon Avenue', city: 'San Francisco', state: 'CA', zip_code: '94113', country: 'USA', latitude: 37.7800, longitude: -122.4080, phone: '+1-415-555-0012', email: 'info@brasserielyon.com', website: 'https://brasserielyon.com', price_range: '$$', total_capacity: 70, images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800'], amenities: ['Full Bar', 'Outdoor Seating'], average_rating: 4.5, total_reviews: 367, is_active: true },
  { id: generateId(), name: 'Maison Belle', description: 'Elegant French fine dining experience.', cuisine_type: 'French', address: '888 Elegant Way', city: 'San Francisco', state: 'CA', zip_code: '94114', country: 'USA', latitude: 37.7805, longitude: -122.4070, phone: '+1-415-555-0013', email: 'info@maisonbelle.com', website: 'https://maisonbelle.com', price_range: '$$$$', total_capacity: 45, images: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'], amenities: ['Wine Cellar', 'Valet Parking', 'Private Dining', 'Tasting Menu'], average_rating: 4.9, total_reviews: 234, is_active: true },
  { id: generateId(), name: 'Café de Provence', description: 'Southern French cuisine with Mediterranean influences.', cuisine_type: 'French', address: '999 Provence Road', city: 'San Francisco', state: 'CA', zip_code: '94115', country: 'USA', latitude: 37.7810, longitude: -122.4060, phone: '+1-415-555-0014', email: 'info@cafedeprovence.com', website: 'https://cafedeprovence.com', price_range: '$$$', total_capacity: 50, images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'], amenities: ['Outdoor Seating', 'Wine Selection', 'Brunch'], average_rating: 4.6, total_reviews: 276, is_active: true },
  { id: generateId(), name: 'Crêperie Bretonne', description: 'Authentic Breton crêpes and galettes.', cuisine_type: 'French', address: '101 Crêpe Lane', city: 'San Francisco', state: 'CA', zip_code: '94116', country: 'USA', latitude: 37.7815, longitude: -122.4050, phone: '+1-415-555-0015', email: 'info@creperie.com', website: 'https://creperiebretonne.com', price_range: '$$', total_capacity: 35, images: ['https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800'], amenities: ['Outdoor Seating', 'Takeout', 'Cider Selection'], average_rating: 4.7, total_reviews: 198, is_active: true },

  // Mexican (5)
  { id: generateId(), name: 'Casa Oaxaca', description: 'Authentic Oaxacan cuisine with handmade tortillas.', cuisine_type: 'Mexican', address: '202 Mexico Way', city: 'San Francisco', state: 'CA', zip_code: '94117', country: 'USA', latitude: 37.7820, longitude: -122.4040, phone: '+1-415-555-0016', email: 'info@casaoaxaca.com', website: 'https://casaoaxaca.com', price_range: '$$', total_capacity: 60, images: ['https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800'], amenities: ['Full Bar', 'Live Music', 'Outdoor Seating'], average_rating: 4.6, total_reviews: 445, is_active: true },
  { id: generateId(), name: 'Taqueria Guadalajara', description: 'Street-style tacos and Mexican favorites.', cuisine_type: 'Mexican', address: '303 Taco Street', city: 'San Francisco', state: 'CA', zip_code: '94118', country: 'USA', latitude: 37.7825, longitude: -122.4030, phone: '+1-415-555-0017', email: 'info@taqueriag.com', website: 'https://taqueriaguadalajara.com', price_range: '$', total_capacity: 40, images: ['https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800'], amenities: ['Takeout', 'Late Night', 'Catering'], average_rating: 4.7, total_reviews: 678, is_active: true },
  { id: generateId(), name: 'El Jardín', description: 'Upscale Mexican cuisine with garden seating.', cuisine_type: 'Mexican', address: '404 Garden Way', city: 'San Francisco', state: 'CA', zip_code: '94119', country: 'USA', latitude: 37.7830, longitude: -122.4020, phone: '+1-415-555-0018', email: 'info@eljardin.com', website: 'https://eljardin.com', price_range: '$$$', total_capacity: 75, images: ['https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800'], amenities: ['Garden Seating', 'Full Bar', 'Private Events'], average_rating: 4.8, total_reviews: 312, is_active: true },
  { id: generateId(), name: 'Cantina Moderna', description: 'Modern Mexican with innovative cocktails.', cuisine_type: 'Mexican', address: '505 Modern Blvd', city: 'San Francisco', state: 'CA', zip_code: '94120', country: 'USA', latitude: 37.7835, longitude: -122.4010, phone: '+1-415-555-0019', email: 'info@cantinamoderna.com', website: 'https://cantinamoderna.com', price_range: '$$$', total_capacity: 65, images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'], amenities: ['Craft Cocktails', 'DJ', 'Late Night'], average_rating: 4.5, total_reviews: 234, is_active: true },
  { id: generateId(), name: 'Mariscos del Pacifico', description: 'Fresh Mexican seafood specialties.', cuisine_type: 'Mexican', address: '606 Ocean Drive', city: 'San Francisco', state: 'CA', zip_code: '94121', country: 'USA', latitude: 37.7840, longitude: -122.4000, phone: '+1-415-555-0020', email: 'info@mariscos.com', website: 'https://mariscosdelpacifico.com', price_range: '$$', total_capacity: 55, images: ['https://images.unsplash.com/photo-1579631542720-3a87824fff86?w=800'], amenities: ['Ocean View', 'Full Bar', 'Fresh Catch'], average_rating: 4.6, total_reviews: 289, is_active: true },

  // Indian (5)
  { id: generateId(), name: 'Taj Palace', description: 'Royal Indian cuisine with elegant ambiance.', cuisine_type: 'Indian', address: '707 Spice Road', city: 'San Francisco', state: 'CA', zip_code: '94122', country: 'USA', latitude: 37.7845, longitude: -122.3990, phone: '+1-415-555-0021', email: 'info@tajpalace.com', website: 'https://tajpalace.com', price_range: '$$$', total_capacity: 80, images: ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'], amenities: ['Private Dining', 'Live Music', 'Full Bar'], average_rating: 4.7, total_reviews: 456, is_active: true },
  { id: generateId(), name: 'Mumbai Street Kitchen', description: 'Authentic Mumbai street food experience.', cuisine_type: 'Indian', address: '808 Chaat Lane', city: 'San Francisco', state: 'CA', zip_code: '94123', country: 'USA', latitude: 37.7850, longitude: -122.3980, phone: '+1-415-555-0022', email: 'info@mumbaistreet.com', website: 'https://mumbaikitchen.com', price_range: '$', total_capacity: 35, images: ['https://images.unsplash.com/photo-1567337710282-00832b415979?w=800'], amenities: ['Takeout', 'Counter Service', 'Vegetarian Options'], average_rating: 4.5, total_reviews: 523, is_active: true },
  { id: generateId(), name: 'Kerala Kitchen', description: 'South Indian coastal cuisine.', cuisine_type: 'Indian', address: '909 Coconut Way', city: 'San Francisco', state: 'CA', zip_code: '94124', country: 'USA', latitude: 37.7855, longitude: -122.3970, phone: '+1-415-555-0023', email: 'info@keralakitchen.com', website: 'https://keralakitchen.com', price_range: '$$', total_capacity: 45, images: ['https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=800'], amenities: ['Vegetarian Options', 'Banana Leaf Service'], average_rating: 4.6, total_reviews: 312, is_active: true },
  { id: generateId(), name: 'Punjabi Dhaba', description: 'Hearty North Indian truck stop style food.', cuisine_type: 'Indian', address: '111 Tandoor Street', city: 'San Francisco', state: 'CA', zip_code: '94125', country: 'USA', latitude: 37.7860, longitude: -122.3960, phone: '+1-415-555-0024', email: 'info@punjabidhaba.com', website: 'https://punjabidhaba.com', price_range: '$$', total_capacity: 50, images: ['https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800'], amenities: ['Family Style', 'Takeout', 'Catering'], average_rating: 4.7, total_reviews: 467, is_active: true },
  { id: generateId(), name: 'Masala Art', description: 'Contemporary Indian fusion cuisine.', cuisine_type: 'Indian', address: '222 Fusion Drive', city: 'San Francisco', state: 'CA', zip_code: '94126', country: 'USA', latitude: 37.7865, longitude: -122.3950, phone: '+1-415-555-0025', email: 'info@masalaart.com', website: 'https://masalaart.com', price_range: '$$$', total_capacity: 55, images: ['https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800'], amenities: ['Tasting Menu', 'Wine Pairing', 'Private Dining'], average_rating: 4.8, total_reviews: 289, is_active: true },

  // American (5)
  { id: generateId(), name: 'The Modern Bistro', description: 'Contemporary American cuisine with seasonal menus.', cuisine_type: 'American', address: '333 Modern Lane', city: 'San Francisco', state: 'CA', zip_code: '94127', country: 'USA', latitude: 37.7870, longitude: -122.3940, phone: '+1-415-555-0026', email: 'info@modernbistro.com', website: 'https://modernbistro.com', price_range: '$$$', total_capacity: 65, images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'], amenities: ['Private Dining', 'Full Bar', 'Seasonal Menu'], average_rating: 4.8, total_reviews: 534, is_active: true },
  { id: generateId(), name: 'Smokehouse BBQ', description: 'Texas-style BBQ with house-smoked meats.', cuisine_type: 'American', address: '444 Smoke Street', city: 'San Francisco', state: 'CA', zip_code: '94128', country: 'USA', latitude: 37.7875, longitude: -122.3930, phone: '+1-415-555-0027', email: 'info@smokehousebbq.com', website: 'https://smokehousebbq.com', price_range: '$$', total_capacity: 80, images: ['https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800'], amenities: ['Outdoor Seating', 'Full Bar', 'Live Music'], average_rating: 4.6, total_reviews: 678, is_active: true },
  { id: generateId(), name: 'Farm & Table', description: 'Farm-to-table American cuisine.', cuisine_type: 'American', address: '555 Farm Road', city: 'San Francisco', state: 'CA', zip_code: '94129', country: 'USA', latitude: 37.7880, longitude: -122.3920, phone: '+1-415-555-0028', email: 'info@farmandtable.com', website: 'https://farmandtable.com', price_range: '$$$', total_capacity: 50, images: ['https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800'], amenities: ['Garden Seating', 'Organic Menu', 'Private Dining'], average_rating: 4.7, total_reviews: 345, is_active: true },
  { id: generateId(), name: 'Burger Joint', description: 'Gourmet burgers and craft beers.', cuisine_type: 'American', address: '666 Burger Blvd', city: 'San Francisco', state: 'CA', zip_code: '94130', country: 'USA', latitude: 37.7885, longitude: -122.3910, phone: '+1-415-555-0029', email: 'info@burgerjoint.com', website: 'https://burgerjoint.com', price_range: '$$', total_capacity: 60, images: ['https://images.unsplash.com/photo-1550547660-d9450f859349?w=800'], amenities: ['Craft Beer', 'Sports TV', 'Outdoor Seating'], average_rating: 4.5, total_reviews: 789, is_active: true },
  { id: generateId(), name: 'Coastal Kitchen', description: 'Pacific Northwest seafood and oyster bar.', cuisine_type: 'American', address: '777 Coast Highway', city: 'San Francisco', state: 'CA', zip_code: '94131', country: 'USA', latitude: 37.7890, longitude: -122.3900, phone: '+1-415-555-0030', email: 'info@coastalkitchen.com', website: 'https://coastalkitchen.com', price_range: '$$$', total_capacity: 70, images: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'], amenities: ['Oyster Bar', 'Ocean View', 'Full Bar'], average_rating: 4.7, total_reviews: 456, is_active: true },
];

// Generate confirmation codes
const generateConfirmationCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// ================================
// TABLES - 30+ Sample Tables (distributed across restaurants)
// ================================
export const generateTables = (restaurantIds: string[]) => {
  const tables: any[] = [];
  const tableTypes = [
    { capacity: 2, min: 1, location: 'window', count: 3 },
    { capacity: 4, min: 2, location: 'indoor', count: 4 },
    { capacity: 6, min: 4, location: 'indoor', count: 2 },
    { capacity: 8, min: 6, location: 'private', count: 1 },
  ];

  restaurantIds.forEach((restaurantId, idx) => {
    let tableNum = 1;
    tableTypes.forEach((type) => {
      for (let i = 0; i < type.count; i++) {
        tables.push({
          id: generateId(),
          restaurant_id: restaurantId,
          table_number: `${idx + 1}${String.fromCharCode(65 + tableNum)}`,
          capacity: type.capacity,
          min_capacity: type.min,
          location: type.location,
          is_active: true,
          notes: type.location === 'window' ? 'Nice view' : null,
        });
        tableNum++;
      }
    });
  });

  return tables;
};

// ================================
// REVIEWS - 30 Sample Reviews
// ================================
export const generateReviews = (userIds: string[], restaurantIds: string[]) => {
  const comments = [
    'Absolutely fantastic experience! The food was incredible and service impeccable.',
    'Great atmosphere and delicious food. Will definitely come back!',
    'One of the best meals I have ever had. Highly recommend!',
    'Good food but service was a bit slow. Overall enjoyable.',
    'Perfect for a special occasion. Everything was exceptional.',
    'Nice ambiance and tasty dishes. Prices are reasonable.',
    'The pasta was handmade and you could tell. Amazing flavors!',
    'Friendly staff and beautiful presentation. Food was okay.',
    'Outstanding cuisine! Every dish was a work of art.',
    'Cozy atmosphere and generous portions. Good value.',
    'The chef really knows what they are doing. Phenomenal!',
    'Decent meal but nothing extraordinary. Would try again.',
    'Best sushi in the city! Fresh and expertly prepared.',
    'Romantic setting and excellent wine selection.',
    'Family-friendly with great kids options. Everyone was happy!',
    'The tasting menu was an incredible journey of flavors.',
    'Quick service and consistent quality. Our go-to spot.',
    'Beautiful outdoor seating. Perfect for brunch.',
    'Authentic flavors that transported me to another country.',
    'The cocktails were creative and delicious!',
    'Great for business dinners. Professional atmosphere.',
    'The portions were generous and everything was fresh.',
    'Loved the vegetarian options! So creative and flavorful.',
    'The desserts were to die for. Save room!',
    'Perfect date night spot. Intimate and romantic.',
    'The seafood was incredibly fresh. Best oysters ever!',
    'Wonderful experience from start to finish.',
    'The service was attentive without being intrusive.',
    'A culinary adventure! Every bite was exciting.',
    'Great happy hour specials and fun vibe.',
  ];

  const reviews: any[] = [];
  for (let i = 0; i < 30; i++) {
    const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars mostly
    reviews.push({
      id: generateId(),
      user_id: userIds[i % userIds.length],
      restaurant_id: restaurantIds[i % restaurantIds.length],
      overall_rating: rating,
      food_rating: Math.min(5, rating + (Math.random() > 0.5 ? 0 : -1)),
      service_rating: Math.min(5, rating + (Math.random() > 0.5 ? 0 : -1)),
      ambiance_rating: Math.min(5, rating + (Math.random() > 0.5 ? 0 : 1)),
      value_rating: rating,
      comment: comments[i],
      visit_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      photos: [],
      is_verified: Math.random() > 0.3,
      helpful_count: Math.floor(Math.random() * 50),
    });
  }
  return reviews;
};

// ================================
// RESERVATIONS - 30 Sample Reservations
// ================================
export const generateReservations = (userIds: string[], restaurantIds: string[], tableIds: string[]) => {
  const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
  const occasions = ['birthday', 'anniversary', 'business', 'date', 'celebration', 'none'];
  const reservations: any[] = [];

  for (let i = 0; i < 30; i++) {
    const futureDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const hour = 17 + Math.floor(Math.random() * 5); // 5pm - 9pm
    const minute = Math.random() > 0.5 ? '00' : '30';
    futureDate.setHours(hour, parseInt(minute), 0, 0);

    const status = i < 20 ? statuses[Math.floor(Math.random() * 2)] : statuses[Math.floor(Math.random() * statuses.length)];

    reservations.push({
      id: generateId(),
      user_id: userIds[i % userIds.length],
      restaurant_id: restaurantIds[i % restaurantIds.length],
      table_id: tableIds[i % tableIds.length],
      date_time: futureDate.toISOString(),
      party_size: 2 + Math.floor(Math.random() * 5),
      status: status,
      special_requests: i % 3 === 0 ? 'Window seat if possible' : null,
      dietary_restrictions: i % 4 === 0 ? ['vegetarian'] : null,
      occasion_type: occasions[Math.floor(Math.random() * occasions.length)],
      confirmation_code: generateConfirmationCode(),
      guest_info: JSON.stringify({ notes: 'Regular customer' }),
      confirmed_at: status === 'confirmed' ? now : null,
      seated_at: status === 'completed' ? now : null,
      completed_at: status === 'completed' ? now : null,
      cancelled_at: status === 'cancelled' ? now : null,
      cancellation_reason: status === 'cancelled' ? 'Change of plans' : null,
      has_preferences: i % 3 === 0,
      modification_count: Math.floor(Math.random() * 3),
      points_awarded: status === 'completed' ? 100 : 0,
    });
  }
  return reservations;
};

// ================================
// RESTAURANT HOURS - For all restaurants
// ================================
export const generateRestaurantHours = (restaurantIds: string[]) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours: any[] = [];

  restaurantIds.forEach((restaurantId) => {
    days.forEach((day) => {
      const isClosed = day === 'monday' && Math.random() > 0.7; // Some restaurants closed Monday
      hours.push({
        id: generateId(),
        restaurant_id: restaurantId,
        day_of_week: day,
        open_time: isClosed ? null : '11:00:00',
        close_time: isClosed ? null : (day === 'friday' || day === 'saturday' ? '23:00:00' : '22:00:00'),
        is_closed: isClosed,
        last_reservation_time: isClosed ? null : (day === 'friday' || day === 'saturday' ? '21:30:00' : '20:30:00'),
      });
    });
  });

  return hours;
};

// ================================
// EXPORT SQL GENERATION FUNCTIONS
// ================================
export const generateInsertSQL = () => {
  const restaurantIds = restaurants.map(r => r.id);
  const userIds = users.slice(0, 20).map(u => u.id); // Only diner users for reviews/reservations
  const tables = generateTables(restaurantIds);
  const tableIds = tables.map(t => t.id);
  const reviews = generateReviews(userIds, restaurantIds);
  const reservations = generateReservations(userIds, restaurantIds, tableIds);
  const restaurantHours = generateRestaurantHours(restaurantIds);

  let sql = '-- Comprehensive Seed Data for OpenTable Clone\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';

  // Users INSERT
  sql += '-- USERS\n';
  users.forEach(u => {
    sql += `INSERT INTO users (id, first_name, last_name, email, password, phone, role, loyalty_points, is_active, email_verified, created_at, updated_at) VALUES ('${u.id}', '${u.first_name}', '${u.last_name}', '${u.email}', '${u.password}', '${u.phone}', '${u.role}', ${u.loyalty_points}, ${u.is_active}, ${u.email_verified}, '${now}', '${now}');\n`;
  });

  sql += '\n-- RESTAURANTS\n';
  restaurants.forEach(r => {
    const images = `ARRAY[${r.images.map(i => `'${i}'`).join(', ')}]`;
    const amenities = `ARRAY[${r.amenities.map(a => `'${a}'`).join(', ')}]`;
    sql += `INSERT INTO restaurants (id, name, description, cuisine_type, address, city, state, zip_code, country, latitude, longitude, phone, email, website, price_range, total_capacity, images, amenities, average_rating, total_reviews, is_active, created_at, updated_at) VALUES ('${r.id}', '${r.name.replace(/'/g, "''")}', '${r.description.replace(/'/g, "''")}', '${r.cuisine_type}', '${r.address}', '${r.city}', '${r.state}', '${r.zip_code}', '${r.country}', ${r.latitude}, ${r.longitude}, '${r.phone}', '${r.email}', '${r.website}', '${r.price_range}', ${r.total_capacity}, ${images}, ${amenities}, ${r.average_rating}, ${r.total_reviews}, ${r.is_active}, '${now}', '${now}');\n`;
  });

  sql += '\n-- TABLES\n';
  tables.forEach(t => {
    sql += `INSERT INTO tables (id, restaurant_id, table_number, capacity, min_capacity, location, is_active, notes, created_at, updated_at) VALUES ('${t.id}', '${t.restaurant_id}', '${t.table_number}', ${t.capacity}, ${t.min_capacity}, '${t.location}', ${t.is_active}, ${t.notes ? `'${t.notes}'` : 'NULL'}, '${now}', '${now}');\n`;
  });

  sql += '\n-- RESTAURANT_HOURS\n';
  restaurantHours.forEach(h => {
    sql += `INSERT INTO restaurant_hours (id, restaurant_id, day_of_week, open_time, close_time, is_closed, last_reservation_time, created_at, updated_at) VALUES ('${h.id}', '${h.restaurant_id}', '${h.day_of_week}', ${h.open_time ? `'${h.open_time}'` : 'NULL'}, ${h.close_time ? `'${h.close_time}'` : 'NULL'}, ${h.is_closed}, ${h.last_reservation_time ? `'${h.last_reservation_time}'` : 'NULL'}, '${now}', '${now}');\n`;
  });

  sql += '\n-- REVIEWS\n';
  reviews.forEach(r => {
    sql += `INSERT INTO reviews (id, user_id, restaurant_id, overall_rating, food_rating, service_rating, ambiance_rating, value_rating, comment, visit_date, photos, is_verified, helpful_count, created_at, updated_at) VALUES ('${r.id}', '${r.user_id}', '${r.restaurant_id}', ${r.overall_rating}, ${r.food_rating}, ${r.service_rating}, ${r.ambiance_rating}, ${r.value_rating}, '${r.comment.replace(/'/g, "''")}', '${r.visit_date}', ARRAY[]::text[], ${r.is_verified}, ${r.helpful_count}, '${now}', '${now}');\n`;
  });

  sql += '\n-- RESERVATIONS\n';
  reservations.forEach(r => {
    const dietaryArr = r.dietary_restrictions ? `ARRAY[${r.dietary_restrictions.map((d: string) => `'${d}'`).join(', ')}]` : 'NULL';
    sql += `INSERT INTO reservations (id, user_id, restaurant_id, table_id, date_time, party_size, status, special_requests, dietary_restrictions, occasion_type, confirmation_code, guest_info, confirmed_at, seated_at, completed_at, cancelled_at, cancellation_reason, has_preferences, modification_count, points_awarded, created_at, updated_at) VALUES ('${r.id}', '${r.user_id}', '${r.restaurant_id}', '${r.table_id}', '${r.date_time}', ${r.party_size}, '${r.status}', ${r.special_requests ? `'${r.special_requests}'` : 'NULL'}, ${dietaryArr}, '${r.occasion_type}', '${r.confirmation_code}', '${r.guest_info}', ${r.confirmed_at ? `'${r.confirmed_at}'` : 'NULL'}, ${r.seated_at ? `'${r.seated_at}'` : 'NULL'}, ${r.completed_at ? `'${r.completed_at}'` : 'NULL'}, ${r.cancelled_at ? `'${r.cancelled_at}'` : 'NULL'}, ${r.cancellation_reason ? `'${r.cancellation_reason}'` : 'NULL'}, ${r.has_preferences}, ${r.modification_count}, ${r.points_awarded}, '${now}', '${now}');\n`;
  });

  return sql;
};

// Export data for API use
export const getSeedData = () => {
  const restaurantIds = restaurants.map(r => r.id);
  const userIds = users.slice(0, 20).map(u => u.id);
  const tables = generateTables(restaurantIds);
  const tableIds = tables.map(t => t.id);

  return {
    users,
    restaurants,
    tables,
    reviews: generateReviews(userIds, restaurantIds),
    reservations: generateReservations(userIds, restaurantIds, tableIds),
    restaurantHours: generateRestaurantHours(restaurantIds),
  };
};

// CLI execution
if (require.main === module) {
  console.log(generateInsertSQL());
}


