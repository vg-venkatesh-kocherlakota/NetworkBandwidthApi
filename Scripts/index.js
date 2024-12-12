import axios from 'axios';
import { createWriteStream } from 'fs';

const url = 'http://localhost:5000/network/download'; // Replace with your server URL
const outputFilePath = 'test-output.log';
const CHUNK_SIZE_BYTES = 10 * 1024; // 10KB
const ONE_SECOND = 1000;

async function downloadFile() {
  const { headers } = await axios.head(url);
  const fileSize = parseInt(headers['content-length'], 10);
  console.log('🐞 ~ file: index.js:13 ~ downloadFile ~ fileSize:', fileSize)
  let downloadedSize = 0;

  const writeStream = createWriteStream(outputFilePath);

  try {
    while (downloadedSize < fileSize) {
      const start = downloadedSize;
      const end = Math.min(start + CHUNK_SIZE_BYTES - 1, fileSize - 1);
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

      downloadedSize += CHUNK_SIZE_BYTES;
    }
  } catch (e) {
    console.error('while loop error', e)
  }

  writeStream.end();
  console.log('Download complete');
}

/*
function: measureDownloadSpeed
Check how many chunks got downloaded in 1 sec and calculate the download speed
*/

async function measureDownloadSpeed() {
  const { headers } = await axios.head(url);
  const fileSize = parseInt(headers['content-length'], 10);
  console.log('🐞 ~ file: index.js:13 ~ downloadFile ~ fileSize:', fileSize)
  let downloadedSize = 0;
  let numberOfDownloadedChunks = 0;
  const writeStream = createWriteStream(outputFilePath);

  try {
    const startDate = Date.now();
    let differenceInMilliseconds = 0;
    while (downloadedSize < fileSize) {
      differenceInMilliseconds = Date.now() - startDate;
      if (differenceInMilliseconds >= ONE_SECOND) {
        console.log('🐞 ~ file: index.js:65 ~ measureDownloadSpeed ~ differenceInMilliseconds:', differenceInMilliseconds)
        break;
      }
      const start = downloadedSize;
      const end = Math.min(start + CHUNK_SIZE_BYTES - 1, fileSize - 1);
      // console.log('🐞 ~ file: index.js:22 ~ downloadFile ~ `bytes=${start}-${end}`', `bytes=${start}-${end}`)
      const { data } = await axios.get(url, {
        headers: {
          Range: `bytes=${start}-${end}`,
        },
        responseType: 'stream',
      });
      data.pipe(writeStream, { end: false });


      await new Promise((resolve) => {
        // console.log('🐞 ~ file: index.js:36 ~ downloadFile ~ downloadedSize:', downloadedSize)
        data.on('end', resolve);
      });

      downloadedSize += CHUNK_SIZE_BYTES;
      numberOfDownloadedChunks++;
    }
  } catch (e) {
    console.error('while loop error', e)
  }

  writeStream.end();
  fstat.unlinkSync(outputFilePath);
  return { chunksCount: numberOfDownloadedChunks, chunkSizeInBytes: CHUNK_SIZE_BYTES, timeInMS: ONE_SECOND };
}

function calculateDownloadSpeed(data) {
  console.log('Number of chunks downloaded:', data.chunksCount);
  console.log('Chunk size                 :', data.chunkSizeInBytes, 'B');
  console.log('Time measured              :', data.timeInMS, 'ms');
  const timeInSeconds = (data.timeInMS / 1000);
  const dataSizeInKbps = (data.chunksCount * data.chunkSizeInBytes * 8) / 1024;
  const downloadSpeedInKbps = dataSizeInKbps / timeInSeconds;
  const downloadSpeedInMbps = downloadSpeedInKbps / 1024;
  console.log('Download Speed             :', downloadSpeedInKbps, 'Kbps');
  console.log('Download Speed             :', downloadSpeedInMbps, 'Mbps');

  return { speedKbps: downloadSpeedInKbps, speedMbps: downloadSpeedInMbps };
}

try {
  // await downloadFile()
  const iterationONE = await measureDownloadSpeed()
  const iterationTWO = await measureDownloadSpeed()
  const iterationTHREE = await measureDownloadSpeed()

  const calculationONE = calculateDownloadSpeed(iterationONE)
  const calculationTWO = calculateDownloadSpeed(iterationTWO)
  const calculationTHREE = calculateDownloadSpeed(iterationTHREE)

  const avgDownloadSpeedKbps = (calculationONE.speedKbps + calculationTWO.speedKbps + calculationTHREE.speedKbps) / 3;
  const avgDownloadSpeedMbps = (calculationONE.speedMbps + calculationTWO.speedMbps + calculationTHREE.speedMbps) / 3;

  console.log('Average Download Speed: ', avgDownloadSpeedKbps, 'Kbps', avgDownloadSpeedMbps, 'Mbps');
} catch (e) {
  console.error('error', e)
}