/**
 * Unit tests: ArchitectureView -- Generate Rules button
 *
 * Tests that ArchitectureView renders the "Generate Rules" button in the
 * action bar when the architecture state is 'ready', and that the button
 * is hidden in 'empty' and 'error' states.
 *
 * Coverage targets (from test-design.md):
 *   - AC-4: ready state shows Generate Rules button in action bar
 *   - AC-4: empty state hides Generate Rules button
 *   - AC-4: error state hides Generate Rules button
 *   - AC-5: clicking Generate Rules sends POST /api/archi-to-rules
 *   - AC-6: API error sets generateError, shows error message
 *   - B-4:  generating disables button and shows loading text
 *   - B-5:  empty state shows only "Generate Architecture Model", not Generate Rules
 *   - B-6:  error state shows error info + Retry, not Generate Rules
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { ArchitectureView } from '@/components/ArchitectureView';

// ---------------------------------------------------------------------------
// Mock @likec4 dependencies -- ArchitectureView dynamically imports these
// ---------------------------------------------------------------------------
vi.mock('@likec4/diagram', () => ({
  LikeC4ModelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ReactLikeC4: () => <div data-testid="react-likec4">ReactLikeC4 Mock</div>,
}));

vi.mock('@likec4/core/model', () => ({
  LikeC4Model: {
    create: vi.fn(() => ({})),
  },
}));

vi.mock('@likec4/layouts', () => ({
  layoutLikeC4Model: vi.fn(async () => ({
    $data: { elements: {}, relations: {}, views: { all: {} } },
  })),
}));

// ---------------------------------------------------------------------------
// Mock icons
// ---------------------------------------------------------------------------
vi.mock('@/components/icons', () => ({
  RefreshIcon: () => <span data-testid="refresh-icon" />,
  GenerateRulesIcon: () => <span data-testid="generate-rules-icon" />,
}));

// ---------------------------------------------------------------------------
// Mock i18n
// ---------------------------------------------------------------------------
const tCalls: string[] = [];

vi.mock('@/i18n', () => ({
  useT: () => ({
    t: (key: string) => {
      tCalls.push(key);
      const map: Record<string, string> = {
        'action.generateRules': 'Generate Rules',
        'action.generatingRules': 'Generating Rules...',
        'action.generateRulesError': 'Failed to generate rules',
        'nav.refresh': 'Refresh',
        'architecture.loading': 'Loading...',
        'architecture.error': 'Failed to load architecture model',
        'architecture.createPrompt': 'Generate a starter template to begin.',
        'architecture.createBtn': 'Generate Architecture Model',
        'architecture.creating': 'Generating...',
      };
      return map[key] ?? key;
    },
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stubIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  );
}

/** Returns a promise that never resolves, used to keep generating=true. */
function createPendingPromise(): Promise<Response> {
  return new Promise<Response>(() => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArchitectureView -- Generate Rules button', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    tCalls.length = 0;
    stubIntersectionObserver();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    vi.unstubAllGlobals();
  });

  // =========================================================================
  // AC-4: Ready state shows Generate Rules button
  // =========================================================================
  it('AC-4: ready state renders Generate Rules button in action bar', async () => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ elements: {}, relations: {}, views: {} }),
    } as unknown as Response);

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Rules' })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Generate Rules' })).toHaveTextContent(
      'Generate Rules',
    );
  });

  // =========================================================================
  // AC-4: Ready state -- button ordering (Generate Rules before Refresh)
  // =========================================================================
  it('AC-4: ready state shows Generate Rules button before Refresh button in action bar', async () => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ elements: {}, relations: {}, views: {} }),
    } as unknown as Response);

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Rules' })).toBeInTheDocument();
    });

    const actionBarButtons = screen.getByTestId('architecture-view').querySelectorAll('button');

    // Generate Rules is rendered first, then Refresh
    const buttonTexts = Array.from(actionBarButtons).map((b) => b.textContent);
    const generateRulesIdx = buttonTexts.findIndex((t) => t === 'Generate Rules');
    const refreshIdx = buttonTexts.findIndex((t) => t === 'Refresh');

    expect(generateRulesIdx).toBeLessThan(refreshIdx);
  });

  // =========================================================================
  // AC-4: Empty state hides Generate Rules button
  // =========================================================================
  it('AC-4: empty state does NOT render Generate Rules button', async () => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    } as unknown as Response);

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByTestId('generate-architecture-btn')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Generate Rules' })).not.toBeInTheDocument();
  });

  // =========================================================================
  // AC-4: Error state hides Generate Rules button
  // =========================================================================
  it('AC-4: error state does NOT render Generate Rules button', async () => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    } as unknown as Response);

    render(<ArchitectureView />);

    // Wait for error state -- the Retry button appears
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Generate Rules' })).not.toBeInTheDocument();
  });

  // =========================================================================
  // B-5: Empty state shows "Generate Architecture Model" button, not Generate Rules
  // =========================================================================
  it('B-5: empty state shows Generate Architecture Model button, not Generate Rules', async () => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Architecture directory not found' }),
    } as unknown as Response);

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByTestId('generate-architecture-btn')).toBeInTheDocument();
    });

    expect(screen.getByTestId('generate-architecture-btn')).toHaveTextContent(
      'Generate Architecture Model',
    );

    expect(screen.queryByRole('button', { name: 'Generate Rules' })).not.toBeInTheDocument();
  });

  // =========================================================================
  // B-6: Error state shows error info + Retry, not Generate Rules
  // =========================================================================
  it('B-6: error state shows error message and Retry button, not Generate Rules', async () => {
    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    } as unknown as Response);

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load architecture model')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Generate Rules' })).not.toBeInTheDocument();
  });

  // =========================================================================
  // AC-5: Clicking Generate Rules sends POST /api/archi-to-rules
  // =========================================================================
  it('AC-5: clicking Generate Rules sends POST /api/archi-to-rules request', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/architecture/model') {
          return {
            ok: true,
            json: async () => ({ elements: {}, relations: {}, views: {} }),
          } as unknown as Response;
        }
        if (url === '/api/archi-to-rules' && init?.method === 'POST') {
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Rules' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate Rules' }));

    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const archiRulesCall = calls.find(
        ([url, init]) => url === '/api/archi-to-rules' && init?.method === 'POST',
      );
      expect(archiRulesCall).toBeTruthy();
    });
  });

  // =========================================================================
  // B-4: Generating state disables Generate Rules button
  // =========================================================================
  it('B-4: generating=true disables Generate Rules button and shows loading text', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        // Initial model fetch resolves
        if (url === '/api/architecture/model') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ elements: {}, relations: {}, views: {} }),
          } as unknown as Response);
        }
        // archi-to-rules request stays pending (keeps generating=true)
        return createPendingPromise();
      });

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Rules' })).toBeInTheDocument();
    });

    // Click to trigger generate rules
    fireEvent.click(screen.getByRole('button', { name: 'Generate Rules' }));

    // Button should transition to disabled with loading text.
    // (aria-label stays 'Generate Rules' but text content changes)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Generate Rules' });
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent('Generating Rules...');
    });
  });

  // =========================================================================
  // AC-6: API error (500) sets generateError and shows error message
  // =========================================================================
  it('AC-6: Generate Rules API returns 500, sets generateError and shows error', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/architecture/model') {
          return {
            ok: true,
            json: async () => ({ elements: {}, relations: {}, views: {} }),
          } as unknown as Response;
        }
        if (url === '/api/archi-to-rules' && init?.method === 'POST') {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Failed to generate rules' }),
          } as unknown as Response;
        }
        return new Response(null, { status: 404 });
      });

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Rules' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate Rules' }));

    // Wait for error to appear: "{action.generateRulesError}: {error message}"
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate rules/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // AC-6: Network error shows error message
  // =========================================================================
  it('AC-6: Generate Rules network error shows error message', async () => {
    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : '';
        if (url === '/api/architecture/model') {
          return {
            ok: true,
            json: async () => ({ elements: {}, relations: {}, views: {} }),
          } as unknown as Response;
        }
        if (url === '/api/archi-to-rules' && init?.method === 'POST') {
          throw new Error('Network error');
        }
        return new Response(null, { status: 404 });
      });

    render(<ArchitectureView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Generate Rules' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate Rules' }));

    // Wait for error to appear from the network failure
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});
