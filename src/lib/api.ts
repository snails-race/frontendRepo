const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/backend';

export type HealthCheckResult = {
  ok: boolean;
  status: number;
  body: string;
};

export async function checkBackendHealth(): Promise<HealthCheckResult> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}
