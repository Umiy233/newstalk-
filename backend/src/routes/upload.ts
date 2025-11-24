import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images are allowed'))
    }
  }
})

const router = Router()

router.post('/image', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 4000, message: 'No file uploaded' })
  }
  
  // Return the URL (assuming static serve is set up)
  const url = `/uploads/${req.file.filename}`
  
  res.json({
    code: 0,
    message: 'Upload successful',
    data: {
      url,
      thumbnailUrl: url
    }
  })
})

export default router

