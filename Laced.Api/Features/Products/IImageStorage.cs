using Microsoft.AspNetCore.Http;

namespace Laced.Api.Features.Products;

public interface IImageStorage
{
    Task<StoredImage> UploadAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task DeleteAsync(string publicId, CancellationToken cancellationToken = default);
}

public sealed record StoredImage(string PublicId, string SecureUrl, string FileName);