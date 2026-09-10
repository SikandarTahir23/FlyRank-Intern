const PROVIDERS = ['aws', 'gcp'];
const ACCOUNTS = ['acct-prod-001', 'acct-staging-002', 'acct-dev-003'];

const AWS_SERVICES = [
  { service: 'EC2', types: ['t3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large', 'm5.xlarge', 'r5.large', 'c5.xlarge'], unit: 'Hrs', baseCost: 0.05 },
  { service: 'RDS', types: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.r6g.large', 'db.r6g.xlarge'], unit: 'Hrs', baseCost: 0.08 },
  { service: 'S3', types: ['Standard', 'Intelligent-Tiering', 'Glacier'], unit: 'GB-Mo', baseCost: 0.023 },
  { service: 'Lambda', types: ['x86_64', 'arm64'], unit: 'GB-Sec', baseCost: 0.000016 },
  { service: 'CloudFront', types: ['US', 'Europe', 'Asia'], unit: 'GB', baseCost: 0.085 },
];

const GCP_SERVICES = [
  { service: 'Compute Engine', types: ['e2-micro', 'e2-small', 'e2-medium', 'e2-standard-2', 'n2-standard-4', 'n2-highmem-8'], unit: 'Hrs', baseCost: 0.04 },
  { service: 'Cloud SQL', types: ['db-f1-micro', 'db-g1-small', 'db-n1-standard-1', 'db-n1-standard-4'], unit: 'Hrs', baseCost: 0.07 },
  { service: 'Cloud Storage', types: ['Standard', 'Nearline', 'Coldline', 'Archive'], unit: 'GB-Mo', baseCost: 0.02 },
  { service: 'Cloud Functions', types: ['1st-gen', '2nd-gen'], unit: 'GB-Sec', baseCost: 0.000015 },
  { service: 'Cloud CDN', types: ['US', 'EMEA', 'APAC'], unit: 'GB', baseCost: 0.08 },
];

const REGIONS = {
  aws: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
  gcp: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
};

const TAG_POOLS = {
  environment: ['prod', 'staging', 'dev', 'test'],
  team: ['platform', 'backend', 'frontend', 'data', 'ml', 'security'],
  project: ['payments', 'auth', 'analytics', 'recommendations', 'notifications', 'search'],
  owner: ['alice', 'bob', 'carol', 'dave', 'eve'],
};

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateTags() {
  const tags = {};
  for (const [key, values] of Object.entries(TAG_POOLS)) {
    if (Math.random() > 0.2) {
      tags[key] = randomElement(values);
    }
  }
  return tags;
}

function getServicesForProvider(provider) {
  return provider === 'aws' ? AWS_SERVICES : GCP_SERVICES;
}

function getRegionsForProvider(provider) {
  return REGIONS[provider];
}

export function generateMockBillingRecord(accountId, provider, date) {
  const services = getServicesForProvider(provider);
  const regions = getRegionsForProvider(provider);
  const svc = randomElement(services);
  const resourceType = randomElement(svc.types);
  const region = randomElement(regions);
  
  let usageAmount, unit, unblendedCost;
  
  if (svc.unit === 'Hrs') {
    usageAmount = randomInt(1, 730);
    unblendedCost = usageAmount * svc.baseCost * randomFloat(0.5, 2.0);
  } else if (svc.unit === 'GB-Mo') {
    usageAmount = randomInt(1, 5000);
    unblendedCost = usageAmount * svc.baseCost * randomFloat(0.5, 2.0);
  } else if (svc.unit === 'GB-Sec') {
    usageAmount = randomInt(1000000, 100000000);
    unblendedCost = (usageAmount / 1e9) * svc.baseCost * randomFloat(0.5, 2.0);
  } else {
    usageAmount = randomInt(1, 1000);
    unblendedCost = usageAmount * svc.baseCost * randomFloat(0.5, 2.0);
  }
  
  unit = svc.unit;
  const blendedCost = unblendedCost * randomFloat(0.9, 1.1);
  
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  
  return {
    accountId,
    service: svc.service,
    resourceId: `${provider}-${svc.service.toLowerCase().replace(/\s+/g, '-')}-${randomElement(['prod', 'staging', 'dev'])}-${randomInt(1000, 9999)}`,
    resourceType,
    region,
    usageAmount,
    unit,
    unblendedCost: parseFloat(unblendedCost.toFixed(2)),
    blendedCost: parseFloat(blendedCost.toFixed(2)),
    tags: generateTags(),
    billingPeriodStart: startOfDay,
    billingPeriodEnd: endOfDay,
    ingestedAt: new Date(),
  };
}

export function generateMockBillingData(options = {}) {
  const {
    accounts = ACCOUNTS,
    days = 1,
    recordsPerDay = 50,
    provider = 'aws',
  } = options;
  
  const records = [];
  const endDate = new Date();
  endDate.setUTCHours(0, 0, 0, 0);
  
  for (let d = 0; d < days; d++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - d);
    
    for (let i = 0; i < recordsPerDay; i++) {
      const accountId = randomElement(accounts);
      const record = generateMockBillingRecord(accountId, provider, date);
      records.push(record);
    }
  }
  
  return records;
}

export function generateIdleResourceRecords(accountId, count = 5) {
  const records = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const provider = randomElement(PROVIDERS);
    const services = getServicesForProvider(provider);
    const svc = randomElement(services.filter(s => s.unit === 'Hrs'));
    const resourceType = randomElement(svc.types);
    const region = randomElement(getRegionsForProvider(provider));
    
    const usageAmount = 730;
    const unblendedCost = usageAmount * svc.baseCost * randomFloat(1.0, 1.5);
    
    records.push({
      accountId,
      service: svc.service,
      resourceId: `${provider}-idle-${svc.service.toLowerCase().replace(/\s+/g, '-')}-${randomInt(1000, 9999)}`,
      resourceType,
      region,
      usageAmount,
      unit: 'Hrs',
      unblendedCost: parseFloat(unblendedCost.toFixed(2)),
      blendedCost: parseFloat((unblendedCost * 1.05).toFixed(2)),
      tags: { ...generateTags(), anomaly: 'idle-candidate' },
      billingPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      ingestedAt: new Date(),
    });
  }
  
  return records;
}