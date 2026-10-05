// Creates the three ADR-009 buckets in the staging SeaweedFS (idempotent). Run from apps/api with the env loaded
// (infra/staging/remote-deploy.sh); the AWS SDK is resolved from there.
const { createRequire } = require('node:module');
const { S3Client, CreateBucketCommand, HeadBucketCommand } = createRequire(
  `${process.cwd()}/package.json`,
)('@aws-sdk/client-s3');
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});
(async () => {
  for (const Bucket of [
    process.env.S3_BUCKET_PUBLIC,
    process.env.S3_BUCKET_PRIVATE,
    process.env.S3_BUCKET_KYC,
  ]) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket }));
      console.log(Bucket, 'exists');
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket }));
      console.log(Bucket, 'created');
    }
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
