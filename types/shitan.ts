export type FeedComment = {
  id: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
};

export type FeedPost = {
  id: string;
  text: string;
  imageUrls: string[];
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
  };
  comments: FeedComment[];
};
