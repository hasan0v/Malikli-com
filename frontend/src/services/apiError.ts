// Utility helpers for normalising Axios / network errors so thunks can surface
// actionable messages to the UI (rather than the generic 'Network Error').
import axios, { AxiosError } from 'axios';

export interface NormalisedApiError {
  type: 'network' | 'timeout' | 'cors' | 'http' | 'unknown';
  status?: number;
  message: string;          // User-facing message
  technicalMessage?: string; // Internal / debug message
  data?: any;               // Raw response body (if any)
}

export function normaliseError(err: any): NormalisedApiError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError;
    if (axErr.code === 'ECONNABORTED') {
      return {
        type: 'timeout',
        message: 'Request to server timed out. Please check your connection.',
        technicalMessage: axErr.message,
      };
    }
    // No response object -> browser blocked / DNS / CORS / offline
    if (!axErr.response) {
      // Heuristic: CORS often still yields a generic 'Network Error'. We cannot 100% detect it
      // but we can guide the developer about common causes.
      const likelyCors = typeof window !== 'undefined' && !!window.location && !!axErr.message;
      return {
        type: likelyCors ? 'cors' : 'network',
        message: 'Unable to reach API. Check if the backend is running and CORS / API URL are configured.',
        technicalMessage: axErr.message,
      };
    }
    return {
      type: 'http',
      status: axErr.response.status,
      message: httpMessageForStatus(axErr.response.status),
      technicalMessage: axErr.message,
      data: axErr.response.data,
    };
  }
  return {
    type: 'unknown',
    message: 'Unexpected error occurred.',
    technicalMessage: String(err),
  };
}

function httpMessageForStatus(status: number): string {
  if (status >= 500) return 'Server error. Please try again later.';
  if (status === 404) return 'Resource not found.';
  if (status === 401) return 'You need to login again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 400) return 'Invalid request. Please review the data and retry.';
  return 'Request failed.';
}

export function extractUserMessage(err: any): string {
  return normaliseError(err).message;
}
