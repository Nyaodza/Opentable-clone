/**
 * Simple API Server with Sample Data
 * Run with: node simple-api-server.js
 * This serves sample data for the OpenTable Clone frontend
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// ================================
// SAMPLE DATA - 30 entries each
// ================================

// Users (30)
const users = [
  { id: '1', firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '+1-555-0101', role: 'diner', loyaltyPoints: 1250 },
  { id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com', phone: '+1-555-0102', role: 'diner', loyaltyPoints: 2500 },
  { id: '3', firstName: 'Michael', lastName: 'Williams', email: 'michael.w@email.com', phone: '+1-555-0103', role: 'diner', loyaltyPoints: 800 },
  { id: '4', firstName: 'Emily', lastName: 'Brown', email: 'emily.b@email.com', phone: '+1-555-0104', role: 'diner', loyaltyPoints: 3200 },
  { id: '5', firstName: 'David', lastName: 'Jones', email: 'david.jones@email.com', phone: '+1-555-0105', role: 'diner', loyaltyPoints: 150 },
  { id: '6', firstName: 'Jessica', lastName: 'Garcia', email: 'jess.garcia@email.com', phone: '+1-555-0106', role: 'diner', loyaltyPoints: 4500 },
  { id: '7', firstName: 'Robert', lastName: 'Miller', email: 'robert.m@email.com', phone: '+1-555-0107', role: 'diner', loyaltyPoints: 950 },
  { id: '8', firstName: 'Amanda', lastName: 'Davis', email: 'amanda.d@email.com', phone: '+1-555-0108', role: 'diner', loyaltyPoints: 2100 },
  { id: '9', firstName: 'James', lastName: 'Martinez', email: 'james.martinez@email.com', phone: '+1-555-0109', role: 'diner', loyaltyPoints: 780 },
  { id: '10', firstName: 'Ashley', lastName: 'Anderson', email: 'ashley.a@email.com', phone: '+1-555-0110', role: 'diner', loyaltyPoints: 5600 },
  { id: '11', firstName: 'Christopher', lastName: 'Taylor', email: 'chris.t@email.com', phone: '+1-555-0111', role: 'diner', loyaltyPoints: 320 },
  { id: '12', firstName: 'Nicole', lastName: 'Thomas', email: 'nicole.t@email.com', phone: '+1-555-0112', role: 'diner', loyaltyPoints: 1800 },
  { id: '13', firstName: 'Matthew', lastName: 'Hernandez', email: 'matt.h@email.com', phone: '+1-555-0113', role: 'diner', loyaltyPoints: 650 },
  { id: '14', firstName: 'Stephanie', lastName: 'Moore', email: 'steph.m@email.com', phone: '+1-555-0114', role: 'diner', loyaltyPoints: 4200 },
  { id: '15', firstName: 'Daniel', lastName: 'Jackson', email: 'dan.jackson@email.com', phone: '+1-555-0115', role: 'diner', loyaltyPoints: 1100 },
  { id: '16', firstName: 'Jennifer', lastName: 'White', email: 'jen.white@email.com', phone: '+1-555-0116', role: 'diner', loyaltyPoints: 890 },
  { id: '17', firstName: 'Anthony', lastName: 'Harris', email: 'anthony.h@email.com', phone: '+1-555-0117', role: 'diner', loyaltyPoints: 2750 },
  { id: '18', firstName: 'Elizabeth', lastName: 'Martin', email: 'liz.martin@email.com', phone: '+1-555-0118', role: 'diner', loyaltyPoints: 3100 },
  { id: '19', firstName: 'Kevin', lastName: 'Thompson', email: 'kevin.t@email.com', phone: '+1-555-0119', role: 'diner', loyaltyPoints: 450 },
  { id: '20', firstName: 'Melissa', lastName: 'Robinson', email: 'melissa.r@email.com', phone: '+1-555-0120', role: 'diner', loyaltyPoints: 1950 },
  { id: '21', firstName: 'Marco', lastName: 'Rossi', email: 'marco@italianplace.com', phone: '+1-555-0201', role: 'owner', loyaltyPoints: 0 },
  { id: '22', firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki@sushimaster.com', phone: '+1-555-0202', role: 'owner', loyaltyPoints: 0 },
  { id: '23', firstName: 'Pierre', lastName: 'Dupont', email: 'pierre@frenchbistro.com', phone: '+1-555-0203', role: 'owner', loyaltyPoints: 0 },
  { id: '24', firstName: 'Carlos', lastName: 'Rivera', email: 'carlos@mexicangrill.com', phone: '+1-555-0204', role: 'owner', loyaltyPoints: 0 },
  { id: '25', firstName: 'Raj', lastName: 'Patel', email: 'raj@indianspice.com', phone: '+1-555-0205', role: 'owner', loyaltyPoints: 0 },
  { id: '26', firstName: 'Admin', lastName: 'User', email: 'admin@opentable.com', phone: '+1-555-0301', role: 'admin', loyaltyPoints: 0 },
  { id: '27', firstName: 'Support', lastName: 'Team', email: 'support@opentable.com', phone: '+1-555-0302', role: 'admin', loyaltyPoints: 0 },
  { id: '28', firstName: 'Manager', lastName: 'One', email: 'manager1@opentable.com', phone: '+1-555-0303', role: 'admin', loyaltyPoints: 0 },
  { id: '29', firstName: 'Manager', lastName: 'Two', email: 'manager2@opentable.com', phone: '+1-555-0304', role: 'admin', loyaltyPoints: 0 },
  { id: '30', firstName: 'Super', lastName: 'Admin', email: 'superadmin@opentable.com', phone: '+1-555-0305', role: 'admin', loyaltyPoints: 0 },
];

// Restaurants (30)
const restaurants = [
  { id: '1', name: 'Trattoria Milano', description: 'Authentic Italian cuisine with handmade pasta and wood-fired pizzas.', cuisineType: 'Italian', address: '123 Main Street', city: 'San Francisco', state: 'CA', zipCode: '94102', country: 'USA', latitude: 37.7749, longitude: -122.4194, phone: '+1-415-555-0001', email: 'info@trattoriamilano.com', website: 'https://trattoriamilano.com', priceRange: '$$$', totalCapacity: 80, images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'], amenities: ['WiFi', 'Outdoor Seating', 'Private Dining', 'Full Bar'], averageRating: 4.7, totalReviews: 342, isActive: true },
  { id: '2', name: 'Pasta Paradise', description: 'Traditional Italian pasta and pizza made with imported ingredients.', cuisineType: 'Italian', address: '456 Oak Avenue', city: 'San Francisco', state: 'CA', zipCode: '94103', country: 'USA', latitude: 37.7751, longitude: -122.4180, phone: '+1-415-555-0002', email: 'info@pastaparadise.com', website: 'https://pastaparadise.com', priceRange: '$$', totalCapacity: 60, images: ['https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800'], amenities: ['WiFi', 'Takeout', 'Delivery'], averageRating: 4.5, totalReviews: 256, isActive: true },
  { id: '3', name: 'Bella Napoli', description: 'Neapolitan-style pizzeria with certified VPN pizzas.', cuisineType: 'Italian', address: '789 Pine Street', city: 'San Francisco', state: 'CA', zipCode: '94104', country: 'USA', latitude: 37.7755, longitude: -122.4170, phone: '+1-415-555-0003', email: 'info@bellanapoli.com', website: 'https://bellanapoli.com', priceRange: '$$', totalCapacity: 45, images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'], amenities: ['WiFi', 'Outdoor Seating'], averageRating: 4.8, totalReviews: 189, isActive: true },
  { id: '4', name: 'Ristorante Venezia', description: 'Upscale Italian dining featuring fresh seafood and regional wines.', cuisineType: 'Italian', address: '321 Market Street', city: 'San Francisco', state: 'CA', zipCode: '94105', country: 'USA', latitude: 37.7760, longitude: -122.4160, phone: '+1-415-555-0004', email: 'info@venezia.com', website: 'https://ristorantevenezia.com', priceRange: '$$$$', totalCapacity: 70, images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=800'], amenities: ['WiFi', 'Private Dining', 'Valet Parking', 'Full Bar'], averageRating: 4.9, totalReviews: 412, isActive: true },
  { id: '5', name: 'Osteria Toscana', description: 'Rustic Tuscan cuisine in a warm, inviting atmosphere.', cuisineType: 'Italian', address: '654 Union Street', city: 'San Francisco', state: 'CA', zipCode: '94106', country: 'USA', latitude: 37.7765, longitude: -122.4150, phone: '+1-415-555-0005', email: 'info@osteriatoscana.com', website: 'https://osteriatoscana.com', priceRange: '$$$', totalCapacity: 55, images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'], amenities: ['WiFi', 'Outdoor Seating', 'Full Bar'], averageRating: 4.6, totalReviews: 278, isActive: true },
  { id: '6', name: 'Sakura Sushi House', description: 'Authentic Japanese sushi and sashimi prepared by master chefs.', cuisineType: 'Japanese', address: '111 Cherry Blossom Lane', city: 'San Francisco', state: 'CA', zipCode: '94107', country: 'USA', latitude: 37.7770, longitude: -122.4140, phone: '+1-415-555-0006', email: 'info@sakurasushi.com', website: 'https://sakurasushi.com', priceRange: '$$$$', totalCapacity: 40, images: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800'], amenities: ['Sushi Bar', 'Private Rooms', 'Sake Selection'], averageRating: 4.9, totalReviews: 567, isActive: true },
  { id: '7', name: 'Tokyo Ramen', description: 'Traditional Japanese ramen with rich, flavorful broths.', cuisineType: 'Japanese', address: '222 Noodle Street', city: 'San Francisco', state: 'CA', zipCode: '94108', country: 'USA', latitude: 37.7775, longitude: -122.4130, phone: '+1-415-555-0007', email: 'info@tokyoramen.com', website: 'https://tokyoramen.com', priceRange: '$$', totalCapacity: 35, images: ['https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800'], amenities: ['Counter Seating', 'Takeout'], averageRating: 4.6, totalReviews: 423, isActive: true },
  { id: '8', name: 'Izakaya Zen', description: 'Japanese pub-style dining with small plates and sake.', cuisineType: 'Japanese', address: '333 Sake Avenue', city: 'San Francisco', state: 'CA', zipCode: '94109', country: 'USA', latitude: 37.7780, longitude: -122.4120, phone: '+1-415-555-0008', email: 'info@izakayazen.com', website: 'https://izakayazen.com', priceRange: '$$$', totalCapacity: 50, images: ['https://images.unsplash.com/photo-1553621042-f6e147245754?w=800'], amenities: ['Full Bar', 'Late Night', 'Private Rooms'], averageRating: 4.5, totalReviews: 312, isActive: true },
  { id: '9', name: 'Omakase Master', description: 'Premium omakase experience with seasonal ingredients.', cuisineType: 'Japanese', address: '444 Chef Street', city: 'San Francisco', state: 'CA', zipCode: '94110', country: 'USA', latitude: 37.7785, longitude: -122.4110, phone: '+1-415-555-0009', email: 'info@omakasemaster.com', website: 'https://omakasemaster.com', priceRange: '$$$$', totalCapacity: 16, images: ['https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800'], amenities: ['Omakase Only', 'Counter Seating'], averageRating: 4.9, totalReviews: 234, isActive: true },
  { id: '10', name: 'Tempura House', description: 'Crispy, light tempura made with the finest ingredients.', cuisineType: 'Japanese', address: '555 Fry Lane', city: 'San Francisco', state: 'CA', zipCode: '94111', country: 'USA', latitude: 37.7790, longitude: -122.4100, phone: '+1-415-555-0010', email: 'info@tempurahouse.com', website: 'https://tempurahouse.com', priceRange: '$$$', totalCapacity: 40, images: ['https://images.unsplash.com/photo-1578674473215-9e07ee2e577d?w=800'], amenities: ['Counter Seating', 'Private Dining'], averageRating: 4.7, totalReviews: 189, isActive: true },
  { id: '11', name: 'Le Petit Bistro', description: 'Classic French bistro with a modern twist.', cuisineType: 'French', address: '666 Paris Street', city: 'San Francisco', state: 'CA', zipCode: '94112', country: 'USA', latitude: 37.7795, longitude: -122.4090, phone: '+1-415-555-0011', email: 'info@lepetitbistro.com', website: 'https://lepetitbistro.com', priceRange: '$$$', totalCapacity: 55, images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'], amenities: ['Wine Cellar', 'Outdoor Seating', 'Private Dining'], averageRating: 4.8, totalReviews: 298, isActive: true },
  { id: '12', name: 'Brasserie Lyon', description: 'Traditional French brasserie cuisine.', cuisineType: 'French', address: '777 Lyon Avenue', city: 'San Francisco', state: 'CA', zipCode: '94113', country: 'USA', latitude: 37.7800, longitude: -122.4080, phone: '+1-415-555-0012', email: 'info@brasserielyon.com', website: 'https://brasserielyon.com', priceRange: '$$', totalCapacity: 70, images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800'], amenities: ['Full Bar', 'Outdoor Seating'], averageRating: 4.5, totalReviews: 367, isActive: true },
  { id: '13', name: 'Maison Belle', description: 'Elegant French fine dining experience.', cuisineType: 'French', address: '888 Elegant Way', city: 'San Francisco', state: 'CA', zipCode: '94114', country: 'USA', latitude: 37.7805, longitude: -122.4070, phone: '+1-415-555-0013', email: 'info@maisonbelle.com', website: 'https://maisonbelle.com', priceRange: '$$$$', totalCapacity: 45, images: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'], amenities: ['Wine Cellar', 'Valet Parking', 'Private Dining', 'Tasting Menu'], averageRating: 4.9, totalReviews: 234, isActive: true },
  { id: '14', name: 'Café de Provence', description: 'Southern French cuisine with Mediterranean influences.', cuisineType: 'French', address: '999 Provence Road', city: 'San Francisco', state: 'CA', zipCode: '94115', country: 'USA', latitude: 37.7810, longitude: -122.4060, phone: '+1-415-555-0014', email: 'info@cafedeprovence.com', website: 'https://cafedeprovence.com', priceRange: '$$$', totalCapacity: 50, images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'], amenities: ['Outdoor Seating', 'Wine Selection', 'Brunch'], averageRating: 4.6, totalReviews: 276, isActive: true },
  { id: '15', name: 'Crêperie Bretonne', description: 'Authentic Breton crêpes and galettes.', cuisineType: 'French', address: '101 Crêpe Lane', city: 'San Francisco', state: 'CA', zipCode: '94116', country: 'USA', latitude: 37.7815, longitude: -122.4050, phone: '+1-415-555-0015', email: 'info@creperie.com', website: 'https://creperiebretonne.com', priceRange: '$$', totalCapacity: 35, images: ['https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800'], amenities: ['Outdoor Seating', 'Takeout', 'Cider Selection'], averageRating: 4.7, totalReviews: 198, isActive: true },
  { id: '16', name: 'Casa Oaxaca', description: 'Authentic Oaxacan cuisine with handmade tortillas.', cuisineType: 'Mexican', address: '202 Mexico Way', city: 'San Francisco', state: 'CA', zipCode: '94117', country: 'USA', latitude: 37.7820, longitude: -122.4040, phone: '+1-415-555-0016', email: 'info@casaoaxaca.com', website: 'https://casaoaxaca.com', priceRange: '$$', totalCapacity: 60, images: ['https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800'], amenities: ['Full Bar', 'Live Music', 'Outdoor Seating'], averageRating: 4.6, totalReviews: 445, isActive: true },
  { id: '17', name: 'Taqueria Guadalajara', description: 'Street-style tacos and Mexican favorites.', cuisineType: 'Mexican', address: '303 Taco Street', city: 'San Francisco', state: 'CA', zipCode: '94118', country: 'USA', latitude: 37.7825, longitude: -122.4030, phone: '+1-415-555-0017', email: 'info@taqueriag.com', website: 'https://taqueriaguadalajara.com', priceRange: '$', totalCapacity: 40, images: ['https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800'], amenities: ['Takeout', 'Late Night', 'Catering'], averageRating: 4.7, totalReviews: 678, isActive: true },
  { id: '18', name: 'El Jardín', description: 'Upscale Mexican cuisine with garden seating.', cuisineType: 'Mexican', address: '404 Garden Way', city: 'San Francisco', state: 'CA', zipCode: '94119', country: 'USA', latitude: 37.7830, longitude: -122.4020, phone: '+1-415-555-0018', email: 'info@eljardin.com', website: 'https://eljardin.com', priceRange: '$$$', totalCapacity: 75, images: ['https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800'], amenities: ['Garden Seating', 'Full Bar', 'Private Events'], averageRating: 4.8, totalReviews: 312, isActive: true },
  { id: '19', name: 'Cantina Moderna', description: 'Modern Mexican with innovative cocktails.', cuisineType: 'Mexican', address: '505 Modern Blvd', city: 'San Francisco', state: 'CA', zipCode: '94120', country: 'USA', latitude: 37.7835, longitude: -122.4010, phone: '+1-415-555-0019', email: 'info@cantinamoderna.com', website: 'https://cantinamoderna.com', priceRange: '$$$', totalCapacity: 65, images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'], amenities: ['Craft Cocktails', 'DJ', 'Late Night'], averageRating: 4.5, totalReviews: 234, isActive: true },
  { id: '20', name: 'Mariscos del Pacifico', description: 'Fresh Mexican seafood specialties.', cuisineType: 'Mexican', address: '606 Ocean Drive', city: 'San Francisco', state: 'CA', zipCode: '94121', country: 'USA', latitude: 37.7840, longitude: -122.4000, phone: '+1-415-555-0020', email: 'info@mariscos.com', website: 'https://mariscosdelpacifico.com', priceRange: '$$', totalCapacity: 55, images: ['https://images.unsplash.com/photo-1579631542720-3a87824fff86?w=800'], amenities: ['Ocean View', 'Full Bar', 'Fresh Catch'], averageRating: 4.6, totalReviews: 289, isActive: true },
  { id: '21', name: 'Taj Palace', description: 'Royal Indian cuisine with elegant ambiance.', cuisineType: 'Indian', address: '707 Spice Road', city: 'San Francisco', state: 'CA', zipCode: '94122', country: 'USA', latitude: 37.7845, longitude: -122.3990, phone: '+1-415-555-0021', email: 'info@tajpalace.com', website: 'https://tajpalace.com', priceRange: '$$$', totalCapacity: 80, images: ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'], amenities: ['Private Dining', 'Live Music', 'Full Bar'], averageRating: 4.7, totalReviews: 456, isActive: true },
  { id: '22', name: 'Mumbai Street Kitchen', description: 'Authentic Mumbai street food experience.', cuisineType: 'Indian', address: '808 Chaat Lane', city: 'San Francisco', state: 'CA', zipCode: '94123', country: 'USA', latitude: 37.7850, longitude: -122.3980, phone: '+1-415-555-0022', email: 'info@mumbaistreet.com', website: 'https://mumbaikitchen.com', priceRange: '$', totalCapacity: 35, images: ['https://images.unsplash.com/photo-1567337710282-00832b415979?w=800'], amenities: ['Takeout', 'Counter Service', 'Vegetarian Options'], averageRating: 4.5, totalReviews: 523, isActive: true },
  { id: '23', name: 'Kerala Kitchen', description: 'South Indian coastal cuisine.', cuisineType: 'Indian', address: '909 Coconut Way', city: 'San Francisco', state: 'CA', zipCode: '94124', country: 'USA', latitude: 37.7855, longitude: -122.3970, phone: '+1-415-555-0023', email: 'info@keralakitchen.com', website: 'https://keralakitchen.com', priceRange: '$$', totalCapacity: 45, images: ['https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=800'], amenities: ['Vegetarian Options', 'Banana Leaf Service'], averageRating: 4.6, totalReviews: 312, isActive: true },
  { id: '24', name: 'Punjabi Dhaba', description: 'Hearty North Indian truck stop style food.', cuisineType: 'Indian', address: '111 Tandoor Street', city: 'San Francisco', state: 'CA', zipCode: '94125', country: 'USA', latitude: 37.7860, longitude: -122.3960, phone: '+1-415-555-0024', email: 'info@punjabidhaba.com', website: 'https://punjabidhaba.com', priceRange: '$$', totalCapacity: 50, images: ['https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800'], amenities: ['Family Style', 'Takeout', 'Catering'], averageRating: 4.7, totalReviews: 467, isActive: true },
  { id: '25', name: 'Masala Art', description: 'Contemporary Indian fusion cuisine.', cuisineType: 'Indian', address: '222 Fusion Drive', city: 'San Francisco', state: 'CA', zipCode: '94126', country: 'USA', latitude: 37.7865, longitude: -122.3950, phone: '+1-415-555-0025', email: 'info@masalaart.com', website: 'https://masalaart.com', priceRange: '$$$', totalCapacity: 55, images: ['https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800'], amenities: ['Tasting Menu', 'Wine Pairing', 'Private Dining'], averageRating: 4.8, totalReviews: 289, isActive: true },
  { id: '26', name: 'The Modern Bistro', description: 'Contemporary American cuisine with seasonal menus.', cuisineType: 'American', address: '333 Modern Lane', city: 'San Francisco', state: 'CA', zipCode: '94127', country: 'USA', latitude: 37.7870, longitude: -122.3940, phone: '+1-415-555-0026', email: 'info@modernbistro.com', website: 'https://modernbistro.com', priceRange: '$$$', totalCapacity: 65, images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'], amenities: ['Private Dining', 'Full Bar', 'Seasonal Menu'], averageRating: 4.8, totalReviews: 534, isActive: true },
  { id: '27', name: 'Smokehouse BBQ', description: 'Texas-style BBQ with house-smoked meats.', cuisineType: 'American', address: '444 Smoke Street', city: 'San Francisco', state: 'CA', zipCode: '94128', country: 'USA', latitude: 37.7875, longitude: -122.3930, phone: '+1-415-555-0027', email: 'info@smokehousebbq.com', website: 'https://smokehousebbq.com', priceRange: '$$', totalCapacity: 80, images: ['https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800'], amenities: ['Outdoor Seating', 'Full Bar', 'Live Music'], averageRating: 4.6, totalReviews: 678, isActive: true },
  { id: '28', name: 'Farm & Table', description: 'Farm-to-table American cuisine.', cuisineType: 'American', address: '555 Farm Road', city: 'San Francisco', state: 'CA', zipCode: '94129', country: 'USA', latitude: 37.7880, longitude: -122.3920, phone: '+1-415-555-0028', email: 'info@farmandtable.com', website: 'https://farmandtable.com', priceRange: '$$$', totalCapacity: 50, images: ['https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800'], amenities: ['Garden Seating', 'Organic Menu', 'Private Dining'], averageRating: 4.7, totalReviews: 345, isActive: true },
  { id: '29', name: 'Burger Joint', description: 'Gourmet burgers and craft beers.', cuisineType: 'American', address: '666 Burger Blvd', city: 'San Francisco', state: 'CA', zipCode: '94130', country: 'USA', latitude: 37.7885, longitude: -122.3910, phone: '+1-415-555-0029', email: 'info@burgerjoint.com', website: 'https://burgerjoint.com', priceRange: '$$', totalCapacity: 60, images: ['https://images.unsplash.com/photo-1550547660-d9450f859349?w=800'], amenities: ['Craft Beer', 'Sports TV', 'Outdoor Seating'], averageRating: 4.5, totalReviews: 789, isActive: true },
  { id: '30', name: 'Coastal Kitchen', description: 'Pacific Northwest seafood and oyster bar.', cuisineType: 'American', address: '777 Coast Highway', city: 'San Francisco', state: 'CA', zipCode: '94131', country: 'USA', latitude: 37.7890, longitude: -122.3900, phone: '+1-415-555-0030', email: 'info@coastalkitchen.com', website: 'https://coastalkitchen.com', priceRange: '$$$', totalCapacity: 70, images: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'], amenities: ['Oyster Bar', 'Ocean View', 'Full Bar'], averageRating: 4.7, totalReviews: 456, isActive: true },
];

// Generate reviews for each restaurant
const reviewComments = [
  'Absolutely fantastic experience! The food was incredible.',
  'Great atmosphere and delicious food. Will definitely come back!',
  'One of the best meals I have ever had. Highly recommend!',
  'Good food but service was a bit slow. Overall enjoyable.',
  'Perfect for a special occasion. Everything was exceptional.',
];

const generateReviews = () => {
  const reviews = [];
  let reviewId = 1;
  restaurants.forEach((restaurant, index) => {
    for (let i = 0; i < 5; i++) {
      reviews.push({
        id: String(reviewId++),
        userId: users[i % 20].id,
        userName: `${users[i % 20].firstName} ${users[i % 20].lastName.charAt(0)}.`,
        restaurantId: restaurant.id,
        rating: 4 + Math.floor(Math.random() * 2),
        comment: reviewComments[i],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        helpfulCount: Math.floor(Math.random() * 50),
      });
    }
  });
  return reviews;
};

const reviews = generateReviews();

// Generate reservations
const generateReservations = () => {
  const reservations = [];
  const statuses = ['confirmed', 'pending', 'completed'];
  for (let i = 0; i < 30; i++) {
    const futureDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const hour = 17 + Math.floor(Math.random() * 5);
    futureDate.setHours(hour, Math.random() > 0.5 ? 0 : 30, 0, 0);
    
    reservations.push({
      id: String(i + 1),
      userId: users[i % 20].id,
      restaurantId: restaurants[i % 30].id,
      restaurantName: restaurants[i % 30].name,
      dateTime: futureDate.toISOString(),
      partySize: 2 + Math.floor(Math.random() * 5),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      confirmationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
      specialRequests: i % 3 === 0 ? 'Window seat if possible' : null,
    });
  }
  return reservations;
};

const reservations = generateReservations();

// ================================
// API ROUTES
// ================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/disruptive/health', (req, res) => {
  res.json({ status: 'ok', features: ['blockchain', 'vr', 'voice', 'ai'], timestamp: new Date().toISOString() });
});

// Get all restaurants
app.get('/api/restaurants', (req, res) => {
  const { cuisine, priceRange, search, limit = 30, page = 1 } = req.query;
  
  let filtered = [...restaurants];
  
  if (cuisine && cuisine !== 'All') {
    filtered = filtered.filter(r => r.cuisineType.toLowerCase() === cuisine.toString().toLowerCase());
  }
  
  if (priceRange && priceRange !== 'All') {
    filtered = filtered.filter(r => r.priceRange === priceRange);
  }
  
  if (search) {
    const searchLower = search.toString().toLowerCase();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(searchLower) ||
      r.cuisineType.toLowerCase().includes(searchLower) ||
      r.city.toLowerCase().includes(searchLower)
    );
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const paginated = filtered.slice(startIndex, startIndex + Number(limit));
  
  res.json({
    data: {
      restaurants: paginated,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
    }
  });
});

// Get restaurant by ID
app.get('/api/restaurants/:id', (req, res) => {
  const restaurant = restaurants.find(r => r.id === req.params.id);
  
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  
  res.json({ data: restaurant });
});

// Get restaurant availability
app.get('/api/restaurants/:id/availability', (req, res) => {
  const { date, partySize } = req.query;
  
  // Generate mock availability slots
  const slots = [];
  for (let hour = 11; hour <= 21; hour++) {
    for (const minute of ['00', '30']) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: Math.random() > 0.3,
        seatsAvailable: Math.floor(Math.random() * 10) + 1,
      });
    }
  }
  
  res.json({
    data: {
      restaurantId: req.params.id,
      date: date || new Date().toISOString().split('T')[0],
      slots,
    }
  });
});

// Get restaurant reviews
app.get('/api/restaurants/:id/reviews', (req, res) => {
  const restaurantReviews = reviews.filter(r => r.restaurantId === req.params.id);
  
  res.json({
    data: {
      reviews: restaurantReviews,
      total: restaurantReviews.length,
    }
  });
});

// Get restaurant menu
app.get('/api/restaurants/:id/menu', (req, res) => {
  const menuItems = [
    { id: '1', name: 'Signature Appetizer', description: 'Chef special starter', price: 18, category: 'Appetizers' },
    { id: '2', name: 'House Salad', description: 'Fresh greens with house vinaigrette', price: 14, category: 'Appetizers' },
    { id: '3', name: 'Soup of the Day', description: 'Ask your server', price: 12, category: 'Appetizers' },
    { id: '4', name: 'Main Course Special', description: 'Chef daily selection', price: 42, category: 'Entrees' },
    { id: '5', name: 'Grilled Fish', description: 'Fresh catch with seasonal vegetables', price: 38, category: 'Entrees' },
    { id: '6', name: 'Pasta Primavera', description: 'Seasonal vegetables with house pasta', price: 28, category: 'Entrees' },
    { id: '7', name: 'Steak Frites', description: '8oz ribeye with fries', price: 45, category: 'Entrees' },
    { id: '8', name: 'Chocolate Fondant', description: 'Rich chocolate dessert', price: 16, category: 'Desserts' },
    { id: '9', name: 'Crème Brûlée', description: 'Classic French dessert', price: 14, category: 'Desserts' },
    { id: '10', name: 'Seasonal Sorbet', description: 'House-made sorbet selection', price: 10, category: 'Desserts' },
  ];
  
  res.json({
    data: {
      items: menuItems,
      restaurantId: req.params.id,
    }
  });
});

// Create reservation
app.post('/api/reservations', (req, res) => {
  const { restaurantId, date, time, partySize, firstName, lastName, email, phone, specialRequests, occasion } = req.body;
  
  const newReservation = {
    id: String(reservations.length + 1),
    restaurantId,
    restaurantName: restaurants.find(r => r.id === restaurantId)?.name || 'Restaurant',
    dateTime: `${date}T${time}:00`,
    partySize: Number(partySize),
    status: 'confirmed',
    confirmationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
    guestName: `${firstName} ${lastName}`,
    email,
    phone,
    specialRequests,
    occasion,
    createdAt: new Date().toISOString(),
  };
  
  reservations.push(newReservation);
  
  res.status(201).json({
    data: newReservation,
    message: 'Reservation created successfully',
  });
});

// Get reservations
app.get('/api/reservations', (req, res) => {
  res.json({
    data: {
      reservations,
      total: reservations.length,
    }
  });
});

// Get all users (admin)
app.get('/api/users', (req, res) => {
  res.json({
    data: {
      users: users.map(u => ({ ...u, password: undefined })),
      total: users.length,
    }
  });
});

// Get all reviews
app.get('/api/reviews', (req, res) => {
  res.json({
    data: {
      reviews,
      total: reviews.length,
    }
  });
});

// Search endpoint
app.get('/api/restaurants/search', (req, res) => {
  const { q, cuisine, priceRange, location, date, time, partySize } = req.query;
  
  let filtered = [...restaurants];
  
  if (q) {
    const searchLower = q.toString().toLowerCase();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(searchLower) ||
      r.cuisineType.toLowerCase().includes(searchLower) ||
      r.description.toLowerCase().includes(searchLower)
    );
  }
  
  if (cuisine && cuisine !== 'All') {
    filtered = filtered.filter(r => r.cuisineType.toLowerCase() === cuisine.toString().toLowerCase());
  }
  
  if (priceRange && priceRange !== 'All') {
    filtered = filtered.filter(r => r.priceRange === priceRange);
  }
  
  if (location && location !== 'All') {
    const locationLower = location.toString().toLowerCase();
    filtered = filtered.filter(r => r.city.toLowerCase().includes(locationLower));
  }
  
  res.json({
    data: {
      restaurants: filtered,
      total: filtered.length,
    }
  });
});

// Booking availability
app.get('/api/bookings/availability', (req, res) => {
  const { restaurantId, date, partySize } = req.query;
  
  const slots = [];
  for (let hour = 11; hour <= 21; hour++) {
    for (const minute of ['00', '30']) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: Math.random() > 0.3,
        tables: Math.floor(Math.random() * 5) + 1,
      });
    }
  }
  
  res.json({
    data: {
      restaurantId,
      date,
      partySize,
      timeSlots: slots,
    }
  });
});

// Auth endpoints (mock)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({
    data: {
      user: { ...user, password: undefined },
      token: 'mock-jwt-token-' + user.id,
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;
  
  const newUser = {
    id: String(users.length + 1),
    firstName,
    lastName,
    email,
    phone,
    role: 'diner',
    loyaltyPoints: 0,
  };
  
  users.push(newUser);
  
  res.status(201).json({
    data: {
      user: newUser,
      token: 'mock-jwt-token-' + newUser.id,
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     OpenTable Clone API Server                         ║
║     Running on http://localhost:${PORT}                   ║
╠════════════════════════════════════════════════════════╣
║  Sample Data Loaded:                                   ║
║  • 30 Users (20 diners, 5 owners, 5 admins)           ║
║  • 30 Restaurants (6 cuisines)                        ║
║  • 150 Reviews (5 per restaurant)                     ║
║  • 30 Reservations                                    ║
╠════════════════════════════════════════════════════════╣
║  API Endpoints:                                        ║
║  GET  /health                    - Health check        ║
║  GET  /api/restaurants           - List restaurants    ║
║  GET  /api/restaurants/:id       - Restaurant details  ║
║  GET  /api/restaurants/:id/availability               ║
║  GET  /api/restaurants/:id/reviews                    ║
║  GET  /api/restaurants/:id/menu                       ║
║  GET  /api/restaurants/search    - Search restaurants  ║
║  POST /api/reservations          - Create reservation  ║
║  GET  /api/reservations          - List reservations   ║
║  GET  /api/users                 - List users          ║
║  GET  /api/reviews               - List all reviews    ║
║  POST /api/auth/login            - User login          ║
║  POST /api/auth/register         - User registration   ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;

