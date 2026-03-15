import type { RequestHandler } from './$types';
import { errorResponse, json } from '$lib/server/http';
import { MovieFileError, renameMovieFile } from '$lib/server/movie-files';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { oldName, newName } = await request.json();
		await renameMovieFile(oldName, newName);

		return json({ success: true, oldName, newName });
	} catch (error) {
		if (error instanceof MovieFileError) {
			return errorResponse(error.status, error.message);
		}
		console.error('Error renaming file:', error);
		return errorResponse(500, 'ファイル名の変更に失敗しました');
	}
};
