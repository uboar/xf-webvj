import type { RequestHandler } from './$types';
import type { DownloadMovieRequest } from '$lib/types';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';
import { runYtDlpAsync } from '$lib/server/download';
import { errorResponse } from '$lib/server/http';

function extractFileName(stdout: string, moviePath: string): string | null {
	const mergerSearch = `[Merger] Merging formats into "${moviePath}/`;
	const downloadSearch = `[download] Destination: ${moviePath}/`;
	const alreadySearch = `[download] ${moviePath}/`;

	for (const line of stdout.split('\n')) {
		if (line.includes(mergerSearch)) {
			return line.replace(mergerSearch, '').replace(/"$/, '');
		}
		if (line.includes(downloadSearch)) {
			return line.replace(downloadSearch, '');
		}
		if (line.includes(alreadySearch) && line.includes('has already been downloaded')) {
			return line.replace(alreadySearch, '').replace(/\s+has already been downloaded.*$/, '');
		}
	}
	return null;
}

function parseUrls(input: string): string[] {
	return input
		.split(/[\n\r]+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'));
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!request.body) {
			return errorResponse(400, 'リクエストボディが必要です');
		}

		const req = (await request.json()) as DownloadMovieRequest;
		if (!req.url?.trim()) {
			return errorResponse(400, 'URL が必要です');
		}

		const urls = parseUrls(req.url);
		if (urls.length === 0) {
			return errorResponse(400, 'URL が必要です');
		}

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const send = (data: object) => {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				};

				let success = 0;
				let failed = 0;

				for (let i = 0; i < urls.length; i++) {
					const url = urls[i];
					send({
						type: 'progress',
						url,
						index: i,
						message: `ダウンロード開始 (${i + 1}/${urls.length})`
					});

					try {
						const result = await runYtDlpAsync(
							PUBLIC_MOVIE_PATH,
							req.args ?? '',
							url,
							(line) => {
								// Filter to meaningful progress lines
								if (
									line.includes('[download]') ||
									line.includes('[Merger]') ||
									line.includes('[ExtractAudio]') ||
									line.includes('Downloading') ||
									line.includes('%')
								) {
									send({
										type: 'progress',
										url,
										index: i,
										message: line
									});
								}
							}
						);

						const fileName = extractFileName(result.stdout, PUBLIC_MOVIE_PATH);
						send({
							type: 'complete',
							url,
							index: i,
							fileName: fileName ?? '(ファイル名を取得できませんでした)'
						});
						success++;
					} catch (error) {
						const message =
							error instanceof Error ? error.message : '不明なエラー';
						send({
							type: 'error',
							url,
							index: i,
							message
						});
						failed++;
					}
				}

				send({
					type: 'done',
					total: urls.length,
					success,
					failed
				});

				controller.close();
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Error downloading movie:', error);
		return errorResponse(500, '動画のダウンロードに失敗しました');
	}
};
