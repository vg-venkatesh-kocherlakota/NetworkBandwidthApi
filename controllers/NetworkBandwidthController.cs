using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/network")]
public class NetworkBandwidthController : ControllerBase {
    [HttpGet("download-chunked")]
    public async Task<IActionResult> DownloadChunkedFileAsync()
    {
        
    }
}