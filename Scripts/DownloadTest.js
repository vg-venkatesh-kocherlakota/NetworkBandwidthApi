import axios from 'axios';
import { createWriteStream } from 'fs';

const url = 'http://localhost:5000/network/download'; // Replace with your server URL
const outputFilePath = 'test-output.log';
const CHUNK_SIZE_10KB = 10 * 1024; // 10KB

async function downloadFile() {
  const { headers } = await axios.head(url);
  const fileSize = parseInt(headers['content-length'], 10);
  console.log('🐞 ~ file: index.js:13 ~ downloadFile ~ fileSize:', fileSize)
  let downloadedSize = 0;

  const writeStream = createWriteStream(outputFilePath);

  try {
    while (downloadedSize < fileSize) {
      const start = downloadedSize;
      const end = Math.min(start + CHUNK_SIZE_10KB - 1, fileSize - 1);
      console.log('🐞 ~ file: index.js:22 ~ downloadFile ~ `bytes=${start}-${end}`', `bytes=${start}-${end}`)
      const { data } = await axios.get(url, {
        headers: {
          Range: `bytes=${start}-${end}`,
        },
        responseType: 'stream',
      });
      data.pipe(writeStream, { end: false });


      await new Promise((resolve) => {
        console.log('🐞 ~ file: index.js:36 ~ downloadFile ~ downloadedSize:', downloadedSize)
        data.on('end', resolve);
      });

      downloadedSize += CHUNK_SIZE_10KB;
    }
  } catch (e) {
    console.error('while loop error', e)
  }

  writeStream.end();
  console.log('Download complete');
}

try {
  await downloadFile()
} catch (e) {
  console.error('error', e)
}