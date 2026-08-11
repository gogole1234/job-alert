export type ProviderType = 'comeet' | 'greenhouse' | 'lever' | 'custom';

// 1. Base interface for shared properties
interface BaseCompanyConfig {
  name: string;
}

// 2. Web Scraper Targets (Comeet / Custom) -> URL is strictly required
export interface ScraperCompanyConfig extends BaseCompanyConfig {
  provider: 'comeet' | 'custom';
  url: string; // ⚡️ Required non-optional string
  cardSelector: string;
  titleSelector?: string;
  locationSelector?: string;
  linkSelector?: string;
}

// 3. Public API Targets (Greenhouse / Lever) -> boardToken is strictly required
export interface ApiCompanyConfig extends BaseCompanyConfig {
  provider: 'greenhouse' | 'lever';
  boardToken: string; // ⚡️ Required non-optional string
}

// 4. Combined Union Type
export type CompanyConfig = ScraperCompanyConfig | ApiCompanyConfig;

export interface JobListing {
  title: string;
  company: string;
  location: string;
  url: string;
  scrapedAt: string;
}