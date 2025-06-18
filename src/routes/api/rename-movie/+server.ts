import { rename } from 'fs/promises';
import { resolve } from 'path';
import { PUBLIC_MOVIE_PATH } from '$env/static/public';

export async function POST({ request }) {
  try {
    const { oldName, newName } = await request.json();
    
    // 入力検証
    if (!oldName || !newName) {
      return new Response(JSON.stringify({ error: 'Old name and new name are required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // ファイル名に不正な文字が含まれていないか確認
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newName)) {
      return new Response(JSON.stringify({ error: 'New name contains invalid characters' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // パスを解決
    const oldPath = resolve(PUBLIC_MOVIE_PATH, oldName);
    const newPath = resolve(PUBLIC_MOVIE_PATH, newName);
    
    // ファイル名を変更
    await rename(oldPath, newPath);
    
    return new Response(JSON.stringify({ success: true, oldName, newName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error renaming file:', error);
    return new Response(JSON.stringify({ error: 'Failed to rename file', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}