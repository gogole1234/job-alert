import { Schema, model, Document } from 'mongoose';

export interface IJob extends Document {
  url: string;
  title: string;
  company: string;
  location: string;
  isActive: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    url: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const JobModel = model<IJob>('Job', JobSchema);