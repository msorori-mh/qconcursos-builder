/**
 * Utility to generate optimized CDN URLs for Supabase Storage files.
 * Supabase Storage serves via a global CDN by default.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const getStorageUrl = (bucket: string, path: string): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

/**
 * For external URLs (YouTube, Vimeo, etc.), convert to embed-friendly format.
 */
export const getEmbedUrl = (url: string): string => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return url;
};

/**
 * Check if URL is a Supabase storage URL and ensure CDN headers
 */
export const getCdnUrl = (url: string): string => {
  if (!url) return url;
  
  // If it's already a full URL, return as-is (CDN is automatic for Supabase Storage)
  if (url.startsWith("http")) return url;
  
  // If it's a relative storage path, build the full CDN URL
  return getStorageUrl("content", url);
};
