import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  try {
    const jsonResponse = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      body: req.body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
          'audio/ogg', 'audio/x-m4a', 'audio/*',
          'video/mp4', 'video/webm',
        ],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('[blob-upload] error:', err.message);
    return res.status(400).json({ error: err.message });
  }
}
