import { ODataConfig } from './odata';

export interface SyncProgress {
  type: 'start' | 'entity_start' | 'entity_progress' | 'entity_fetched' | 'entity_done' | 'entity_error' | 'done';
  entity?: string;
  index?: number;
  total?: number;
  count?: number;
  error?: string;
  totalCount?: number;
  stats?: Record<string, number>;
  entities?: string[];
}

export async function syncData(
  entities?: string[],
  onProgress?: (progress: SyncProgress) => void
) {
  const savedConfig = sessionStorage.getItem('odata_config');
  if (!savedConfig) throw new Error('OData client not configured');

  const config = JSON.parse(savedConfig) as ODataConfig;

  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, entities })
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as SyncProgress;
          onProgress?.(data);
        } catch {
          // ignore parse errors
        }
      }
    }
  }
}
