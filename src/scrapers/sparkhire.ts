import { Page } from 'playwright';
import { JobListing, ScraperCompanyConfig } from '../types';

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
                'software', 'developer', 'backend', 'frontend', 'fullstack',
                'full stack', 'architect'
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