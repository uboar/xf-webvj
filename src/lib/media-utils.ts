const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);

export const isImageFile = (fileName: string): boolean => {
	const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
	return IMAGE_EXTENSIONS.has(ext);
};
