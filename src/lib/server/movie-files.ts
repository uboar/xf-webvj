import { readdir, rename, unlink } from 'fs/promises';
import { extname, resolve, sep } from 'path';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';

const INVALID_PATH_SEGMENT_CHARS = /[<>:"\\|?*\u0000]/;
const MOVIE_FILE_EXTENSIONS = new Set([
	'.mp4',
	'.mov',
	'.m4v',
	'.webm',
	'.mkv',
	'.avi',
	'.wmv',
	'.flv',
	'.mpeg',
	'.mpg'
]);

const IMAGE_FILE_EXTENSIONS = new Set([
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.webp',
	'.bmp',
	'.svg'
]);

const MEDIA_FILE_EXTENSIONS = new Set([...MOVIE_FILE_EXTENSIONS, ...IMAGE_FILE_EXTENSIONS]);

export class MovieFileError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'MovieFileError';
		this.status = status;
	}
}

const getMovieRoot = (root = PUBLIC_MOVIE_PATH) => resolve(root);

const isMovieFileName = (fileName: string) => MEDIA_FILE_EXTENSIONS.has(extname(fileName).toLowerCase());

export const isImageFileName = (fileName: string) => IMAGE_FILE_EXTENSIONS.has(extname(fileName).toLowerCase());

const normalizeRelativeMoviePath = (filePath: string, emptyMessage = 'ファイル名が必要です') => {
	const normalizedPath = filePath.trim().replaceAll('\\', '/');

	if (!normalizedPath) {
		throw new MovieFileError(emptyMessage);
	}

	const segments = normalizedPath.split('/');

	if (
		segments.some(
			(segment) =>
				!segment || segment === '.' || segment === '..' || INVALID_PATH_SEGMENT_CHARS.test(segment)
		)
	) {
		throw new MovieFileError('ファイル名に使用できない文字が含まれています');
	}

	return segments.join('/');
};

export const assertSafeMovieFileName = (fileName: string) => normalizeRelativeMoviePath(fileName);

export const resolveMovieFilePath = (fileName: string, root = PUBLIC_MOVIE_PATH) => {
	const safeName = normalizeRelativeMoviePath(fileName);
	const movieRoot = getMovieRoot(root);
	const resolvedPath = resolve(movieRoot, safeName);

	if (resolvedPath !== movieRoot && !resolvedPath.startsWith(`${movieRoot}${sep}`)) {
		throw new MovieFileError('不正なファイルパスです');
	}

	return resolvedPath;
};

const listMovieFilesRecursive = async (currentDir: string, relativeDir = ''): Promise<string[]> => {
	const entries = await readdir(currentDir, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
		const absolutePath = resolve(currentDir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await listMovieFilesRecursive(absolutePath, relativePath)));
			continue;
		}

		if (entry.isFile() && isMovieFileName(entry.name)) {
			files.push(relativePath);
		}
	}

	return files;
};

export const listMovieFiles = async (root = PUBLIC_MOVIE_PATH) => {
	const files = await listMovieFilesRecursive(getMovieRoot(root));
	return files.sort((a, b) => a.localeCompare(b));
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
