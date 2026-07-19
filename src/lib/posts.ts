import { posts } from "@/data/posts";

export const publishedPosts = posts
  .filter((post) => post.status === "published")
  .sort((a, b) => b.entryDate.localeCompare(a.entryDate));

export function getPostBySlug(slug: string) {
  return publishedPosts.find((post) => post.slug === slug);
}

export function getAdjacentPosts(slug: string) {
  const index = publishedPosts.findIndex((post) => post.slug === slug);
  return {
    newer: index > 0 ? publishedPosts[index - 1] : undefined,
    older: index >= 0 && index < publishedPosts.length - 1 ? publishedPosts[index + 1] : undefined,
  };
}
