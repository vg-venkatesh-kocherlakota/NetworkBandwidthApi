using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

[ApiController]
[Route("network")]
public class NetworkBandwidthController : ControllerBase
{
    private const int HUNDRED_MILLISECONDS = 100;
    private const int TEN_MILLISECONDS = 10;
    private readonly string _downloadFilePath;
    private readonly long _downloadFileSize;
    private readonly int _delayInMilliseconds;
    public NetworkBandwidthController()
    {
        _downloadFilePath = Path.Combine(Environment.CurrentDirectory, "Data", "File-25MB.val");
        _downloadFileSize = new FileInfo(_downloadFilePath).Length;
        // _delayInMilliseconds = HUNDRED_MILLISECONDS;
        _delayInMilliseconds = TEN_MILLISECONDS;
    }

    [HttpHead("download")]
    public IActionResult DownloadChunkedHead()
    {
        Response.Headers.Append("Content-Length", _downloadFileSize.ToString());
        return new EmptyResult();
    }

    [HttpGet("download")]
    public async Task<IActionResult> DownloadChunkedFileAsync()
    {
        var downloadFileStream = new FileStream(_downloadFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        Response.Headers.Append("Accept-Ranges", "bytes");
        var rangeHeader = Request.Headers["Range"].ToString();
        if (string.IsNullOrEmpty(rangeHeader))
        {
            return File(downloadFileStream, "application/octet-stream", enableRangeProcessing: true);
        }

        var range = rangeHeader.Replace("bytes=", "").Split('-');
        var start = int.Parse(range[0]);
        var end = range.Length > 1 && !string.IsNullOrEmpty(range[1]) ? int.Parse(range[1]) : _downloadFileSize - 1;
        
        var contentLength = end - start + 1;
        Response.StatusCode = 206;
        Response.Headers.Append("Content-Range", $"bytes {start}-{end}/{_downloadFileSize}");

        downloadFileStream.Seek(start, SeekOrigin.Begin);

        var buffer = new byte[contentLength]; // Expecting 10 KB buffer size in ideal scenario
        var bytesRead = 0;
        await downloadFileStream.ReadAsync(buffer, 0, buffer.Length);
        await Response.Body.WriteAsync(buffer, 0, bytesRead);
        await Task.Delay(_delayInMilliseconds);
        return new EmptyResult();
    }
}