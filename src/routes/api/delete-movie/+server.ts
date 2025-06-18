import { unlink } from 'fs/promises';
import { resolve } from 'path';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';

export async function POST({ request }) {
  try {
    const { fileName } = await request.json();
    
    // 入力検証
    if (!fileName) {
      return new Response(JSON.stringify({ error: 'ファイル名が必要です' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // パスを解決
    const filePath = resolve(PUBLIC_MOVIE_PATH, fileName);
    
    // ファイルを削除
    await unlink(filePath);
    
    return new Response(JSON.stringify({ success: true, fileName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return new Response(JSON.stringify({ error: 'ファイルの削除に失敗しました', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}