// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5062';

export interface PseudocodeDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  language: string;
}

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
      body: JSON.stringify({ content: code }),
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
      body: JSON.stringify({ content: code }),
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

/**
 * Get all saved pseudocode documents.
 */
export async function getPseudocodeDocuments(): Promise<PseudocodeDocument[]> {
  const response = await fetch(`${API_BASE_URL}/api/pseudocode`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as PseudocodeDocument[];
  return data;
}

/**
 * Get one pseudocode document by id.
 */
export async function getPseudocodeDocumentById(id: string): Promise<PseudocodeDocument> {
  const response = await fetch(`${API_BASE_URL}/api/pseudocode/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as PseudocodeDocument;
  return data;
}
