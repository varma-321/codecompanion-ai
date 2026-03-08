import { API_BASE_URL } from './api';

export async function explainCodeViaBackend(code: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/explain-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.explanation || data.response || JSON.stringify(data);
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    const isConnectionError =
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError');

    if (isConnectionError) {
      throw new Error('Server is waking up or temporarily unavailable. Please try again.');
    }

    throw error;
  }
}
