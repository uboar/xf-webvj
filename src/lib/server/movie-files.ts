import { readdir, rename, unlink } from 'fs/promises';
import { basename, resolve, sep } from 'path';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';

const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\u0000]/;

export class MovieFileError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'MovieFileError';
		this.status = status;
	}
}

const getMovieRoot = (root = PUBLIC_MOVIE_PATH) => resolve(root);

export const assertSafeMovieFileName = (fileName: string) => {
	const normalizedName = fileName.trim();

	if (!normalizedName) {
		throw new MovieFileError('ファイル名が必要です');
	}

	if (basename(normalizedName) !== normalizedName || INVALID_FILE_NAME_CHARS.test(normalizedName)) {
		throw new MovieFileError('ファイル名に使用できない文字が含まれています');
	}

	return normalizedName;
};

export const resolveMovieFilePath = (fileName: string, root = PUBLIC_MOVIE_PATH) => {
	const safeName = assertSafeMovieFileName(fileName);
	const movieRoot = getMovieRoot(root);
	const resolvedPath = resolve(movieRoot, safeName);

	if (resolvedPath !== movieRoot && !resolvedPath.startsWith(`${movieRoot}${sep}`)) {
		throw new MovieFileError('不正なファイルパスです');
	}

	return resolvedPath;
};

export const listMovieFiles = async (root = PUBLIC_MOVIE_PATH) => {
	const entries = await readdir(getMovieRoot(root), { withFileTypes: true });

	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.sort();
};

export const renameMovieFile = async (
	oldName: string,
	newName: string,
	root = PUBLIC_MOVIE_PATH
) => {
	const fromPath = resolveMovieFilePath(oldName, root);
	const toPath = resolveMovieFilePath(newName, root);

	await rename(fromPath, toPath);
};

export const deleteMovieFile = async (fileName: string, root = PUBLIC_MOVIE_PATH) => {
	const filePath = resolveMovieFilePath(fileName, root);

	await unlink(filePath);
};
