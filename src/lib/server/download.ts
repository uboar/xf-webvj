import { spawnSync } from 'child_process';

export const tokenizeCommandArgs = (args: string) => {
	const tokens: string[] = [];
	let current = '';
	let quote: '"' | "'" | null = null;

	for (const char of args.trim()) {
		if (quote) {
			if (char === quote) {
				quote = null;
			} else {
				current += char;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (/\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = '';
			}
			continue;
		}

		current += char;
	}

	if (quote) {
		throw new Error('引数のクォートが閉じられていません');
	}

	if (current) {
		tokens.push(current);
	}

	return tokens;
};

export const runYtDlp = (moviePath: string, args: string, url: string) => {
	const result = spawnSync('yt-dlp', ['--path', moviePath, ...tokenizeCommandArgs(args), url], {
		encoding: 'utf8'
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(result.stderr || result.stdout || 'yt-dlp failed');
	}

	return result.stdout;
};
