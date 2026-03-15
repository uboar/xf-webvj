import type { RequestHandler } from './$types';
import { json, errorResponse } from '$lib/server/http';
import { listMovieFiles } from '$lib/server/movie-files';

export const GET: RequestHandler = async () => {
	try {
		return json(await listMovieFiles());
	} catch (error) {
		console.error('Error reading movie directory:', error);
		return errorResponse(500, '動画一覧の取得に失敗しました');
	}
};
