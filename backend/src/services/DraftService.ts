import { Draft, IDraft } from '@/models/Draft'
import { Article } from '@/models/Article'
import { ApiError } from '@/middleware/errorHandler'
import { ErrorCodes } from '@/types/models'

export class DraftService {
  async save(userId: string, data: Partial<IDraft>) {
    let draft
    if (data._id) {
      draft = await Draft.findOne({ _id: data._id, userId })
      if (!draft) {
        throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Draft not found', 404)
      }
      Object.assign(draft, data)
    } else {
      // Try to find an existing draft for this user/article combination or just create a new one?
      // Usually there's a "current" draft concept or multiple drafts. 
      // The spec says "getCurrent", implying a single current draft or maybe specifically the one being edited.
      // For now, if no ID is provided, we create a new one.
       draft = new Draft({
        ...data,
        userId,
      })
    }
    
    draft.lastSavedAt = new Date()
    draft.status = 'saving'
    await draft.save()
    
    draft.status = 'synced'
    await draft.save()
    
    return draft
  }

  async getCurrent(userId: string) {
    // Return the most recently modified draft
    return await Draft.findOne({ userId }).sort({ lastEditedAt: -1 })
  }

  async delete(id: string, userId: string) {
    const result = await Draft.deleteOne({ _id: id, userId })
    if (result.deletedCount === 0) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Draft not found', 404)
    }
  }

  async publish(id: string, userId: string) {
    const draft = await Draft.findOne({ _id: id, userId })
    if (!draft) {
      throw new ApiError(ErrorCodes.RESOURCE_NOT_FOUND, 'Draft not found', 404)
    }

    // Create or Update Article
    let article
    if (draft.articleId) {
      article = await Article.findById(draft.articleId)
      if (!article) {
        // If associated article is gone, create a new one? Or error? 
        // Let's assume create new.
        article = new Article({ authorId: userId })
      }
    } else {
      article = new Article({ authorId: userId })
    }

    article.title = draft.title
    article.content = draft.content
    article.images = draft.images
    // Extract summary from content if needed (Article model handles this on pre-save)
    
    await article.save()

    // Update draft to link to article
    draft.articleId = article._id as any
    draft.status = 'synced'
    await draft.save()

    // Optionally delete draft after publish? Or keep it? 
    // Usually keep it as the "editor" state.
    
    return article
  }
}

export const draftService = new DraftService()

