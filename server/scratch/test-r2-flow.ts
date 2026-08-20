import '../src/load-env.js'
import { generatePresignedUploadUrl, generatePresignedViewUrl } from '../src/lib/r2.js'

async function runTest() {
  console.log('=== starting Cloudflare R2 Bucket Resolution Verification ===');
  
  const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME || 'pg-public-media';
  const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME || 'pg-private-kyc';
  
  console.log(`Public Bucket configured: "${publicBucket}"`);
  console.log(`Private Bucket configured: "${privateBucket}"`);
  console.log(`Cloudflare Account ID: "${process.env.CLOUDFLARE_ACCOUNT_ID}"`);
  
  try {
    // Generate public upload URL
    console.log('\nGenerating presigned public media upload URL...');
    const publicUploadUrl = await generatePresignedUploadUrl(
      publicBucket,
      'media/test-property-123/exterior.jpg',
      'image/jpeg',
      3600
    );
    console.log('SUCCESS!');
    console.log(`Generated URL: ${publicUploadUrl}`);
    const isPublicOk = publicUploadUrl.includes(publicBucket);
    console.log(`Verification: ${isPublicOk ? 'PASS (Correct Public Bucket Resolved)' : 'FAIL'}`);
    
    // Generate private KYC upload URL
    console.log('\nGenerating presigned private tenant KYC upload URL...');
    const privateUploadUrl = await generatePresignedUploadUrl(
      privateBucket,
      'kyc/test-tenant-456/aadhar.webp',
      'image/webp',
      600
    );
    console.log('SUCCESS!');
    console.log(`Generated URL: ${privateUploadUrl}`);
    const isPrivateUploadOk = privateUploadUrl.includes(privateBucket);
    console.log(`Verification: ${isPrivateUploadOk ? 'PASS (Correct Private Bucket Resolved)' : 'FAIL'}`);
    
    // Generate private KYC view URL
    console.log('\nGenerating presigned private tenant KYC view URL...');
    const privateViewUrl = await generatePresignedViewUrl(
      privateBucket,
      'kyc/test-tenant-456/aadhar.webp',
      600
    );
    console.log('SUCCESS!');
    console.log(`Generated URL: ${privateViewUrl}`);
    const isPrivateViewOk = privateViewUrl.includes(privateBucket);
    console.log(`Verification: ${isPrivateViewOk ? 'PASS (Correct Private Bucket Resolved)' : 'FAIL'}`);
    
    console.log('\n=== Verification Summary ===');
    console.log(`PG Images/Videos: target bucket is "${publicBucket}" -> ${isPublicOk ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`Tenant KYC Docs: target bucket is "${privateBucket}" -> ${isPrivateUploadOk && isPrivateViewOk ? 'SUCCESS' : 'FAILURE'}`);
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTest();
