// Integration Tests for OpenTable Clone
describe('OpenTable Clone Integration Tests', () => {
    let mockServer, mockWebSocket;

    beforeEach(() => {
        // Mock API server
        mockServer = {
            health: () => Promise.resolve({ ok: true }),
            restaurants: () => Promise.resolve([
                { id: 1, name: 'Blockchain Bistro', cuisine: 'Modern', rating: 4.8 }
            ]),
            reservations: () => Promise.resolve([
                { id: 1, restaurant: 'Blockchain Bistro', date: '2024-08-20', time: '19:00' }
            ])
        };

        // Mock WebSocket
        mockWebSocket = {
            send: jest.fn(),
            close: jest.fn(),
            onmessage: null,
            onopen: null,
            onerror: null
        };
    });

    test('complete reservation flow with blockchain rewards', async () => {
        const app = renderApp();
        
        // Navigate to restaurants
        app.querySelector('[data-page="restaurants"]').click();
        await waitFor(() => app.querySelector('[data-testid="restaurant-list"]'));
        
        // Select restaurant
        app.querySelector('[data-testid="restaurant-card"]').click();
        
        // Make reservation
        const reservationForm = app.querySelector('[data-testid="reservation-form"]');
        fillForm(reservationForm, {
            date: '2024-08-20',
            time: '19:00',
            guests: '2'
        });
        
        app.querySelector('[data-testid="submit-reservation"]').click();
        
        // Verify blockchain reward notification
        await waitFor(() => app.querySelector('[data-testid="reward-notification"]'));
        expect(app.querySelector('[data-testid="reward-notification"]')).toContain('50 tokens earned');
    });

    test('VR experience booking flow', async () => {
        const app = renderApp();
        
        // Navigate to dashboard VR tab
        app.querySelector('[data-page="dashboard"]').click();
        app.querySelector('[data-tab="vr"]').click();
        
        // Book VR experience
        app.querySelector('[data-testid="book-vr-experience"]').click();
        
        // Fill booking form
        const bookingForm = app.querySelector('[data-testid="vr-booking-form"]');
        fillForm(bookingForm, {
            date: '2024-08-22',
            time: '15:00'
        });
        
        app.querySelector('[data-testid="confirm-vr-booking"]').click();
        
        // Verify booking confirmation
        await waitFor(() => app.querySelector('[data-testid="vr-booking-confirmation"]'));
        expect(app.querySelector('[data-testid="vr-booking-confirmation"]')).toContain('VR experience booked');
    });

    test('social dining group creation and voting', async () => {
        const app = renderApp();
        
        // Navigate to social dining
        app.querySelector('[data-page="dashboard"]').click();
        app.querySelector('[data-tab="social"]').click();
        
        // Create new group
        app.querySelector('[data-testid="create-group-btn"]').click();
        
        const groupForm = app.querySelector('[data-testid="group-creation-form"]');
        fillForm(groupForm, {
            name: 'Test Foodies',
            description: 'Testing group functionality',
            maxMembers: '8'
        });
        
        app.querySelector('[data-testid="submit-group"]').click();
        
        // Verify group creation
        await waitFor(() => app.querySelector('[data-testid="group-created-notification"]'));
        expect(app.querySelector('[data-testid="my-groups"]')).toContain('Test Foodies');
    });

    test('AI concierge conversation flow', async () => {
        const app = renderApp();
        
        // Navigate to AI concierge
        app.querySelector('[data-page="dashboard"]').click();
        app.querySelector('[data-tab="ai"]').click();
        
        // Send message to AI
        const chatInput = app.querySelector('[data-testid="chat-input"]');
        chatInput.value = 'Find me a romantic Italian restaurant for tonight';
        
        app.querySelector('[data-testid="chat-send"]').click();
        
        // Verify message appears in chat
        expect(app.querySelector('[data-testid="chat-messages"]')).toContain('romantic Italian restaurant');
        
        // Simulate AI response
        simulateAIResponse('I found 3 romantic Italian restaurants available tonight...');
        
        // Verify AI response appears
        await waitFor(() => app.querySelector('[data-testid="ai-response"]'));
        expect(app.querySelector('[data-testid="ai-response"]')).toContain('3 romantic Italian restaurants');
    });

    test('voice command device management', async () => {
        const app = renderApp();
        
        // Navigate to voice control
        app.querySelector('[data-page="dashboard"]').click();
        app.querySelector('[data-tab="voice"]').click();
        
        // Add new device
        app.querySelector('[data-testid="add-device-btn"]').click();
        
        const deviceForm = app.querySelector('[data-testid="device-form"]');
        fillForm(deviceForm, {
            name: 'Living Room Echo',
            type: 'alexa'
        });
        
        app.querySelector('[data-testid="connect-device"]').click();
        
        // Verify device appears in list
        await waitFor(() => app.querySelector('[data-testid="device-list"]'));
        expect(app.querySelector('[data-testid="device-list"]')).toContain('Living Room Echo');
    });

    test('sustainability tracking updates', async () => {
        const app = renderApp();
        
        // Navigate to sustainability dashboard
        app.querySelector('[data-page="dashboard"]').click();
        app.querySelector('[data-tab="sustainability"]').click();
        
        // Verify initial metrics
        expect(app.querySelector('[data-testid="carbon-footprint"]')).toContain('2.4 kg');
        
        // Simulate eco-friendly reservation
        simulateWebSocketMessage({
            type: 'SUSTAINABILITY_UPDATE',
            carbonFootprint: 2.2,
            ecoFriendlyVisits: 24
        });
        
        // Verify updated metrics
        await waitFor(() => app.querySelector('[data-testid="carbon-footprint"]').textContent.includes('2.2'));
        expect(app.querySelector('[data-testid="eco-visits"]')).toContain('24');
    });

    test('real-time WebSocket updates across features', async () => {
        const app = renderApp();
        
        // Test loyalty update
        simulateWebSocketMessage({
            type: 'LOYALTY_UPDATE',
            tokenBalance: 1350,
            totalEarned: 3600
        });
        
        // Navigate to blockchain tab and verify update
        app.querySelector('[data-page="dashboard"]').click();
        app.querySelector('[data-tab="blockchain"]').click();
        
        await waitFor(() => app.querySelector('[data-testid="token-balance"]').textContent.includes('1350'));
        
        // Test social group update
        simulateWebSocketMessage({
            type: 'SOCIAL_GROUP_UPDATE',
            groupId: 1,
            updates: { status: 'confirmed' }
        });
        
        // Navigate to social tab and verify update
        app.querySelector('[data-tab="social"]').click();
        
        await waitFor(() => app.querySelector('[data-testid="group-status"]').textContent.includes('Confirmed'));
    });

    test('error handling and offline functionality', async () => {
        const app = renderApp();
        
        // Simulate API offline
        mockServer.health = () => Promise.reject(new Error('Network error'));
        
        // Verify offline indicator
        await waitFor(() => app.querySelector('[data-testid="api-status"]').textContent.includes('Offline'));
        
        // Test that cached data still displays
        app.querySelector('[data-page="dashboard"]').click();
        expect(app.querySelector('[data-testid="token-balance"]')).toContain('1250');
        
        // Test graceful degradation
        app.querySelector('[data-tab="ai"]').click();
        expect(app.querySelector('[data-testid="offline-message"]')).toContain('AI features unavailable offline');
    });
});

// Helper functions
function renderApp() {
    const container = document.createElement('div');
    container.innerHTML = `
        <div data-testid="app">
            <nav>
                <button data-page="home">Home</button>
                <button data-page="restaurants">Restaurants</button>
                <button data-page="dashboard">Dashboard</button>
            </nav>
            <div data-testid="content"></div>
        </div>
    `;
    return container;
}

function fillForm(form, data) {
    Object.entries(data).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    });
}

function simulateWebSocketMessage(message) {
    if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({ data: JSON.stringify(message) });
    }
}

function simulateAIResponse(text) {
    setTimeout(() => {
        const chatContainer = document.querySelector('[data-testid="chat-messages"]');
        if (chatContainer) {
            const aiMessage = document.createElement('div');
            aiMessage.setAttribute('data-testid', 'ai-response');
            aiMessage.textContent = text;
            chatContainer.appendChild(aiMessage);
        }
    }, 100);
}

function waitFor(condition, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
            if (condition()) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(check, 10);
            }
        };
        check();
    });
}
