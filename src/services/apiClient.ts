import { getAuthToken } from '../lib/supabaseClient';

export interface AuthenticatedFetchOptions extends RequestInit {
  onUnauthorized?: () => void;
}

/**
 * Cliente HTTP seguro que anexa automaticamente o JWT de autenticação
 * Authorization: Bearer <session.access_token>
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { onUnauthorized, headers: customHeaders, ...fetchOptions } = options;
  const token = await getAuthToken();

  const headers = new Headers(customHeaders || {});
  
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    });

    if (response.status === 401) {
      console.warn(`[API CLIENT 401] Sessão inválida ou expirada para ${url}`);
      if (typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
    }

    return response;
  } catch (error) {
    console.error(`[API CLIENT NETWORK ERROR] Falha na requisição para ${url}:`, error);
    throw error;
  }
}
