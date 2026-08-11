import { JobListing } from '../types';

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: {
    name: string;
  };
  departments?: Array<{ id: number; name: string }>;
  offices?: Array<{ id: number; name: string; location?: string }>;
}

export async function fetchGreenhouseJobs(
  boardToken: string,
  companyName: string
): Promise<JobListing[]> {
  const startTime = Date.now();
  console.log(`\n==================================================`);
  console.log(`[🚀 START API] Fetching Greenhouse API for: ${companyName}`);

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`Greenhouse API responded with HTTP ${res.status}`);
    }

    const data = (await res.json()) as { jobs: GreenhouseJob[] };
    const rawJobs = data.jobs || [];

    const rdKeywords = [
      'software', 'developer', 'engineer', 'backend', 'frontend',
      'fullstack', 'full stack', 'architect', 'devops', 'cloud',
      'vulnerability', 'qa', 'automation', 'r&d', 'data'
    ];

    const excludeKeywords = ['sales', 'localization', 'account executive', 'recruiter', 'support engineer'];

    const filteredJobs: JobListing[] = [];

    for (const job of rawJobs) {
      const title = job.title.trim();
      const lowerTitle = title.toLowerCase();

      // Collect department names for additional keyword matching
      const deptNames = (job.departments || []).map((d) => d.name.toLowerCase()).join(' ');

      // 1. Skip non-R&D / excluded titles
      if (excludeKeywords.some((kw) => lowerTitle.includes(kw))) {
        continue;
      }

      // 2. Must match R&D title or department
      const isRdTitle = rdKeywords.some((kw) => lowerTitle.includes(kw));
      const isRdDept = rdKeywords.some((kw) => deptNames.includes(kw));

      if (!isRdTitle && !isRdDept) {
        continue;
      }

      const location = job.location?.name?.trim() || 'N/A';

      filteredJobs.push({
        title,
        company: companyName,
        location,
        url: job.absolute_url,
        scrapedAt: new Date().toISOString(),
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[📊 SUMMARY API] Extracted ${filteredJobs.length} clean R&D jobs out of ${rawJobs.length} total from ${companyName} in ${duration}s.`
    );

    return filteredJobs;
  } catch (err) {
    console.error(`[❌ API ERROR] Failed to fetch Greenhouse API for ${companyName}:`, err);
    return [];
  }
}