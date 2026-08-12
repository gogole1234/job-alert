import { Page } from 'playwright';
import { CompanyConfig, JobListing } from './types';
import { fetchGreenhouseJobs } from './scrapers/greenhouse';
import { scrapeCompanyJobs } from './scrapers/sparkhire';

export async function getJobsForCompany(page: Page, config: CompanyConfig): Promise<JobListing[]> {
    switch (config.provider) {
        case 'greenhouse':
            return await fetchGreenhouseJobs(config.boardToken, config.name);
        case 'comeet':
        case 'custom':
            return await scrapeCompanyJobs(page, config);
        default:
            throw new Error(`Unhandled provider type`);
    }
}