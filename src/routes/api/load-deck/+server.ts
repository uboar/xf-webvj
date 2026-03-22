import type { RequestHandler } from './$types';
import { loadDeckFromExternal } from '$lib/ws-server';
import { json, errorResponse } from '$lib/server/http';
import { extractYouTubeVideoId } from '$lib/youtube';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { deckIndex, url } = body as { deckIndex?: number; url?: string };

	if (deckIndex === undefined || deckIndex < 0 || deckIndex > 1) {
		return errorResponse(400, 'deckIndex は 0 または 1 を指定してください');
	}

	if (!url?.trim()) {
		return errorResponse(400, 'URL が必要です');
	}

	const videoId = extractYouTubeVideoId(url);
	const sourceType = videoId ? 'youtube' : 'local';

	loadDeckFromExternal(deckIndex, url, sourceType);

	return json({ success: true, deckIndex, url, sourceType });
};
