import { PUBLIC_MOVIE_PATH } from '$env/static/public';
import {readdirSync, statSync} from 'fs';
import {join} from 'path';

export async function GET() {

  try {
    const files: string[] = [];
    const entries = readdirSync(PUBLIC_MOVIE_PATH);

    for (const entry of entries) {
      const fullPath = join(PUBLIC_MOVIE_PATH, entry);
      const stats = statSync(fullPath);

      if (stats.isFile()) {
        files.push(entry);
      }
    }

    return new Response(JSON.stringify(files), {status: 200});
  } catch (error) {
    console.error(`Error reading directory ${PUBLIC_MOVIE_PATH}:`, error);
    return [];
  }
}