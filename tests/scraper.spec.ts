import { test, expect } from '@playwright/test';
import { JobListing } from '../src/types';
import { getJobsForCompany } from '../src/index';
import { syncJobsToDb } from '../src/db/syncJobs';
import { TARGET_COMPANIES } from '../src/config';

test.describe('Company Job Scraper Pipeline', () => {
  const mongoUri = process.env.MONGO_URI;

  test.beforeAll(async () => {
    expect(mongoUri, 'MONGO_URI environment variable must be set').toBeTruthy();
  });

  for (const company of TARGET_COMPANIES) {
    test(`Scrape jobs for: ${company.name}`, async ({ page }) => {
      // 1. Route job collection based on provider (API or Playwright Browser)
      const jobs: JobListing[] = await getJobsForCompany(page, company);

      console.log(`[✓] ${company.name} (${company.provider}): Found ${jobs.length} R&D jobs.`);

      // 2. Validate extracted structure ONLY IF jobs exist
      if (jobs.length > 0) {
        jobs.forEach((job) => {
          expect(job.title, `Job title should be defined for ${company.name}`).not.toBe('N/A');
          expect(job.title.length, `Job title too short for ${company.name}`).toBeGreaterThan(2);
          expect(job.url, `Invalid URL format for ${company.name}`).toContain('http');
        });
      } else {
        console.log(`[ℹ️ INFO] ${company.name} currently has 0 open positions. Continuing pipeline to maintain DB state...`);
      }

      // 3. Sync scraped positions (even if empty!) to track state and handle soft deletes for closed roles
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