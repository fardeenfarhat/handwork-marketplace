import websocketService from '../../services/websocketService';

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(websocketService).toBeDefined();
  });

  it('should have connect method', () => {
    expect(websocketService.connect).toBeDefined();
    expect(typeof websocketService.connect).toBe('function');
  });

  it('should have disconnect method', () => {
    expect(websocketService.disconnect).toBeDefined();
    expect(typeof websocketService.disconnect).toBe('function');
  });

  it('should have sendMessage method', () => {
    expect(websocketService.sendMessage).toBeDefined();
    expect(typeof websocketService.sendMessage).toBe('function');
  });

  it('should have isConnected method', () => {
    expect(websocketService.isConnected).toBeDefined();
    expect(typeof websocketService.isConnected).toBe('function');
  });

  it('should return false for isConnected initially', () => {
    expect(websocketService.isConnected()).toBe(false);
  });
});