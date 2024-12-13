import axios from 'axios';
import { createWriteStream, unlinkSync, statSync, createReadStream } from 'fs';
import FormData from 'form-data';

const DOWNLOAD_ENDPOINT = 'https://localhost:5001/network/download'; // Replace with your server URL
const UPLOAD_ENDPOINT = 'https://localhost:5001/network/upload'; // Replace with your server URL
const TEMP_FILEPATH = 'test-output.log';
const LOCAL_25MB_FILEPATH = 'File-25MB.val';// import.meta.dirname + '/File-25MB.val';
const CHUNK_SIZE_BYTES = 10 * 1024; // 10KB
const ONE_SECOND = 1000;

/*
function: measureDownloadSpeed()
Check how many chunks got downloaded in 1 sec and calculate the download speed
If we didn't fully receive a single chunk in a second, network speed is less than 80Kbps
*/
async function measureDownloadSpeed() {
  const totalServerFileSize = await getServerFileSize();
  console.log('🐞 ~ file: index.js:13 ~ downloadFile ~ fileSize:', totalServerFileSize)

  let sizeDownloadedTillNow = 0;
  let numberOfDownloadedChunks = 0;
  // TODO: To create a unique file when making multiple calls to avoid concurrency issues.
  const tempFileWriteStream = createWriteStream(TEMP_FILEPATH);

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

      const { data } = await axios.get(DOWNLOAD_ENDPOINT, {
        headers: {
          Range: `bytes=${start}-${end}`,
        },
        responseType: 'stream',
      });
      // write data to temporary file
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
  unlinkSync(TEMP_FILEPATH);
  return { chunksCount: numberOfDownloadedChunks, chunkSizeInBytes: CHUNK_SIZE_BYTES, timeInMS: ONE_SECOND };
}

/*
function: measureDownloadSpeed()
Check how many chunks got uploaded in 1 sec and calculate the upload speed
If we didn't fully receive a single chunk in a second, network speed is less than 80Kbps
*/
async function measureUploadSpeed() {
  let sizeUploadedTillNow = 0;
  let numberOfUploadedChunks = 0;
  const totalServerFileSize = statSync(LOCAL_25MB_FILEPATH, { autoClose: true }).size;

  const startTimestamp = Date.now();
  let timeElapsedInMilliseconds = 0, sizeDownloadedTillNow = 0;

  while (sizeUploadedTillNow < totalServerFileSize) {
    timeElapsedInMilliseconds = Date.now() - startTimestamp;
    if (timeElapsedInMilliseconds >= ONE_SECOND) {
      console.log('🐞 ~ file: index.js:82 ~ measureUploadSpeed ~ timeElapsedInMilliseconds:', timeElapsedInMilliseconds)
      break;
    }

    let data = new FormData();
    const start = sizeDownloadedTillNow;
    const end = Math.min(start + CHUNK_SIZE_BYTES - 1, totalServerFileSize - 1);
    data.append('File', createReadStream(LOCAL_25MB_FILEPATH, { autoClose: true, highWaterMark: CHUNK_SIZE_BYTES, start, end }));

    await axios.post(
      UPLOAD_ENDPOINT,
      data,
      {
        ...data.getHeaders()
      }
    )

    sizeDownloadedTillNow += CHUNK_SIZE_BYTES;
    numberOfUploadedChunks++;
  }

  return { chunksCount: numberOfUploadedChunks, chunkSizeInBytes: CHUNK_SIZE_BYTES, timeInMS: ONE_SECOND };
}

async function getServerFileSize() {
  // No need to make this call if file size is fixed and won't change across releases
  const { headers } = await axios.head(DOWNLOAD_ENDPOINT);
  return parseInt(headers['content-length'], 10);
}

function calculateDownloadSpeed(data) {
  console.log('Number of chunks downloaded  :', data.chunksCount);
  console.log('Chunk size                   :', data.chunkSizeInBytes, 'B');
  console.log('Time measured                :', data.timeInMS, 'ms');

  const timeInSeconds = (data.timeInMS / 1000);
  const dataSizeInKbps = (data.chunksCount * data.chunkSizeInBytes * 8) / 1024;
  const downloadSpeedInKbps = dataSizeInKbps / timeInSeconds;
  const downloadSpeedInMbps = downloadSpeedInKbps / 1024;

  console.log('Download Speed               :', downloadSpeedInKbps, 'Kbps');
  console.log('Download Speed               :', downloadSpeedInMbps, 'Mbps');
  console.log('-'.repeat(100));

  return { speedKbps: downloadSpeedInKbps, speedMbps: downloadSpeedInMbps };
}

function calculateUploadSpeed(data) {
  console.log('Number of chunks downloaded  :', data.chunksCount);
  console.log('Chunk size                   :', data.chunkSizeInBytes, 'B');
  console.log('Time measured                :', data.timeInMS, 'ms');

  const timeInSeconds = (data.timeInMS / 1000);
  const dataSizeInKbps = (data.chunksCount * data.chunkSizeInBytes * 8) / 1024;
  const downloadSpeedInKbps = dataSizeInKbps / timeInSeconds;
  const downloadSpeedInMbps = downloadSpeedInKbps / 1024;

  console.log('Download Speed               :', downloadSpeedInKbps, 'Kbps');
  console.log('Download Speed               :', downloadSpeedInMbps, 'Mbps');
  console.log('-'.repeat(100));

  return { speedKbps: downloadSpeedInKbps, speedMbps: downloadSpeedInMbps };
}

try {
  await testDownload();
  await testUpload();
} catch (e) {
  console.error('error', e)
}

async function testUpload(dontCalculate = false) {
  const uiterationONE = await measureUploadSpeed();
  const uiterationTWO = await measureUploadSpeed();
  const uiterationTHREE = await measureUploadSpeed();

  const ucalculationONE = calculateDownloadSpeed(uiterationONE);
  const ucalculationTWO = calculateDownloadSpeed(uiterationTWO);
  const ucalculationTHREE = calculateDownloadSpeed(uiterationTHREE);

  const uavgDownloadSpeedKbps = (ucalculationONE.speedKbps + ucalculationTWO.speedKbps + ucalculationTHREE.speedKbps) / 3;
  const uavgDownloadSpeedMbps = (ucalculationONE.speedMbps + ucalculationTWO.speedMbps + ucalculationTHREE.speedMbps) / 3;

  console.log('Average Upload Speed       : ', uavgDownloadSpeedKbps.toFixed(2), 'Kbps');
  console.log('Average Upload Speed       : ', uavgDownloadSpeedMbps.toFixed(2), 'Mbps');
  console.log();
  console.log("Note: Includes latency in the network.");
}

async function testDownload() {
  const diterationONE = await measureDownloadSpeed();
  const diterationTWO = await measureDownloadSpeed();
  const diterationTHREE = await measureDownloadSpeed();

  const dcalculationONE = calculateDownloadSpeed(diterationONE);
  const dcalculationTWO = calculateDownloadSpeed(diterationTWO);
  const dcalculationTHREE = calculateDownloadSpeed(diterationTHREE);

  const davgDownloadSpeedKbps = (dcalculationONE.speedKbps + dcalculationTWO.speedKbps + dcalculationTHREE.speedKbps) / 3;
  const davgDownloadSpeedMbps = (dcalculationONE.speedMbps + dcalculationTWO.speedMbps + dcalculationTHREE.speedMbps) / 3;

  console.log('Average Download Speed       : ', davgDownloadSpeedKbps.toFixed(2), 'Kbps');
  console.log('Average Download Speed       : ', davgDownloadSpeedMbps.toFixed(2), 'Mbps');
  console.log();
  console.log("Note: Includes latency in the network.");
}
