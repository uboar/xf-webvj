import { createReadStream, statSync } from 'fs';
import { extname } from 'path';
import { Readable } from 'stream';
import type { RequestHandler } from './$types';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';
import { errorResponse } from '$lib/server/http';
import { MovieFileError, resolveMovieFilePath, isImageFileName } from '$lib/server/movie-files';

const IMAGE_CONTENT_TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
	'.svg': 'image/svg+xml'
};

export const GET: RequestHandler = async ({ url, request }) => {
	const fileName = url.searchParams.get('video');

	if (!fileName) {
		return errorResponse(400, 'video パラメータが必要です');
	}

	try {
		const videoPath = resolveMovieFilePath(fileName, PUBLIC_MOVIE_PATH);
		const { size: fileSize } = statSync(videoPath);
		const ext = extname(fileName).toLowerCase();
		const isImage = isImageFileName(fileName);
		const contentType = isImage ? (IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream') : 'video/mp4';
		const range = request.headers.get('range');

		if (!range || isImage) {
			const fileStream = createReadStream(videoPath);
			return new Response(Readable.toWeb(fileStream) as ReadableStream, {
				status: 200,
				headers: {
					'Accept-Ranges': 'bytes',
					'Content-Length': fileSize.toString(),
					'Content-Type': contentType
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
				'Content-Type': contentType
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
