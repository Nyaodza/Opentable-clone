// Performance Tests for OpenTable Clone
describe('Performance Tests', () => {
    test('dashboard rendering performance', async () => {
        const startTime = performance.now();
        
        const dashboard = renderDashboard({
            loyaltyData: generateLargeDataset('loyalty', 1000),
            vrExperiences: generateLargeDataset('vr', 100),
            socialGroups: generateLargeDataset('social', 50)
        });
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    test('WebSocket message processing performance', async () => {
        const messages = Array.from({ length: 1000 }, (_, i) => ({
            type: 'LOYALTY_UPDATE',
            tokenBalance: 1250 + i,
            timestamp: Date.now()
        }));

        const startTime = performance.now();
        
        messages.forEach(message => {
            simulateWebSocketMessage(message);
        });
        
        const processTime = performance.now() - startTime;
        expect(processTime).toBeLessThan(500); // Should process 1000 messages within 500ms
    });

    test('large restaurant list rendering', async () => {
        const restaurants = generateLargeDataset('restaurants', 1000);
        
        const startTime = performance.now();
        const restaurantList = renderRestaurantList(restaurants);
        const renderTime = performance.now() - startTime;
        
        expect(renderTime).toBeLessThan(200);
        expect(restaurantList.children.length).toBe(1000);
    });

    test('search and filter performance', async () => {
        const restaurants = generateLargeDataset('restaurants', 5000);
        
        const startTime = performance.now();
        const filteredResults = filterRestaurants(restaurants, {
            cuisine: 'Italian',
            priceRange: '$$$',
            rating: 4.0
        });
        const filterTime = performance.now() - startTime;
        
        expect(filterTime).toBeLessThan(50); // Should filter 5000 items within 50ms
        expect(filteredResults.length).toBeGreaterThan(0);
    });

    test('memory usage during heavy operations', () => {
        const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        // Simulate heavy dashboard usage
        for (let i = 0; i < 100; i++) {
            const dashboard = renderDashboard({
                loyaltyData: generateLargeDataset('loyalty', 100),
                vrExperiences: generateLargeDataset('vr', 50)
            });
            // Cleanup
            dashboard.remove();
        }
        
        // Force garbage collection if available
        if (global.gc) global.gc();
        
        const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        const memoryIncrease = finalMemory - initialMemory;
        
        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('concurrent WebSocket connections', async () => {
        const connections = Array.from({ length: 10 }, () => new MockWebSocket());
        
        const startTime = performance.now();
        
        // Simulate concurrent messages
        const promises = connections.map(ws => 
            simulateConcurrentMessages(ws, 100)
        );
        
        await Promise.all(promises);
        
        const totalTime = performance.now() - startTime;
        expect(totalTime).toBeLessThan(1000); // Should handle 1000 concurrent messages within 1s
    });
});

// Performance utility functions
function generateLargeDataset(type, count) {
    switch (type) {
        case 'loyalty':
            return Array.from({ length: count }, (_, i) => ({
                id: i,
                type: i % 3 === 0 ? 'earn' : i % 3 === 1 ? 'redeem' : 'stake',
                amount: Math.floor(Math.random() * 500) + 10,
                date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
            }));
        
        case 'vr':
            return Array.from({ length: count }, (_, i) => ({
                id: i,
                title: `VR Experience ${i}`,
                price: Math.floor(Math.random() * 200) + 50,
                duration: Math.floor(Math.random() * 120) + 30,
                rating: (Math.random() * 2 + 3).toFixed(1)
            }));
        
        case 'social':
            return Array.from({ length: count }, (_, i) => ({
                id: i,
                name: `Group ${i}`,
                members: Math.floor(Math.random() * 20) + 2,
                maxMembers: Math.floor(Math.random() * 10) + 15,
                status: i % 2 === 0 ? 'voting' : 'confirmed'
            }));
        
        case 'restaurants':
            return Array.from({ length: count }, (_, i) => ({
                id: i,
                name: `Restaurant ${i}`,
                cuisine: ['Italian', 'Asian', 'American', 'French'][i % 4],
                rating: (Math.random() * 2 + 3).toFixed(1),
                priceRange: ['$', '$$', '$$$', '$$$$'][i % 4],
                location: `Location ${i}`
            }));
        
        default:
            return [];
    }
}

function filterRestaurants(restaurants, filters) {
    return restaurants.filter(restaurant => {
        if (filters.cuisine && restaurant.cuisine !== filters.cuisine) return false;
        if (filters.priceRange && restaurant.priceRange !== filters.priceRange) return false;
        if (filters.rating && parseFloat(restaurant.rating) < filters.rating) return false;
        return true;
    });
}

function simulateConcurrentMessages(ws, count) {
    return new Promise(resolve => {
        let processed = 0;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                ws.simulateMessage({
                    type: 'LOYALTY_UPDATE',
                    tokenBalance: 1000 + i,
                    timestamp: Date.now()
                });
                
                processed++;
                if (processed === count) resolve();
            }, Math.random() * 100);
        }
    });
}

class MockWebSocket {
    constructor() {
        this.onmessage = null;
        this.messageQueue = [];
    }
    
    simulateMessage(data) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        } else {
            this.messageQueue.push(data);
        }
    }
    
    setOnMessage(handler) {
        this.onmessage = handler;
        // Process queued messages
        this.messageQueue.forEach(data => {
            handler({ data: JSON.stringify(data) });
        });
        this.messageQueue = [];
    }
}
