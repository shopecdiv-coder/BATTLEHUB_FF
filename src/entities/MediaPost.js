import { FirestoreEntity } from "../api/entities";

class MediaPostEntity extends FirestoreEntity {
  constructor() {
    super("media_posts");
  }

  // Example fields:
  // type: 'image' | 'video' | 'text'
  // title: string
  // description: string
  // media_urls: string[]
  // video_url: string
  // thumbnail_url: string
  // created_date: string (ISO)
  // views: number
  // likes: string[] (user IDs)
  // saves: string[] (user IDs)
  // shares: number
  // comments_disabled: boolean
  // is_pinned: boolean
  // is_featured: boolean
  // status: string ('published', 'draft', etc)

  async incrementView(postId) {
    // Only increment view if we haven't viewed it in this session
    // We can handle local session cache in the frontend component to avoid over-fetching
    const post = await this.get(postId);
    if (!post) return;
    await this.update(postId, { views: (post.views || 0) + 1 });
  }

  async toggleLike(postId, userId) {
    const post = await this.get(postId);
    if (!post) return;
    const likes = post.likes || [];
    const index = likes.indexOf(userId);
    if (index === -1) {
      likes.push(userId);
    } else {
      likes.splice(index, 1);
    }
    await this.update(postId, { likes });
    return likes.includes(userId); // Return current state
  }

  async toggleSave(postId, userId) {
    const post = await this.get(postId);
    if (!post) return;
    const saves = post.saves || [];
    const index = saves.indexOf(userId);
    if (index === -1) {
      saves.push(userId);
    } else {
      saves.splice(index, 1);
    }
    await this.update(postId, { saves });
    return saves.includes(userId); // Return current state
  }
}

export const MediaPost = new MediaPostEntity();
