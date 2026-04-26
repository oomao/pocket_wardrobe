import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @gradio/client BEFORE importing aiTryOn so the import sees the mock.
const mockConnect = vi.fn();
vi.mock('@gradio/client', () => ({
  Client: { connect: (...args: any[]) => mockConnect(...args) },
  handle_file: (b: any) => b,
}));

import { runVirtualTryOn } from './aiTryOn';

beforeEach(() => {
  mockConnect.mockReset();
});

describe('runVirtualTryOn', () => {
  it('forwards the HF token to Client.connect', async () => {
    mockConnect.mockResolvedValue({
      predict: async () => ({ data: ['data:image/png;base64,xyz'] }),
    });
    await runVirtualTryOn(
      'data:image/png;base64,aaa',
      'data:image/png;base64,bbb',
      {
        spaceId: 'foo/bar',
        endpoint: '/predict',
        category: '上衣',
        hfToken: 'hf_test_token_12345',
      },
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    const [spaceId, opts] = mockConnect.mock.calls[0];
    expect(spaceId).toBe('foo/bar');
    expect(opts.token).toBe('hf_test_token_12345');
    expect(typeof opts.status_callback).toBe('function');
  });

  it('omits token when none provided (anonymous mode)', async () => {
    mockConnect.mockResolvedValue({
      predict: async () => ({ data: ['data:image/png;base64,xyz'] }),
    });
    await runVirtualTryOn('data:image/png;base64,a', 'data:image/png;base64,b', {
      spaceId: 'foo/bar',
      endpoint: '/predict',
      category: '上衣',
    });
    const [, opts] = mockConnect.mock.calls[0];
    expect(opts.token).toBeUndefined();
  });

  it('reports queue status via onStatus when status_callback fires', async () => {
    mockConnect.mockImplementation(async (_id: string, options: any) => {
      // Simulate Gradio sending a wake-up status update
      options.status_callback?.({ status: 'sleeping', detail: 'spinning up' });
      return {
        predict: async () => ({ data: ['data:image/png;base64,xyz'] }),
      };
    });
    const statuses: string[] = [];
    await runVirtualTryOn('data:image/png;base64,a', 'data:image/png;base64,b', {
      spaceId: 'foo/bar',
      endpoint: '/predict',
      category: '上衣',
      onStatus: (_stage, msg) => statuses.push(msg),
    });
    expect(statuses.some((s) => /sleeping/.test(s))).toBe(true);
  });

  it('wraps the "Cannot destructure config" gradio error with helpful tips', async () => {
    mockConnect.mockRejectedValue(
      new Error("Cannot destructure property 'config' of 'undefined' as it is undefined."),
    );
    await expect(
      runVirtualTryOn('data:image/png;base64,a', 'data:image/png;base64,b', {
        spaceId: 'foo/bar',
        endpoint: '/predict',
        category: '上衣',
      }),
    ).rejects.toThrow(/HuggingFace Token|切換到其他 Space|Puter Nano Banana/);
  });

  it('aborts the connect after 60s with a clear timeout error', async () => {
    vi.useFakeTimers();
    // Connect that never resolves
    mockConnect.mockImplementation(() => new Promise(() => {}));
    const promise = runVirtualTryOn(
      'data:image/png;base64,a',
      'data:image/png;base64,b',
      { spaceId: 'foo/bar', endpoint: '/predict', category: '上衣' },
    );
    // Attach a catch handler synchronously so the rejection isn't unhandled
    // when fake timers fire.
    const caught = promise.catch((e) => e);
    await vi.advanceTimersByTimeAsync(61_000);
    const err = await caught;
    expect(String(err)).toMatch(/逾時|HuggingFace Token/);
    vi.useRealTimers();
  });

  it('extracts image URL from various gradio response shapes', async () => {
    // Test 1: simple URL string in array
    mockConnect.mockResolvedValueOnce({
      predict: async () => ({ data: ['https://example.com/result.png'] }),
    });
    let res = await runVirtualTryOn('data:image/png;base64,a', 'data:image/png;base64,b', {
      spaceId: 'foo/bar', endpoint: '/predict', category: '上衣',
    });
    expect(res.imageUrl).toBe('https://example.com/result.png');

    // Test 2: object with .url field
    mockConnect.mockResolvedValueOnce({
      predict: async () => ({ data: [{ url: 'https://example.com/r2.png' }] }),
    });
    res = await runVirtualTryOn('data:image/png;base64,a', 'data:image/png;base64,b', {
      spaceId: 'foo/bar', endpoint: '/predict', category: '上衣',
    });
    expect(res.imageUrl).toBe('https://example.com/r2.png');

    // Test 3: nested deeply
    mockConnect.mockResolvedValueOnce({
      predict: async () => ({ data: { result: { image: { url: 'https://example.com/r3.png' } } } }),
    });
    res = await runVirtualTryOn('data:image/png;base64,a', 'data:image/png;base64,b', {
      spaceId: 'foo/bar', endpoint: '/predict', category: '上衣',
    });
    expect(res.imageUrl).toBe('https://example.com/r3.png');
  });
});
