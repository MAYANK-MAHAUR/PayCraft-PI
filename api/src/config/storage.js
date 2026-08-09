const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const storageUrl = process.env.STORAGE_URL;
const storageKey = process.env.STORAGE_KEY;
const storageBucket = process.env.STORAGE_BUCKET || 'paycraft-files';

let s3Client = null;

if (storageUrl && storageKey) {
  s3Client = new S3Client({
    endpoint: storageUrl,
    credentials: {
      accessKeyId: storageKey,
      secretAccessKey: process.env.STORAGE_SECRET || storageKey,
    },
    region: 'us-east-1',
    forcePathStyle: true,
  });
}

const localUploadsDir = path.join(__dirname, '../../uploads');

const storage = {
  async uploadFile(key, buffer, contentType = 'application/pdf') {
    if (s3Client) {
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: storageBucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }));
        return `${storageUrl}/${storageBucket}/${key}`;
      } catch (err) {
        console.warn('S3 upload error, saving locally:', err.message);
      }
    }

    // Local fallback
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }
    const filePath = path.join(localUploadsDir, key.replace(/\//g, '_'));
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${path.basename(filePath)}`;
  }
};

module.exports = storage;
