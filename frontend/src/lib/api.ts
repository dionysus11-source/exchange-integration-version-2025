
const API_BASE_URL = 'http://dionysus11.ddns.net:3001';

// A wrapper around fetch to automatically add the Authorization header
// and handle 401 Unauthorized responses.
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('jwt_token');
  const headers = new Headers(options.headers);

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Unauthorized. Clear token and redirect to login.
    localStorage.removeItem('jwt_token');
    window.location.href = '/login';
    // Throw an error to stop further processing
    throw new Error('Unauthorized');
  }

  return response;
} 