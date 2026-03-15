import { describe, expect, it } from 'vitest';
import { tokenizeCommandArgs } from './download';

describe('tokenizeCommandArgs', () => {
	it('空白区切りの引数を分割する', () => {
		expect(tokenizeCommandArgs('-f bestvideo[height=720] --foo bar')).toEqual([
			'-f',
			'bestvideo[height=720]',
			'--foo',
			'bar'
		]);
	});

	it('クォートを保持せずに分割する', () => {
		expect(tokenizeCommandArgs('--output \"%(title)s.%(ext)s\"')).toEqual([
			'--output',
			'%(title)s.%(ext)s'
		]);
	});

	it('閉じていないクォートを拒否する', () => {
		expect(() => tokenizeCommandArgs('--output "broken')).toThrow(
			'引数のクォートが閉じられていません'
		);
	});
});
