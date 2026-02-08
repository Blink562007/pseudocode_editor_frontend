// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7065';

export interface ExecuteResponse {
  success: boolean;
  output?: string;
  error?: string;
  line?: number;
}

export interface ValidationError {
  lineNumber: number;
  message: string;
  code: string;
}

export interface ValidationWarning {
  lineNumber: number;
  message: string;
  code: string;
}

export interface ValidationResponse {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
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
export async function validatePseudocode(code: string): Promise<ValidationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pseudocode/validate`, {
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
      isValid: false,
      errors: [{
        lineNumber: 0,
        message: error instanceof Error ? error.message : 'Failed to connect to backend',
        code: 'CONNECTION_ERROR'
      }],
      warnings: []
    };
  }
}
