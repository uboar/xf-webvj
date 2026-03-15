import { describe, expect, it } from 'vitest';
import { MovieFileError, assertSafeMovieFileName, resolveMovieFilePath } from './movie-files';

describe('movie-files', () => {
	it('安全なファイル名を許可する', () => {
		expect(assertSafeMovieFileName('sample.mp4')).toBe('sample.mp4');
	});

	it('ディレクトリトラバーサルを拒否する', () => {
		expect(() => resolveMovieFilePath('../secret.mp4', '/tmp/movies')).toThrow(MovieFileError);
	});

	it('不正文字を含むファイル名を拒否する', () => {
		expect(() => assertSafeMovieFileName('bad/name.mp4')).toThrow(
			'ファイル名に使用できない文字が含まれています'
		);
	});
});
