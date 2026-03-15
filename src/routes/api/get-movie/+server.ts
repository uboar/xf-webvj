import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';
import type { RequestHandler } from './$types';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';
import { errorResponse } from '$lib/server/http';
import { MovieFileError, resolveMovieFilePath } from '$lib/server/movie-files';

export const GET: RequestHandler = async ({ url, request }) => {
	const fileName = url.searchParams.get('video');

	if (!fileName) {
		return errorResponse(400, 'video パラメータが必要です');
	}

	try {
		const videoPath = resolveMovieFilePath(fileName, PUBLIC_MOVIE_PATH);
		const { size: fileSize } = statSync(videoPath);
		const range = request.headers.get('range');

		if (!range) {
			const fileStream = createReadStream(videoPath);
			return new Response(Readable.toWeb(fileStream) as ReadableStream, {
				status: 200,
				headers: {
					'Accept-Ranges': 'bytes',
					'Content-Length': fileSize.toString(),
					'Content-Type': 'video/mp4'
				}
			});
		}

		const [startText, endText] = range.replace(/bytes=/, '').split('-');
		const start = Number.parseInt(startText, 10);
		const end = endText ? Number.parseInt(endText, 10) : fileSize - 1;

		if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= fileSize || start > end) {
			return errorResponse(416, '無効な range ヘッダーです');
		}

		const fileStream = createReadStream(videoPath, { start, end });
		return new Response(Readable.toWeb(fileStream) as ReadableStream, {
			status: 206,
			headers: {
				'Accept-Ranges': 'bytes',
				'Content-Length': String(end - start + 1),
				'Content-Range': `bytes ${start}-${end}/${fileSize}`,
				'Content-Type': 'video/mp4'
			}
		});
	} catch (error) {
		if (error instanceof MovieFileError) {
			return errorResponse(error.status, error.message);
		}
		console.error('Error streaming movie:', error);
		return errorResponse(404, '動画ファイルが見つかりません');
	}
};
