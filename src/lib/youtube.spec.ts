import { describe, expect, it } from 'vitest';
import { extractYouTubeVideoId } from './youtube';

describe('extractYouTubeVideoId', () => {
	it('extracts a video id from a watch url', () => {
		expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
			'dQw4w9WgXcQ'
		);
	});

	it('extracts a video id from a short url', () => {
		expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
	});

	it('accepts a plain video id', () => {
		expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('returns null for unsupported urls', () => {
		expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
	});
});
