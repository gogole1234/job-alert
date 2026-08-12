import { CompanyConfig } from "./types";

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
        name: 'Echo',
        provider: 'comeet',
        url: 'https://www.comeet.com/jobs/echo/9A.006',
        cardSelector: 'a[href*="/jobs/"]'
    },
    {
        name: 'BUYME',
        provider: 'comeet',
        url: 'https://www.comeet.com/jobs/buyme/B2.008',
        cardSelector: 'a[href*="/jobs/"]'
    },
    {
        name: 'Tenable',
        provider: 'greenhouse',
        boardToken: 'tenableinc',
    }
];