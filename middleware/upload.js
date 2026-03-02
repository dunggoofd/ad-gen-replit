const multer = require('multer');
const path = require('path');
const fs = require('fs');

fs.mkdirSync('public/uploads/logos', { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/logos'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const logoUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

module.exports = { logoUpload };
