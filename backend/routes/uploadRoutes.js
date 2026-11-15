const express = require('express');
const multer = require('multer');
const c = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (c.ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
        const err = new Error('Only JPG, PNG or WebP images are allowed.');
        err.status = 400;
        cb(err);
    },
});

const router = express.Router();
router.post('/profile-picture', verifyToken, upload.single('profilePicture'), c.uploadProfilePicture);

module.exports = router;
