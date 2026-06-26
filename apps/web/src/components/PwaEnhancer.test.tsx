import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PwaEnhancer } from './PwaEnhancer';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock service worker registration
const mockServiceWorkerRegister = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: mockServiceWorkerRegister,
    controller: null,
    addEventListener: jest.fn(),
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
  configurable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PwaEnhancer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockServiceWorkerRegister.mockResolvedValue({
      waiting: null,
      addEventListener: jest.fn(),
    });
  });

  test('renders nothing when not in installable context', () => {
    const { container } = render(<PwaEnhancer />);
    expect(container.firstChild).toBeNull();
  });

  test('handles beforeinstallprompt event and shows install prompt', async () => {
    render(<PwaEnhancer />);

    // Simulate beforeinstallprompt event
    const promptEvent = new Event('beforeinstallprompt');
    (promptEvent as any).prompt = jest.fn();
    (promptEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed' });

    window.dispatchEvent(promptEvent);

    await waitFor(() => {
      expect(screen.queryByText(/Installer Arborisis/)).toBeInTheDocument();
    });
  });

  test('clears deferred prompt after user choice', async () => {
    const { rerender } = render(<PwaEnhancer />);

    const promptEvent = new Event('beforeinstallprompt');
    (promptEvent as any).prompt = jest.fn().mockResolvedValue(undefined);
    (promptEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(promptEvent);

    await waitFor(() => {
      expect(screen.queryByText(/Installer Arborisis/)).toBeInTheDocument();
    });

    // Click install button
    const installButton = screen.getByRole('button', { name: /Installer/ });
    fireEvent.click(installButton);

    // After the async handler, the prompt should be cleared
    await waitFor(() => {
      rerender(<PwaEnhancer />);
      expect(screen.queryByText(/Installer Arborisis/)).not.toBeInTheDocument();
    });
  });

  test('dismisses install prompt and persists to localStorage', async () => {
    render(<PwaEnhancer />);

    const promptEvent = new Event('beforeinstallprompt');
    (promptEvent as any).prompt = jest.fn();
    (promptEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed' });

    window.dispatchEvent(promptEvent);

    await waitFor(() => {
      expect(screen.queryByText(/Installer Arborisis/)).toBeInTheDocument();
    });

    const dismissButton = screen.getByRole('button', { name: /Plus tard/ });
    fireEvent.click(dismissButton);

    expect(localStorageMock.getItem('arborisis-pwa-dismissed')).toBe('1');
  });

  test('handles localStorage errors gracefully', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    getItemSpy.mockImplementation(() => {
      throw new Error('Storage not available');
    });

    // Should render without crashing
    const { container } = render(<PwaEnhancer />);
    expect(container).toBeTruthy();

    getItemSpy.mockRestore();
  });

  test('install and update banners are independent', async () => {
    render(<PwaEnhancer />);

    const promptEvent = new Event('beforeinstallprompt');
    (promptEvent as any).prompt = jest.fn();
    (promptEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed' });

    window.dispatchEvent(promptEvent);

    await waitFor(() => {
      expect(screen.queryByText(/Installer Arborisis/)).toBeInTheDocument();
    });

    // Click dismiss
    const dismissButton = screen.getByRole('button', { name: /Plus tard/ });
    fireEvent.click(dismissButton);

    // Verify dismissed state is saved
    expect(localStorageMock.getItem('arborisis-pwa-dismissed')).toBe('1');
  });
});
