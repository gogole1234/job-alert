export interface JobListing {
  title: string;
  company: string;
  location: string;
  url: string;
  scrapedAt: string;
}

export interface CompanyConfig {
  name: string;
  url: string;
  // Selectors tailored to the company's career page layout
  cardSelector: string;
  titleSelector: string;
  locationSelector: string;
  linkSelector: string;
}