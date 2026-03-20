export interface ODataConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export const EntityMapping: Record<string, { label: string; icon: string; priorityFields?: string[]; defaultExpand?: string }> = {
  'FactDocument': { 
    label: 'Courriers & Dossiers', 
    icon: '📄', 
    priorityFields: ['DocumentIdentifier', 'Reference', 'DocumentDate', 'CreatedByStructureElementName', 'State', 'Type', 'Priority'],
    defaultExpand: 'State,Type,Priority,Direction,CreatedByStructureElement,ConfidentialityLevel'
  },
  'FactTask': { 
    label: 'Tâches', 
    icon: '✅', 
    priorityFields: ['TaskNumber', 'DocumentId', 'RequestedDate', 'AssignedToStructureElementName', 'TaskCalculatedState'],
    defaultExpand: 'TaskCalculatedState,TaskProcessingType,AssignedToStructureElement'
  },
  'FactContactIndividual': { label: 'Contacts (Indiv.)', icon: '👤', priorityFields: ['IndividualName', 'City', 'Country'] },
  'FactContactCompany': { label: 'Contacts (Entr.)', icon: '🏢', priorityFields: ['CompanyName', 'City', 'Country'] },
  'FactAttachment': { label: 'Pièces Jointes', icon: '📎', priorityFields: ['FileName', 'MimeType', 'UploadedDate', 'IsMain'] },
  'DimStructureElement': { label: 'Structure / Organisme', icon: '🏛️', priorityFields: ['Name', 'StructureElementTypeKey', 'IsRoot'] },
  'DimDocumentType': { label: 'Types de Documents', icon: '🏷️', priorityFields: ['LabelFrFr', 'Key', 'DocumentTypeCategoryKey'] },
  'DimDocumentState': { label: 'États de Documents', icon: '🚦', priorityFields: ['LabelFrFr', 'Key'] },
  'TraceMessage': { label: 'Logs / Traces', icon: '📝', priorityFields: ['TimeStamp', 'Level', 'Msg'] },
  'DimDate': { label: 'Calendrier', icon: '📅', priorityFields: ['TheDate', 'TheDayName', 'TheMonthName', 'TheYear'] },
  'FactEventUserConnection': { label: 'Connexions Utilisateurs', icon: '🔐', priorityFields: ['UserCn', 'ConnectionCount', 'UpdatedTimestamp', 'IsAdmin'] },
};

export function getEntityInfo(name: string) {
  const info = EntityMapping[name];
  if (info) return info;
  
  // Fallback for names not in mapping
  return { 
    label: name.replace(/Fact|Dim/, '').replace(/([A-Z])/g, ' $1').trim(), 
    icon: '📦' 
  };
}

export function formatDate(dateStr: any): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return String(dateStr);
  }
}

export interface ODataResponse<T> {
  "@odata.context": string;
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}

export class ODataClient {
  private config: ODataConfig;

  constructor(config: ODataConfig) {
    let url = config.baseUrl.trim();
    if (!url.endsWith('/')) url += '/';
    if (url.toLowerCase().endsWith('odatabi/')) url += 'odata/';
    this.config = { ...config, baseUrl: url };
  }

  private getAuthHeader(): string {
    const str = `${this.config.username}:${this.config.password}`;
    if (typeof window === 'undefined') {
      return `Basic ${Buffer.from(str).toString('base64')}`;
    } else {
      try {
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
        return `Basic ${btoa(binString)}`;
      } catch (e) {
        return `Basic ${btoa(str)}`;
      }
    }
  }

  public async fetchWithProxy(targetUrl: string, options: RequestInit = {}): Promise<Response> {
    const auth = this.getAuthHeader();

    if (typeof window !== 'undefined') {
      return fetch('/api/odata-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          method: options.method || 'GET',
          headers: {
            'Authorization': auth,
            'Accept': 'application/json',
            ...options.headers,
          },
          body: options.body,
        }),
      });
    } else {
      return fetch(targetUrl, {
        ...options,
        headers: {
          'Authorization': auth,
          'Accept': 'application/json',
          ...options.headers,
        },
      });
    }
  }

  public async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const isAbsolute = path.startsWith('http://') || path.startsWith('https://');
    const targetUrl = isAbsolute ? path : `${this.config.baseUrl}${path.startsWith('/') ? path.slice(1) : path}`;
    
    const response = await this.fetchWithProxy(targetUrl, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OData request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error(`Invalid JSON response from server. Check the URL. (Received: ${text.slice(0, 50)}...)`);
    }
  }

  async getCollections(): Promise<ODataResponse<{ name: string; kind: string; url: string }>> {
    return this.request('');
  }

  async getEntityData<T>(entity: string, query: string = ''): Promise<ODataResponse<T>> {
    const separator = query ? (query.startsWith('?') ? '' : '?') : '';
    return this.request(`${entity}${separator}${query}`);
  }

  async getCount(entity: string): Promise<number> {
    try {
      const separator = entity.includes('?') ? '&' : '?';
      const data = await this.request<any>(`${entity}${separator}$count=true&$top=0`);
      if (data['@odata.count'] !== undefined) return data['@odata.count'];
      
      let countPath = entity;
      let queryStr = '';
      if (entity.includes('?')) {
        const parts = entity.split('?');
        countPath = parts[0];
        queryStr = `?${parts[1]}`;
      }
      if (!countPath.endsWith('/')) countPath += '/';
      const countRes = await this.request<any>(`${countPath}$count${queryStr}`);
      return typeof countRes === 'number' ? countRes : parseInt(String(countRes), 10) || 0;
    } catch (e) {
      console.warn(`Could not get count for ${entity}:`, e);
      return 0;
    }
  }

  async getAggregatedData<T>(entity: string, apply: string): Promise<T[]> {
    try {
      const data = await this.request<any>(`${entity}?$apply=${encodeURIComponent(apply)}`);
      if (Array.isArray(data)) return data;
      return data.value || [];
    } catch (e) {
      console.error(`Error getting aggregated data for ${entity}:`, e);
      return [];
    }
  }

  async getMetadata(): Promise<string> {
    const targetUrl = `${this.config.baseUrl}$metadata`;
    const response = await this.fetchWithProxy(targetUrl);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    return response.text();
  }
}

/**
 * Helper to get ODataClient from session storage or specific config
 */
export function getODataClient(config?: ODataConfig): ODataClient | null {
  if (config) return new ODataClient(config);
  
  if (typeof window === 'undefined') return null;
  
  const savedConfig = localStorage.getItem('odata_config') || sessionStorage.getItem('odata_config');
  if (!savedConfig) return null;
  
  try {
    const parsed = JSON.parse(savedConfig);
    return new ODataClient(parsed);
  } catch (e) {
    console.error('Error parsing OData config from storage', e);
    return null;
  }
}
