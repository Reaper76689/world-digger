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
  statusTag: string;
  campusId: string;
  spotId: string;
  expiresAt: string;
  confirmsCount: number;
  outdatedCount: number;
  createdAt: string;
  campus?: {
    id: string;
    displayName: string;
    city: string;
  } | null;
  spot: {
    id: string;
    name: string;
  } | null;
  author: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    title: string;
  };
  comments: FeedComment[];
};

export type UserContentStatus = "pending" | "approved" | "rejected" | "hidden";

export type UserPostStatusItem = {
  id: string;
  text: string;
  imageUrls: string[];
  statusTag: string;
  status: UserContentStatus;
  expiresAt: string;
  confirmsCount: number;
  outdatedCount: number;
  createdAt: string;
  moderationReason: string | null;
  moderatedAt: string | null;
  spot: {
    id: string;
    name: string;
  } | null;
};

export type UserCommentStatusItem = {
  id: string;
  text: string;
  status: UserContentStatus;
  createdAt: string;
  moderationReason: string | null;
  moderatedAt: string | null;
  post: {
    id: string;
    text: string;
  };
};
