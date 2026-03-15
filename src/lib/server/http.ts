export const json = (body: unknown, init?: ResponseInit) =>
	Response.json(body, {
		headers: {
			'Cache-Control': 'no-store',
			...init?.headers
		},
		...init
	});

export const errorResponse = (status: number, error: string, details?: string) =>
	json(
		{
			error,
			...(details ? { details } : {})
		},
		{ status }
	);
