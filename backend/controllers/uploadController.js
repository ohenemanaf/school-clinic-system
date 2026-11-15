const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const pool = require('../config/db');
const { HttpError } = require('../utils/http');

const EXT_BY_TYPE = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || 'us-east-1';
// Credentials come from the environment (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) or an IAM role.
const s3 = BUCKET ? new S3Client({ region: REGION }) : null;

exports.ALLOWED_TYPES = Object.keys(EXT_BY_TYPE);

exports.uploadProfilePicture = async (req, res) => {
    if (!s3) throw new HttpError(503, 'Profile pictures are not enabled on this server.');
    if (!req.file) throw new HttpError(400, 'No file uploaded.');

    // The extension comes from the checked MIME type, never from the client's filename.
    const key = `profile-pictures/${req.user.userId}-${crypto.randomBytes(8).toString('hex')}${EXT_BY_TYPE[req.file.mimetype]}`;
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    }));

    const url = process.env.AWS_S3_PUBLIC_URL
        ? `${process.env.AWS_S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`
        : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    await pool.query('UPDATE users SET profile_picture_url = ? WHERE user_id = ?', [url, req.user.userId]);
    res.json({ message: 'Profile picture updated', url });
};
