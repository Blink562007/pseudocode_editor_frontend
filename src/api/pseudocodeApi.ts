// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7065';

export interface ExecuteResponse {
  success: boolean;
  output?: string;
  error?: string;
  line?: number;
}

/**
 * Execute pseudocode by sending it to the backend
 */
export async function executePseudocode(code: string): Promise<ExecuteResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pseudocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to backend',
    };
  }
}

/**
 * Validate pseudocode syntax without executing
 */
export async function validatePseudocode(code: string): Promise<ExecuteResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to backend',
    };
  }
}
