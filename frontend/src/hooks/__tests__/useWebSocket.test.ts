import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('useWebSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Create mock socket
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
    };

    // Mock io to return our mock socket
    (io as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.lastMessage).toBeNull();
  });

  it('should connect to WebSocket server', () => {
    renderHook(() => useWebSocket());

    expect(io).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      expect.objectContaining({
        transports: ['websocket'],
        autoConnect: true,
      })
    );
  });

  it('should update connection status', () => {
    const { result } = renderHook(() => useWebSocket());

    // Simulate connect event
    act(() => {
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      mockSocket.connected = true;
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate disconnect event
    act(() => {
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      mockSocket.connected = false;
      disconnectHandler();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should handle incoming messages', () => {
    const { result } = renderHook(() => useWebSocket());

    const testMessage = { type: 'test', data: 'Hello WebSocket' };

    act(() => {
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      messageHandler(testMessage);
    });

    expect(result.current.lastMessage).toEqual(testMessage);
  });

  it('should emit messages', () => {
    const { result } = renderHook(() => useWebSocket());

    const testEvent = 'test-event';
    const testData = { foo: 'bar' };

    act(() => {
      result.current.emit(testEvent, testData);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(testEvent, testData);
  });

  it('should subscribe to events', () => {
    const { result } = renderHook(() => useWebSocket());

    const eventName = 'custom-event';
    const handler = jest.fn();

    act(() => {
      result.current.subscribe(eventName, handler);
    });

    expect(mockSocket.on).toHaveBeenCalledWith(eventName, handler);

    // Test event handling
    const testData = { test: 'data' };
    act(() => {
      const eventHandler = mockSocket.on.mock.calls.find(
        call => call[0] === eventName
      )[1];
      eventHandler(testData);
    });

    expect(handler).toHaveBeenCalledWith(testData);
  });

  it('should unsubscribe from events', () => {
    const { result } = renderHook(() => useWebSocket());

    const eventName = 'custom-event';
    const handler = jest.fn();

    act(() => {
      result.current.subscribe(eventName, handler);
      result.current.unsubscribe(eventName, handler);
    });

    expect(mockSocket.off).toHaveBeenCalledWith(eventName, handler);
  });

  it('should disconnect on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should handle reconnection', () => {
    const { result } = renderHook(() => useWebSocket());

    // Simulate initial connection
    act(() => {
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      mockSocket.connected = true;
      connectHandler();
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate reconnect event
    act(() => {
      const reconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect'
      )[1];
      reconnectHandler();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should handle connection errors', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    renderHook(() => useWebSocket());

    const testError = new Error('Connection failed');

    act(() => {
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];
      errorHandler(testError);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('WebSocket connection error:', testError);

    consoleErrorSpy.mockRestore();
  });
});