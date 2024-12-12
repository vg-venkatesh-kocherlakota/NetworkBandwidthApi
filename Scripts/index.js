import axios from 'axios';
import { createWriteStream, unlinkSync } from 'fs';

const apiURL = 'http://localhost:5000/network/download'; // Replace with your server URL
const tempOutputFilePath = 'test-output.log';
const CHUNK_SIZE_BYTES = 10 * 1024; // 10KB
const ONE_SECOND = 1000;

/*
function: measureDownloadSpeed()
Check how many chunks got downloaded in 1 sec and calculate the download speed
If we didn't fully receive a single chunk in a second, network speed is less than 80Kbps
*/
async function measureDownloadSpeed() {
  const { headers } = await axios.head(apiURL);
  const totalServerFileSize = parseInt(headers['content-length'], 10);
  console.log('🐞 ~ file: index.js:13 ~ downloadFile ~ fileSize:', totalServerFileSize)
  let sizeDownloadedTillNow = 0;
  let numberOfDownloadedChunks = 0;
  // TODO: To create a unique file when making multiple calls to avoid concurrency issues.
  const tempFileWriteStream = createWriteStream(tempOutputFilePath);

  try {
    const startTimestamp = Date.now();
    let timeElapsedInMilliseconds = 0;
    while (sizeDownloadedTillNow < totalServerFileSize) {
      timeElapsedInMilliseconds = Date.now() - startTimestamp;
      if (timeElapsedInMilliseconds >= ONE_SECOND) {
        console.log('🐞 ~ file: index.js:67 ~ measureDownloadSpeed ~ timeElapsedInMilliseconds:', timeElapsedInMilliseconds)
        break;
      }
      const start = sizeDownloadedTillNow;
      const end = Math.min(start + CHUNK_SIZE_BYTES - 1, totalServerFileSize - 1);
      const { data } = await axios.get(apiURL, {
        headers: {
          Range: `bytes=${start}-${end}`,
        },
        responseType: 'stream',
      });
      data.pipe(tempFileWriteStream, { end: false });
      await new Promise((resolve) => {
        data.on('end', resolve);
      });
      sizeDownloadedTillNow += CHUNK_SIZE_BYTES;
      numberOfDownloadedChunks++;
    }
  } catch (e) {
    console.error('Error while downloading chunks:', e)
  }

  tempFileWriteStream.end();
  unlinkSync(tempOutputFilePath);
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
  const iterationONE = await measureDownloadSpeed()
  const iterationTWO = await measureDownloadSpeed()
  const iterationTHREE = await measureDownloadSpeed()

  const calculationONE = calculateDownloadSpeed(iterationONE)
  const calculationTWO = calculateDownloadSpeed(iterationTWO)
  const calculationTHREE = calculateDownloadSpeed(iterationTHREE)

  const avgDownloadSpeedKbps = (calculationONE.speedKbps + calculationTWO.speedKbps + calculationTHREE.speedKbps) / 3;
  const avgDownloadSpeedMbps = (calculationONE.speedMbps + calculationTWO.speedMbps + calculationTHREE.speedMbps) / 3;

  console.log('Average Download Speed: ', avgDownloadSpeedKbps, 'Kbps', avgDownloadSpeedMbps, 'Mbps');
  console.log();
  console.log("Includes latency in the network.");
} catch (e) {
  console.error('error', e)
}