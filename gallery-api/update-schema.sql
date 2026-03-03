-- Add file_type column to distinguish between images and videos
ALTER TABLE gallery_images ADD COLUMN file_type TEXT DEFAULT 'image';
