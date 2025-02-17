import { execSync } from "child_process"
import { cwd } from "process";
import type { DownloadMovieRequest } from "$lib/types";
import { PUBLIC_MOVIE_PATH } from "$env/static/public"

export async function POST({ url, request }) {
  const searchString = `[Merger] Merging formats into "${PUBLIC_MOVIE_PATH}/`

  try {
    if (request.body == null)
      return new Response("error", { status: 400 });
    const req = await request.json() as unknown as DownloadMovieRequest
    const cmd = `yt-dlp --path ${PUBLIC_MOVIE_PATH} ${req.args} ${req.url}`
    const outputBuffer = execSync(cmd)
    const output = outputBuffer.toString().split("\n")
    for (const line of output) {
      if (line.includes(searchString)) {
        const outputFileName = line.replace(searchString, "").replace(/.$/, "")
        return new Response(`${outputFileName}`, { status: 200 });
      }
    }
    throw Error;
  } catch (e) {
    return new Response("error", { status: 500 });
  }
}