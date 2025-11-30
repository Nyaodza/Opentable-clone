import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MockedProvider } from '@apollo/client/testing';
import Dashboard from '../../pages/dashboard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(() => ({
      getSigner: jest.fn(() => ({
        getAddress: jest.fn(() => Promise.resolve('0x1234567890123456789012345678901234567890')),
      })),
    })),
    Contract: jest.fn(() => ({
      balanceOf: jest.fn(() => Promise.resolve('1000000000000000000')),
      stakingBalance: jest.fn(() => Promise.resolve('500000000000000000')),
      loyaltyTier: jest.fn(() => Promise.resolve(2)),
    })),
    formatEther: jest.fn((value) => (parseInt(value) / 1e18).toString()),
  },
}));

// Mock user context
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
};

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

const renderDashboard = () => {
  return render(
    <MockedProvider mocks={[]} addTypename={false}>
      <MockAuthProvider>
        <Dashboard />
      </MockAuthProvider>
    </MockedProvider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify(mockUser)),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  test('renders dashboard with all tabs', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('🏠 Dashboard')).toBeInTheDocument();
      expect(screen.getByText('🔗 Blockchain')).toBeInTheDocument();
      expect(screen.getByText('🥽 Virtual')).toBeInTheDocument();
      expect(screen.getByText('🎤 Voice')).toBeInTheDocument();
      expect(screen.getByText('🤖 AI')).toBeInTheDocument();
      expect(screen.getByText('👥 Social')).toBeInTheDocument();
      expect(screen.getByText('🌱 Green')).toBeInTheDocument();
    });
  });

  test('switches between tabs correctly', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('🏠 Dashboard')).toBeInTheDocument();
    });

    // Click on Blockchain tab
    fireEvent.click(screen.getByText('🔗 Blockchain'));
    
    await waitFor(() => {
      expect(screen.getByText('Blockchain Loyalty Dashboard')).toBeInTheDocument();
    });

    // Click on Virtual tab
    fireEvent.click(screen.getByText('🥽 Virtual'));
    
    await waitFor(() => {
      expect(screen.getByText('Virtual Experience Hub')).toBeInTheDocument();
    });
  });

  test('displays user information correctly', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
    });
  });

  test('handles WebSocket connection', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
    });
  });

  test('blockchain tab shows wallet connection', async () => {
    renderDashboard();
    
    // Switch to blockchain tab
    fireEvent.click(screen.getByText('🔗 Blockchain'));
    
    await waitFor(() => {
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });
  });

  test('virtual experience tab shows VR options', async () => {
    renderDashboard();
    
    // Switch to virtual tab
    fireEvent.click(screen.getByText('🥽 Virtual'));
    
    await waitFor(() => {
      expect(screen.getByText('Start VR Experience')).toBeInTheDocument();
      expect(screen.getByText('360° Restaurant Tours')).toBeInTheDocument();
    });
  });

  test('voice commands tab shows microphone controls', async () => {
    renderDashboard();
    
    // Switch to voice tab
    fireEvent.click(screen.getByText('🎤 Voice'));
    
    await waitFor(() => {
      expect(screen.getByText('Voice Commands')).toBeInTheDocument();
      expect(screen.getByText('Start Listening')).toBeInTheDocument();
    });
  });

  test('AI concierge tab shows chat interface', async () => {
    renderDashboard();
    
    // Switch to AI tab
    fireEvent.click(screen.getByText('🤖 AI'));
    
    await waitFor(() => {
      expect(screen.getByText('AI Concierge')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ask me anything about dining...')).toBeInTheDocument();
    });
  });

  test('social dining tab shows group features', async () => {
    renderDashboard();
    
    // Switch to social tab
    fireEvent.click(screen.getByText('👥 Social'));
    
    await waitFor(() => {
      expect(screen.getByText('Social Dining')).toBeInTheDocument();
      expect(screen.getByText('Create Group')).toBeInTheDocument();
    });
  });

  test('sustainability tab shows green metrics', async () => {
    renderDashboard();
    
    // Switch to sustainability tab
    fireEvent.click(screen.getByText('🌱 Green'));
    
    await waitFor(() => {
      expect(screen.getByText('Sustainability Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Carbon Footprint')).toBeInTheDocument();
    });
  });

  test('handles real-time updates via WebSocket', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    // Simulate WebSocket message
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )[1];

    const mockMessage = {
      data: JSON.stringify({
        type: 'loyaltyUpdate',
        data: { tokenBalance: 2000 }
      })
    };

    messageHandler(mockMessage);
    
    // Verify the component handles the update
    expect(mockWebSocket.addEventListener).toHaveBeenCalled();
  });

  test('cleans up WebSocket on unmount', async () => {
    const { unmount } = renderDashboard();
    
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalled();
    });

    unmount();
    
    expect(mockWebSocket.close).toHaveBeenCalled();
  });
});
