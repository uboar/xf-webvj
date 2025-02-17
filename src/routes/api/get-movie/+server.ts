import { readFileSync, createReadStream, statSync } from "fs";
import { resolve } from 'path';
import { Readable } from "stream";
import { PUBLIC_MOVIE_PATH } from "$env/static/public";

export async function GET({ url, request }) {
  const path = url.searchParams.get('video')!
  if (path == null)
    return new Response(null, { status: 400 });

  const videoPath = resolve(PUBLIC_MOVIE_PATH, path);
  try {
    const stats = statSync(videoPath);
    const fileSize = stats.size;
    const range = request.headers.get('range');
  
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const fileStream = createReadStream(videoPath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
      };
      return new Response(Readable.toWeb(fileStream) as ReadableStream, { status: 206, headers: head });

    } else {
      const head = {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      };
      return new Response(readFileSync(videoPath), { status: 200, headers: head });
    }
  } catch(e) {
    console.error(e)
    return new Response(null, { status: 404 });
  }
}