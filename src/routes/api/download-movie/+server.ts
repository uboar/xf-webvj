import type { RequestHandler } from './$types';
import type { DownloadMovieRequest } from '$lib/types';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';
import { runYtDlp } from '$lib/server/download';
import { errorResponse } from '$lib/server/http';

export const POST: RequestHandler = async ({ request }) => {
	const searchString = `[Merger] Merging formats into "${PUBLIC_MOVIE_PATH}/`;

	try {
		if (!request.body) {
			return errorResponse(400, 'リクエストボディが必要です');
		}

		const req = (await request.json()) as DownloadMovieRequest;
		if (!req.url?.trim()) {
			return errorResponse(400, 'URL が必要です');
		}

		const output = runYtDlp(PUBLIC_MOVIE_PATH, req.args ?? '', req.url.trim()).split('\n');
		for (const line of output) {
			if (line.includes(searchString)) {
				const outputFileName = line.replace(searchString, '').replace(/"$/, '');
				return new Response(outputFileName, { status: 200 });
			}
		}

		return errorResponse(500, 'ダウンロード結果の解析に失敗しました');
	} catch (error) {
		console.error('Error downloading movie:', error);
		return errorResponse(500, '動画のダウンロードに失敗しました');
	}
};
