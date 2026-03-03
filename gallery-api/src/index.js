/**
 * Liebe Piano Gallery API
 * Cloudflare Worker for managing gallery images with D1 and R2
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// API Routes
			if (path === '/api/images' && request.method === 'GET') {
				return await getImages(env, corsHeaders);
			}

			if (path === '/api/upload' && request.method === 'POST') {
				return await uploadImage(request, env, corsHeaders);
			}

			if (path.startsWith('/api/images/') && request.method === 'DELETE') {
				return await deleteImage(request, path, env, corsHeaders);
			}

			if (path.startsWith('/images/')) {
				return await getImage(path, env);
			}

			return new Response('Not Found', { status: 404, headers: corsHeaders });
		} catch (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};

/**
 * Get all gallery images and videos
 */
async function getImages(env, corsHeaders) {
	const { results } = await env.DB.prepare(
		'SELECT id, filename, title, description, image_key, file_type, created_at, display_order FROM gallery_images ORDER BY display_order DESC, created_at DESC'
	).all();

	return new Response(JSON.stringify(results), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Upload new image or video
 */
async function uploadImage(request, env, corsHeaders) {
	// Check admin password
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || authHeader !== `Bearer ${env.ADMIN_PASSWORD}`) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const formData = await request.formData();
	const file = formData.get('image');
	const title = formData.get('title') || '';
	const description = formData.get('description') || '';

	if (!file) {
		return new Response(JSON.stringify({ error: 'No file provided' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Check file size (25MB limit)
	const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
	if (file.size > MAX_FILE_SIZE) {
		return new Response(JSON.stringify({ error: 'File size exceeds 25MB limit' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Determine file type
	const fileType = file.type.startsWith('video/') ? 'video' : 'image';

	// Validate file type
	const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
	const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

	if (!allowedImageTypes.includes(file.type) && !allowedVideoTypes.includes(file.type)) {
		return new Response(JSON.stringify({ error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Generate unique filename
	const timestamp = Date.now();
	const originalName = file.name;
	const extension = originalName.split('.').pop();
	const imageKey = `gallery/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

	// Upload to R2
	await env.IMAGES.put(imageKey, file.stream(), {
		httpMetadata: {
			contentType: file.type,
		},
	});

	// Save to D1
	const result = await env.DB.prepare(
		'INSERT INTO gallery_images (filename, title, description, image_key, file_type) VALUES (?, ?, ?, ?, ?)'
	)
		.bind(originalName, title, description, imageKey, fileType)
		.run();

	return new Response(
		JSON.stringify({
			success: true,
			id: result.meta.last_row_id,
			image_key: imageKey,
			file_type: fileType,
		}),
		{
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Delete image
 */
async function deleteImage(request, path, env, corsHeaders) {
	// Check admin password
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || authHeader !== `Bearer ${env.ADMIN_PASSWORD}`) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const id = path.split('/').pop();

	// Get image info
	const image = await env.DB.prepare('SELECT image_key FROM gallery_images WHERE id = ?').bind(id).first();

	if (!image) {
		return new Response(JSON.stringify({ error: 'Image not found' }), {
			status: 404,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	// Delete from R2
	await env.IMAGES.delete(image.image_key);

	// Delete from D1
	await env.DB.prepare('DELETE FROM gallery_images WHERE id = ?').bind(id).run();

	return new Response(JSON.stringify({ success: true }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

/**
 * Get image from R2
 */
async function getImage(path, env) {
	const imageKey = path.substring(8); // Remove '/images/' prefix
	const object = await env.IMAGES.get(imageKey);

	if (!object) {
		return new Response('Image not found', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('Cache-Control', 'public, max-age=31536000');

	return new Response(object.body, { headers });
}
