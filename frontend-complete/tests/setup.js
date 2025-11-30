// Test setup configuration
import '@testing-library/jest-dom';

// Mock WebSocket for testing
global.WebSocket = class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.CONNECTING;
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            if (this.onopen) this.onopen();
        }, 10);
    }
    
    send(data) {
        // Mock send functionality
    }
    
    close() {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) this.onclose();
    }
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
);

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
    }
};

// Mock React for testing
global.React = {
    useState: jest.fn((initial) => [initial, jest.fn()]),
    useEffect: jest.fn((fn) => fn()),
    createElement: jest.fn((type, props, ...children) => ({
        type,
        props: { ...props, children }
    }))
};

// Helper functions for tests
global.simulateWebSocketMessage = (message) => {
    const event = new CustomEvent('websocket-message', { detail: message });
    window.dispatchEvent(event);
};

global.renderDashboard = (props) => {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'dashboard');
    container.innerHTML = `
        <div data-testid="token-balance">${props.loyaltyData?.tokenBalance || 0}</div>
        <div data-testid="available-tokens">${props.loyaltyData?.tokenBalance || 0}</div>
        <div data-testid="staked-tokens">${props.loyaltyData?.stakingBalance || 0}</div>
        <div data-testid="loyalty-tier">${props.loyaltyData?.loyaltyTier || 'bronze'}</div>
    `;
    return container;
};

global.renderRestaurantList = (restaurants) => {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'restaurant-list');
    restaurants.forEach(restaurant => {
        const item = document.createElement('div');
        item.setAttribute('data-testid', 'restaurant-item');
        item.textContent = restaurant.name;
        container.appendChild(item);
    });
    return container;
};

// Cleanup after each test
afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
});
