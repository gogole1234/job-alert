import mongoose from 'mongoose';
import { JobModel } from './Job';
import { JobListing } from '../types';
import { sendNotifications } from '../utils/notifications';

export interface DiffResult {
    newJobs: JobListing[];
    closedJobsCount: number;
}
export async function syncJobsToDb(scrapedJobs: JobListing[], mongoUri: string): Promise<DiffResult> {
    console.log('\n[💾 DB] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    const scrapedUrls = scrapedJobs.map((j) => j.url);
    const now = new Date();

    // Find existing job URLs in DB
    const existingJobs = await JobModel.find({ url: { $in: scrapedUrls } }).select('url');
    const existingUrlSet = new Set(existingJobs.map((j) => j.url));

    // Extract brand new jobs
    const newJobs = scrapedJobs.filter((job) => !existingUrlSet.has(job.url));

    // Perform DB Upserts
    if (scrapedJobs.length > 0) {
        const bulkOps = scrapedJobs.map((job) => ({
            updateOne: {
                filter: { url: job.url },
                update: {
                    $set: {
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        isActive: true,
                        lastSeenAt: now,
                    },
                    $setOnInsert: {
                        firstSeenAt: now
                    },
                },
                upsert: true,
            },
        }));

        await JobModel.bulkWrite(bulkOps);
    }

    // Handle closed roles
    const scannedCompanies = Array.from(new Set(scrapedJobs.map((j) => j.company)));
    const closedResult = await JobModel.updateMany(
        {
            company: { $in: scannedCompanies },
            url: { $nin: scrapedUrls },
            isActive: true
        },
        {
            $set: { isActive: false }
        }
    );

    await mongoose.disconnect();

    // Send alerts for new roles
    if (newJobs.length > 0) {
        await sendNotifications(newJobs);
    }

    return {
        newJobs,
        closedJobsCount: closedResult.modifiedCount,
    };
}