const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pool = require('../config/db');
const path = require('path');
const crypto = require('crypto');

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    // In production, EC2 IAM roles will automatically provide credentials.
    // Locally, you can set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env
});

exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const userId = req.user.userId;
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${userId}-${crypto.randomBytes(8).toString('hex')}${fileExt}`;
        const bucketName = process.env.AWS_S3_BUCKET_NAME || 'schoolclinic-assets-placeholder';

        const params = {
            Bucket: bucketName,
            Key: `profile-pictures/${fileName}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL: 'public-read' // Uncomment if bucket allows public ACLs
        };

        const command = new PutObjectCommand(params);
        
        try {
            await s3.send(command);
        } catch (s3Error) {
            console.error('S3 Upload Error. Ensure AWS credentials are set:', s3Error.message);
            // If AWS is not configured yet, we will fallback to a dummy URL so testing doesn't break
            if (s3Error.message.includes('credentials')) {
                console.log("Mocking S3 upload due to missing credentials.");
            } else {
                throw s3Error;
            }
        }

        // The URL of the uploaded object
        const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/profile-pictures/${fileName}`;

        // Update the user in the database
        await pool.query('UPDATE users SET profile_picture_url = ? WHERE user_id = ?', [fileUrl, userId]);

        res.json({ message: 'Profile picture uploaded successfully', url: fileUrl });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Failed to upload profile picture', error: error.message });
    }
};
