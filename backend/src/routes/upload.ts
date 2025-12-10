import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import sharp from 'sharp'
import { FileModel } from '@/models/File'

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads')
const chunksDir = path.join(process.cwd(), 'uploads', 'chunks')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true })
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
    fileSize: 20 * 1024 * 1024 // 20MB limit (increased for mobile high res images)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images are allowed'))
    }
  }
})

// 分片上传存储配置
const chunkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, chunksDir)
  },
  filename: function (req, file, cb) {
    const hash = req.body.hash
    const chunkIndex = req.body.chunkIndex
    cb(null, `${hash}-${chunkIndex}`)
  }
})

const chunkUpload = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB per chunk
  }
})

const router = Router()

// 原有单文件上传接口（保留兼容性）
router.post('/image', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 4000, message: 'No file uploaded' })
  }
  
  try {
    // Get image metadata (width, height)
    const metadata = await sharp(req.file.path).metadata()
    
    // Return the URL (assuming static serve is set up)
    const url = `/uploads/${req.file.filename}`
    
    res.json({
      code: 0,
      message: 'Upload successful',
      data: {
        url,
        thumbnailUrl: url,
        width: metadata.width,
        height: metadata.height
      }
    })
  } catch (error) {
    console.error('Image processing error:', error)
    res.status(500).json({ code: 5000, message: 'Failed to process image' })
  }
})

// ============ 大文件上传接口 ============

/**
 * 检查文件是否存在（秒传）
 * POST /api/upload/check
 */
router.post('/check', async (req, res) => {
  try {
    const { hash, filename, size } = req.body

    if (!hash || !filename || !size) {
      return res.status(400).json({ 
        code: 4006, 
        message: 'Missing required fields: hash, filename, size' 
      })
    }

    // 查询文件是否存在
    const file = await FileModel.findOne({ hash, status: 'completed' })

    if (file && file.url) {
      // 文件已存在，秒传成功
      return res.json({
        code: 0,
        message: 'File already exists',
        data: {
          exists: true,
          url: file.url
        }
      })
    }

    // 文件不存在
    res.json({
      code: 0,
      message: 'File not found',
      data: {
        exists: false
      }
    })
  } catch (error) {
    console.error('Check file error:', error)
    res.status(500).json({ code: 5000, message: 'Failed to check file' })
  }
})

/**
 * 查询已上传的分片（断点续传）
 * GET /api/upload/chunks/:hash
 */
router.get('/chunks/:hash', async (req, res) => {
  try {
    const { hash } = req.params

    const file = await FileModel.findOne({ hash })

    if (!file) {
      return res.json({
        code: 0,
        message: 'File record not found',
        data: {
          chunks: []
        }
      })
    }

    res.json({
      code: 0,
      message: 'Success',
      data: {
        chunks: file.uploadedChunks.map(index => ({ chunkIndex: index }))
      }
    })
  } catch (error) {
    console.error('Get chunks error:', error)
    res.status(500).json({ code: 5000, message: 'Failed to get chunks' })
  }
})

/**
 * 上传单个分片
 * POST /api/upload/chunk
 */
router.post('/chunk', chunkUpload.single('chunk'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 4000, message: 'No chunk uploaded' })
    }

    const { hash, chunkIndex } = req.body

    if (!hash || chunkIndex === undefined) {
      return res.status(400).json({ 
        code: 4006, 
        message: 'Missing required fields: hash, chunkIndex' 
      })
    }

    const chunkIndexNum = parseInt(chunkIndex)

    // 查找或创建文件记录
    let file = await FileModel.findOne({ hash })

    if (!file) {
      // 创建新文件记录（需要从请求中获取文件信息）
      file = new FileModel({
        hash,
        filename: req.body.filename || 'unknown',
        size: parseInt(req.body.size) || 0,
        mimeType: req.file.mimetype,
        totalChunks: parseInt(req.body.totalChunks) || 1,
        uploadedChunks: [],
        status: 'uploading'
      })
    }

    // 检查分片是否已上传
    if (!file.uploadedChunks.includes(chunkIndexNum)) {
      file.uploadedChunks.push(chunkIndexNum)
      file.uploadedChunks.sort((a, b) => a - b) // 排序
    }

    await file.save()

    res.json({
      code: 0,
      message: 'Chunk uploaded successfully',
      data: {
        chunkIndex: chunkIndexNum
      }
    })
  } catch (error) {
    console.error('Upload chunk error:', error)
    res.status(500).json({ code: 5000, message: 'Failed to upload chunk' })
  }
})

/**
 * 合并所有分片
 * POST /api/upload/merge
 */
router.post('/merge', async (req, res) => {
  try {
    const { hash, filename, totalChunks } = req.body

    if (!hash || !filename || !totalChunks) {
      return res.status(400).json({ 
        code: 4006, 
        message: 'Missing required fields: hash, filename, totalChunks' 
      })
    }

    // 查找文件记录
    const file = await FileModel.findOne({ hash })

    if (!file) {
      return res.status(404).json({ 
        code: 4005, 
        message: 'File record not found' 
      })
    }

    // 检查所有分片是否已上传
    const expectedChunks = Array.from({ length: totalChunks }, (_, i) => i)
    const missingChunks = expectedChunks.filter(
      index => !file.uploadedChunks.includes(index)
    )

    if (missingChunks.length > 0) {
      return res.status(400).json({ 
        code: 4006, 
        message: `Missing chunks: ${missingChunks.join(', ')}` 
      })
    }

    // 合并分片
    const ext = path.extname(filename)
    const finalFilename = `${hash}${ext}`
    const finalPath = path.join(uploadDir, finalFilename)
    const writeStream = fs.createWriteStream(finalPath)

    // 按顺序读取并合并所有分片
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunksDir, `${hash}-${i}`)
      
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Chunk ${i} not found`)
      }

      const chunkData = fs.readFileSync(chunkPath)
      writeStream.write(chunkData)
    }

    writeStream.end()

    // 等待写入完成
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })

    // 处理图片（获取元数据、生成缩略图等）
    let imageMetadata: any = {}
    try {
      const metadata = await sharp(finalPath).metadata()
      imageMetadata = {
        width: metadata.width,
        height: metadata.height
      }
    } catch (error) {
      console.warn('Failed to get image metadata:', error)
    }

    // 更新文件记录
    const url = `/uploads/${finalFilename}`
    file.url = url
    file.status = 'completed'
    await file.save()

    // 清理分片文件（可选，可以保留用于断点续传）
    // for (let i = 0; i < totalChunks; i++) {
    //   const chunkPath = path.join(chunksDir, `${hash}-${i}`)
    //   if (fs.existsSync(chunkPath)) {
    //     fs.unlinkSync(chunkPath)
    //   }
    // }

    res.json({
      code: 0,
      message: 'File merged successfully',
      data: {
        url,
        ...imageMetadata
      }
    })
  } catch (error) {
    console.error('Merge chunks error:', error)
    res.status(500).json({ code: 5000, message: 'Failed to merge chunks' })
  }
})

export default router

