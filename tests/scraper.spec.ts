import { test, expect } from '@playwright/test';
import { JobListing } from '../src/types';
import { getJobsForCompany, TARGET_COMPANIES } from '../src/index';
import { syncJobsToDb } from '../src/db/syncJobs';

test.describe('Company Job Scraper Pipeline', () => {
  const mongoUri = process.env.MONGO_URI;

  for (const company of TARGET_COMPANIES) {
    test(`Scrape jobs for: ${company.name}`, async ({ page }) => {
      // 1. Ensure DB URI is present before running
      expect(mongoUri, 'MONGO_URI environment variable must be set').toBeTruthy();

      // 2. Route job collection based on provider (API or Playwright Browser)
      const jobs: JobListing[] = await getJobsForCompany(page, company);

      console.log(`[✓] ${company.name} (${company.provider}): Found ${jobs.length} R&D jobs.`);

      // Sanity assertion: Ensure job extraction didn't return empty due to broken selectors/API errors
      expect(jobs.length, `Expected to find at least one position for ${company.name}`).toBeGreaterThan(0);

      // Verify structure of parsed jobs
      jobs.forEach((job) => {
        expect(job.title).not.toBe('N/A');
        expect(job.title.length).toBeGreaterThan(2);
        expect(job.url).toContain('http');
      });

      // 3. Sync scraped positions for this company to MongoDB and output summary diff
      const { newJobs, closedJobsCount } = await syncJobsToDb(jobs, mongoUri!);

      console.log(
        `[💾 DB SYNC - ${company.name}] ✨ New: ${newJobs.length} | ❌ Closed: ${closedJobsCount}`
      );

      if (newJobs.length > 0) {
        console.log(`🚨 NEW POSITIONS FOR ${company.name.toUpperCase()}:`);
        newJobs.forEach((job, idx) => {
          console.log(`  ${idx + 1}. ${job.title} (${job.location}) -> ${job.url}`);
        });
      }
    });
  }
});