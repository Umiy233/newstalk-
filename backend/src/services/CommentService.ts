import { Comment, IComment } from '@/models/Comment'
import { Article } from '@/models/Article'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'

export class CommentService {
  /**
   * 创建评论
   */
  async create(articleId: string, userId: string, content: string, parentId?: string) {
    // Check if article exists
    const article = await Article.findById(articleId)
    if (!article || article.isDeleted) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Article not found', 404)
    }

    // If parentId is provided, check if parent comment exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId)
      if (!parentComment || parentComment.articleId.toString() !== articleId) {
        throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Parent comment not found', 404)
      }
    }

    const comment = await Comment.create({
      articleId,
      userId,
      content,
      parentId: parentId || undefined,
    })

    return await comment.populate('userId', 'username avatar')
  }

  /**
   * 获取文章的所有评论（包括回复）
   */
  async getByArticle(articleId: string) {
    const comments = await Comment.find({ articleId, parentId: null })
      .sort({ createdAt: -1 })
      .populate('userId', 'username avatar')
      .lean()

    // Get replies for each comment
    const commentIds = comments.map(c => (c as any)._id.toString())
    const replies = await Comment.find({ parentId: { $in: commentIds } })
      .sort({ createdAt: 1 })
      .populate('userId', 'username avatar')
      .lean()

    // Group replies by parentId
    const repliesMap = new Map()
    replies.forEach((reply: any) => {
      const parentId = reply.parentId.toString()
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, [])
      }
      repliesMap.get(parentId).push(reply)
    })

    // Attach replies to comments
    return comments.map((comment: any) => ({
      ...comment,
      replies: repliesMap.get(comment._id.toString()) || [],
    }))
  }

  /**
   * 删除评论
   */
  async delete(commentId: string, userId: string) {
    const comment = await Comment.findOne({ _id: commentId, userId })
    if (!comment) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Comment not found or permission denied', 404)
    }

    // Also delete all replies
    await Comment.deleteMany({ parentId: commentId })
    await Comment.deleteOne({ _id: commentId })
  }

  /**
   * 获取评论数量
   */
  async getCount(articleId: string): Promise<number> {
    return await Comment.countDocuments({ articleId })
  }
}

export const commentService = new CommentService()

