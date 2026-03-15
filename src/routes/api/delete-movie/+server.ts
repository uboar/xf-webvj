import type { RequestHandler } from './$types';
import { deleteMovieFile, MovieFileError } from '$lib/server/movie-files';
import { errorResponse, json } from '$lib/server/http';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { fileName } = await request.json();
		await deleteMovieFile(fileName);

		return json({ success: true, fileName });
	} catch (error) {
		if (error instanceof MovieFileError) {
			return errorResponse(error.status, error.message);
		}
		console.error('Error deleting file:', error);
		return errorResponse(500, 'ファイルの削除に失敗しました');
	}
};
