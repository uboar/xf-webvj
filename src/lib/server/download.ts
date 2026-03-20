import { spawn, spawnSync } from 'child_process';

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

export type DownloadProgressEvent =
	| { type: 'progress'; url: string; index: number; message: string }
	| { type: 'complete'; url: string; index: number; fileName: string }
	| { type: 'error'; url: string; index: number; message: string }
	| { type: 'done'; total: number; success: number; failed: number };

export function runYtDlpAsync(
	moviePath: string,
	args: string,
	url: string,
	onProgress: (line: string) => void
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const proc = spawn('yt-dlp', ['--path', moviePath, '--newline', ...tokenizeCommandArgs(args), url], {
			encoding: 'utf8'
		} as any);

		let stdout = '';
		let stderr = '';

		proc.stdout?.on('data', (data: Buffer) => {
			const text = data.toString();
			stdout += text;
			for (const line of text.split('\n')) {
				const trimmed = line.trim();
				if (trimmed) {
					onProgress(trimmed);
				}
			}
		});

		proc.stderr?.on('data', (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			for (const line of text.split('\n')) {
				const trimmed = line.trim();
				if (trimmed) {
					onProgress(trimmed);
				}
			}
		});

		proc.on('close', (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				reject(new Error(stderr || stdout || `yt-dlp exited with code ${code}`));
			}
		});

		proc.on('error', (err) => {
			reject(err);
		});
	});
}
