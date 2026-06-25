import { FirestoreEntity } from "../api/entities";

class MediaCommentEntity extends FirestoreEntity {
  constructor() {
    super("media_comments");
  }

  // Example fields:
  // post_id: string
  // user_id: string
  // username: string
  // avatar_url: string
  // text: string
  // likes: string[]
  // created_date: string (ISO)
  // is_deleted: boolean

  async toggleLike(commentId, userId) {
    const comment = await this.get(commentId);
    if (!comment) return;
    const likes = comment.likes || [];
    const index = likes.indexOf(userId);
    if (index === -1) {
      likes.push(userId);
    } else {
      likes.splice(index, 1);
    }
    await this.update(commentId, { likes });
    return likes.includes(userId); // Return current state
  }
}

export const MediaComment = new MediaCommentEntity();
