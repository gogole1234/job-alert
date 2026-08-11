import { Page } from 'playwright';
import { CompanyConfig, JobListing, ScraperCompanyConfig } from './types';
import { fetchGreenhouseJobs } from './scrapers/greenhouse';

// Define the target company career pages you want to track
export const TARGET_COMPANIES: CompanyConfig[] = [
    {
        name: 'Apono',
        provider: 'comeet',
        url: 'https://www.comeet.com/jobs/apono/1B.00A',
        cardSelector: 'a[href*="/jobs/"]'
    },
    {
        name: 'Guardio',
        provider: 'comeet',
        url: 'https://www.comeet.com/jobs/guardio/57.000',
        cardSelector: 'a[href*="/jobs/"]'
    },
    {
        name: 'Pango',
        provider: 'comeet',
        url: 'https://www.comeet.com/jobs/pango/59.002',
        cardSelector: 'a[href*="/jobs/"]'
    },
    {
        name: 'Tenable',
        provider: 'greenhouse',
        boardToken: 'tenableinc',
    }
];

export async function getJobsForCompany(page: Page, config: CompanyConfig): Promise<JobListing[]> {
  switch (config.provider) {
    case 'greenhouse':
      // TypeScript automatically knows config is ApiCompanyConfig
      return await fetchGreenhouseJobs(config.boardToken, config.name);
    case 'comeet':
    case 'custom':
      return await scrapeCompanyJobs(page, config);
    default:
      throw new Error(`Unhandled provider type`);
  }
}

export async function scrapeCompanyJobs(page: Page, config: ScraperCompanyConfig): Promise<JobListing[]> {
    const startTime = Date.now();
    console.log(`\n==================================================`);
    console.log(`[🚀 START] Scraping target: ${config.name}`);
    console.log(`[🌐 URL] ${config.url}`);
    console.log(`==================================================`);

    // Listen to browser console logs to diagnose client-side JS issues in CI runners
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`[Browser Error] ${msg.text()}`);
        }
    });

    // ⚡️ BLOCK UNNECESSARY ASSETS TO SPEED UP NAVIGATION
    await page.route('**/*.{png,jpg,jpeg,svg,gif,webp,css,woff,woff2}', (route) => route.abort());

    console.log(`[⏳] Navigating to page...`);
    await page.goto(config.url, { waitUntil: 'commit', timeout: 60000 });
    console.log(`[✓] Page loaded successfully.`);

    const possibleSelectors = [
        config.cardSelector,
        '.position-item',
        '.job-list-item',
        'a[href*="/jobs/"]',
        'a[href*="position"]'
    ].filter(Boolean);

    console.log(`[🔍] Searching for elements using target selectors:`, possibleSelectors);

    let targetSelector = '';
    for (const selector of possibleSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: 4000 });
            targetSelector = selector;
            console.log(`[✓] Matched valid selector: "${selector}"`);
            break;
        } catch {
            console.log(`[-] Selector "${selector}" timed out or not found.`);
        }
    }

    if (!targetSelector) {
        console.warn(`[❌ ERROR] No job listing selectors matched on ${config.name}`);
        return [];
    }

    // Count elements before extraction
    const rawElementCount = await page.$$eval(targetSelector, els => els.length);
    console.log(`[📊] Found ${rawElementCount} candidate DOM elements for selector "${targetSelector}".`);

    console.log(`[⚙️] Filtering and parsing R&D position details...`);

    const listings = await page.$$eval(
        targetSelector,
        (elements, { companyName, defaultTitleSel, defaultLocSel, defaultLinkSel }) => {
            const results: { title: string; company: string; location: string; url: string; scrapedAt: string }[] = [];

            const rdKeywords = [
                'r&d', 'research & development', 'research and development',
                'engineering', 'software', 'developer', 'engineer', 'backend',
                'frontend', 'fullstack', 'full stack', 'architect', 'devops'
            ];

            elements.forEach(el => {
                const isAnchor = el.tagName.toLowerCase() === 'a';
                const anchorEl = isAnchor ? (el as HTMLAnchorElement) : (el.querySelector(defaultLinkSel || 'a') as HTMLAnchorElement | null);

                if (!anchorEl || !anchorEl.href) return;

                const titleEl = defaultTitleSel ? el.querySelector(defaultTitleSel) : null;
                const rawTitle = titleEl?.textContent?.trim() || anchorEl.textContent?.trim() || 'N/A';
                const title = rawTitle.replace(/\s+/g, ' ');

                let departmentText = '';
                let current: HTMLElement | null = el as HTMLElement;
                for (let i = 0; i < 4 && current; i++) {
                    departmentText += ' ' + (current.innerText || current.textContent || '');
                    current = current.parentElement;
                }
                departmentText = departmentText.toLowerCase();

                const isRdDepartment = rdKeywords.some(kw => departmentText.includes(kw));
                const isRdTitle = rdKeywords.some(kw => title.toLowerCase().includes(kw));

                if (!isRdDepartment && !isRdTitle) {
                    return;
                }

                const locationEl = defaultLocSel ? el.querySelector(defaultLocSel) : null;
                let location = locationEl?.textContent?.trim() || 'N/A';

                // Refined regex inside scrapeCompanyJobs page evaluation:
                if (location === 'N/A' && el.parentElement) {
                    const parentText = el.parentElement.textContent || '';
                    const match = parentText.match(/(Remote|TLV|Tel-?Aviv[^\n,|]*|Petah Tikva[^\n,|]*|Hybrid|[A-Z][a-zA-Z\s-]+,\s*[A-Z][a-zA-Z\s]+)/i);
                    if (match) location = match[0].trim();
                }

                if (title && title !== 'N/A' && title.length > 2) {
                    results.push({
                        title,
                        company: companyName,
                        location,
                        url: anchorEl.href,
                        scrapedAt: new Date().toISOString(),
                    });
                }
            });

            return results;
        },
        {
            companyName: config.name,
            defaultTitleSel: config.titleSelector,
            defaultLocSel: config.locationSelector,
            defaultLinkSel: config.linkSelector,
        }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[📊 SUMMARY] Extracted ${listings.length} R&D jobs out of ${rawElementCount} candidate elements (${duration}s).`);

    listings.forEach((job, idx) => {
        console.log(`  └─ [Job #${idx + 1}] ${job.title} | ${job.location} | Link: ${job.url}`);
    });

    console.log(`==================================================\n`);

    return listings;
}