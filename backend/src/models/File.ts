import mongoose, { Schema, Document } from 'mongoose'

/**
 * 文件模型 - 用于大文件上传（分片上传、秒传、断点续传）
 */
export interface IFile extends Document {
  hash: string // 文件 MD5 hash（唯一标识）
  filename: string // 原始文件名
  size: number // 文件大小
  mimeType: string // MIME 类型
  url?: string // 文件访问 URL（合并后生成）
  totalChunks: number // 总分片数
  uploadedChunks: number[] // 已上传的分片索引
  status: 'uploading' | 'completed' // 上传状态
  createdAt: Date
  updatedAt: Date
}

const fileSchema = new Schema<IFile>(
  {
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    uploadedChunks: {
      type: [Number],
      default: [],
    },
    status: {
      type: String,
      enum: ['uploading', 'completed'],
      default: 'uploading',
    },
  },
  {
    timestamps: true,
  }
)

// 索引优化
fileSchema.index({ hash: 1 })
fileSchema.index({ status: 1 })

export const FileModel = mongoose.model<IFile>('File', fileSchema)

