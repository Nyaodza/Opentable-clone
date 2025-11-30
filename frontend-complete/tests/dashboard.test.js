// Dashboard Component Tests
describe('Dashboard Component', () => {
    let mockUser, mockLoyaltyData, mockVrExperiences;

    beforeEach(() => {
        mockUser = { name: 'John Doe', tokens: 1250, role: 'user' };
        mockLoyaltyData = {
            tokenBalance: 1250,
            totalEarned: 3500,
            loyaltyTier: 'gold',
            stakingBalance: 500,
            stakingRewards: 45
        };
        mockVrExperiences = [
            {
                id: 1,
                title: 'Virtual Wine Tasting',
                price: 85,
                duration: 60
            }
        ];
    });

    test('renders dashboard overview correctly', () => {
        const dashboard = renderDashboard({ user: mockUser, loyaltyData: mockLoyaltyData });
        expect(dashboard.querySelector('h1')).toContain('Welcome back, John Doe!');
        expect(dashboard.querySelector('[data-testid="token-balance"]')).toContain('1250');
    });

    test('switches between tabs correctly', () => {
        const dashboard = renderDashboard({ user: mockUser });
        
        // Test blockchain tab
        dashboard.querySelector('[data-tab="blockchain"]').click();
        expect(dashboard.querySelector('h2')).toContain('Blockchain Loyalty');
        
        // Test VR tab
        dashboard.querySelector('[data-tab="vr"]').click();
        expect(dashboard.querySelector('h2')).toContain('Virtual Experiences');
    });

    test('displays loyalty data correctly in blockchain tab', () => {
        const dashboard = renderDashboard({ loyaltyData: mockLoyaltyData });
        dashboard.querySelector('[data-tab="blockchain"]').click();
        
        expect(dashboard.querySelector('[data-testid="available-tokens"]')).toContain('1250');
        expect(dashboard.querySelector('[data-testid="staked-tokens"]')).toContain('500');
        expect(dashboard.querySelector('[data-testid="loyalty-tier"]')).toContain('gold');
    });

    test('renders VR experiences in VR tab', () => {
        const dashboard = renderDashboard({ vrExperiences: mockVrExperiences });
        dashboard.querySelector('[data-tab="vr"]').click();
        
        expect(dashboard.querySelector('[data-testid="vr-experience"]')).toContain('Virtual Wine Tasting');
        expect(dashboard.querySelector('[data-testid="vr-price"]')).toContain('$85');
    });

    test('handles WebSocket updates for loyalty data', () => {
        const dashboard = renderDashboard({ loyaltyData: mockLoyaltyData });
        
        // Simulate WebSocket message
        const mockWsMessage = {
            type: 'LOYALTY_UPDATE',
            tokenBalance: 1300,
            totalEarned: 3550
        };
        
        simulateWebSocketMessage(mockWsMessage);
        
        expect(dashboard.querySelector('[data-testid="token-balance"]')).toContain('1300');
    });

    test('voice devices display correctly in voice tab', () => {
        const mockVoiceDevices = [
            { id: 1, name: 'Kitchen Alexa', type: 'alexa', status: 'active' }
        ];
        
        const dashboard = renderDashboard({ voiceDevices: mockVoiceDevices });
        dashboard.querySelector('[data-tab="voice"]').click();
        
        expect(dashboard.querySelector('[data-testid="voice-device"]')).toContain('Kitchen Alexa');
        expect(dashboard.querySelector('[data-testid="device-status"]')).toContain('active');
    });

    test('AI concierge chat interface works', () => {
        const dashboard = renderDashboard({});
        dashboard.querySelector('[data-tab="ai"]').click();
        
        const chatInput = dashboard.querySelector('[data-testid="chat-input"]');
        const sendButton = dashboard.querySelector('[data-testid="chat-send"]');
        
        chatInput.value = 'Find Italian restaurants';
        sendButton.click();
        
        expect(dashboard.querySelector('[data-testid="chat-messages"]')).toContain('Find Italian restaurants');
    });

    test('social dining groups display correctly', () => {
        const mockSocialGroups = [
            {
                id: 1,
                name: 'Tech Foodies',
                members: 8,
                maxMembers: 12,
                status: 'voting'
            }
        ];
        
        const dashboard = renderDashboard({ socialGroups: mockSocialGroups });
        dashboard.querySelector('[data-tab="social"]').click();
        
        expect(dashboard.querySelector('[data-testid="group-name"]')).toContain('Tech Foodies');
        expect(dashboard.querySelector('[data-testid="group-status"]')).toContain('Voting');
    });

    test('sustainability metrics display correctly', () => {
        const mockSustainabilityData = {
            carbonFootprint: 2.4,
            localSourcingScore: 85,
            wasteReduction: 92
        };
        
        const dashboard = renderDashboard({ sustainabilityData: mockSustainabilityData });
        dashboard.querySelector('[data-tab="sustainability"]').click();
        
        expect(dashboard.querySelector('[data-testid="carbon-footprint"]')).toContain('2.4 kg');
        expect(dashboard.querySelector('[data-testid="local-sourcing"]')).toContain('85%');
        expect(dashboard.querySelector('[data-testid="waste-reduction"]')).toContain('92%');
    });
});

// Helper functions
function renderDashboard(props) {
    const container = document.createElement('div');
    // Mock React render - in real implementation would use React Testing Library
    container.innerHTML = `<div data-testid="dashboard">${JSON.stringify(props)}</div>`;
    return container;
}

function simulateWebSocketMessage(message) {
    // Mock WebSocket message simulation
    window.dispatchEvent(new CustomEvent('websocket-message', { detail: message }));
}
