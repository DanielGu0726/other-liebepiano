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
 * Get all gallery images
 */
async function getImages(env, corsHeaders) {
	const { results } = await env.DB.prepare(
		'SELECT id, filename, title, description, image_key, created_at, display_order FROM gallery_images ORDER BY display_order DESC, created_at DESC'
	).all();

	return new Response(JSON.stringify(results), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Upload new image
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
		return new Response(JSON.stringify({ error: 'No image provided' }), {
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
		'INSERT INTO gallery_images (filename, title, description, image_key) VALUES (?, ?, ?, ?)'
	)
		.bind(originalName, title, description, imageKey)
		.run();

	return new Response(
		JSON.stringify({
			success: true,
			id: result.meta.last_row_id,
			image_key: imageKey,
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
