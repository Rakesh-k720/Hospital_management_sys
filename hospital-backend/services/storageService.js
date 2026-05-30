const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const ensureUploadDir = () => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
};

/**
 * Upload file buffer. Supports: local (default), aws (S3), cloudinary.
 * Returns public URL path for DB storage.
 */
exports.uploadFile = async (file, originalName) => {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    const ext = path.extname(originalName || file.originalname || '.pdf');
    const filename = `${Date.now()}${ext}`;

    if (provider === 'aws' && process.env.AWS_S3_BUCKET) {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const client = new S3Client({
            region: process.env.AWS_REGION || 'ap-south-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        const buffer = file.buffer || fs.readFileSync(file.path);
        const key = `lab-reports/${filename}`;
        await client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.mimetype || 'application/pdf'
        }));
        const url = process.env.AWS_CLOUDFRONT_URL
            ? `${process.env.AWS_CLOUDFRONT_URL}/${key}`
            : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
        return { filename: key, url, storage: 'aws' };
    }

    if (provider === 'cloudinary' && process.env.CLOUDINARY_URL) {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({ secure: true });
        const buffer = file.buffer || fs.readFileSync(file.path);
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'hms_lab_reports', resource_type: 'auto' },
                (err, res) => (err ? reject(err) : resolve(res))
            );
            stream.end(buffer);
        });
        return { filename: result.public_id, url: result.secure_url, storage: 'cloudinary' };
    }

    ensureUploadDir();
    const dest = path.join(UPLOAD_DIR, filename);
    if (file.path) {
        fs.renameSync(file.path, dest);
    } else if (file.buffer) {
        fs.writeFileSync(dest, file.buffer);
    }
    return { filename, url: `/uploads/${filename}`, storage: 'local' };
};

exports.resolvePublicUrl = (storedPath) => {
    if (!storedPath) return null;
    if (storedPath.startsWith('http')) return storedPath;
    const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${base}${storedPath.startsWith('/') ? '' : '/'}${storedPath}`;
};
