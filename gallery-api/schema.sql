-- Gallery images table
CREATE TABLE IF NOT EXISTS gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    title TEXT,
    description TEXT,
    image_key TEXT NOT NULL,
    thumbnail_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_display_order ON gallery_images(display_order DESC, created_at DESC);
