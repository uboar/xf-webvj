import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	MovieFileError,
	assertSafeMovieFileName,
	listMovieFiles,
	resolveMovieFilePath
} from './movie-files';

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
	);
});

describe('movie-files', () => {
	it('安全なファイル名を許可する', () => {
		expect(assertSafeMovieFileName('sample.mp4')).toBe('sample.mp4');
		expect(assertSafeMovieFileName('clips/live/sample.mp4')).toBe('clips/live/sample.mp4');
	});

	it('ディレクトリトラバーサルを拒否する', () => {
		expect(() => resolveMovieFilePath('../secret.mp4', '/tmp/movies')).toThrow(MovieFileError);
	});

	it('不正文字を含むファイル名を拒否する', () => {
		expect(() => assertSafeMovieFileName('bad:<name>.mp4')).toThrow(
			'ファイル名に使用できない文字が含まれています'
		);
	});

	it('親ディレクトリ参照を拒否する', () => {
		expect(() => assertSafeMovieFileName('clips/../secret.mp4')).toThrow(
			'ファイル名に使用できない文字が含まれています'
		);
	});

	it('映像ファイルだけを一覧に含める', async () => {
		const root = await mkdtemp(join(tmpdir(), 'movie-files-'));
		tempDirs.push(root);

		await mkdir(join(root, 'sets', 'night'), { recursive: true });

		await Promise.all([
			writeFile(join(root, 'clip.mp4'), ''),
			writeFile(join(root, 'sets', 'night', 'intro.webm'), ''),
			writeFile(join(root, 'trailer.MOV'), ''),
			writeFile(join(root, 'notes.txt'), ''),
			writeFile(join(root, 'poster.jpg'), '')
		]);

		await expect(listMovieFiles(root)).resolves.toEqual([
			'clip.mp4',
			'sets/night/intro.webm',
			'trailer.MOV'
		]);
	});
});
