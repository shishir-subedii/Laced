using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Laced.Api.Features.Products;

public sealed class CloudinaryImageStorage(IOptions<CloudinaryOptions> options) : IImageStorage
{
    private readonly CloudinaryOptions options = options.Value;

    public async Task<StoredImage> UploadAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        var cloudinary = GetCloudinary();
        await using var stream = file.OpenReadStream();
        var upload = await cloudinary.UploadAsync(new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = options.ProductFolder,
            PublicId = Guid.NewGuid().ToString("N"),
            Overwrite = false,
            UseFilename = false,
            UniqueFilename = true
        }, cancellationToken);

        if (upload.Error is not null || string.IsNullOrWhiteSpace(upload.PublicId) || upload.SecureUrl is null)
        {
            throw new InvalidOperationException(upload.Error?.Message ?? "Cloudinary did not return a valid image URL.");
        }

        return new StoredImage(upload.PublicId, upload.SecureUrl.ToString(), Path.GetFileName(file.FileName));
    }

    public async Task DeleteAsync(string publicId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return;
        }

        var result = await GetCloudinary().DestroyAsync(new DeletionParams(publicId)
        {
            ResourceType = ResourceType.Image,
            Invalidate = true
        });

        if (result.Error is not null && !string.Equals(result.Result, "not found", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(result.Error.Message);
        }
    }

    private Cloudinary GetCloudinary()
    {
        if (string.IsNullOrWhiteSpace(options.CloudName) ||
            string.IsNullOrWhiteSpace(options.ApiKey) ||
            string.IsNullOrWhiteSpace(options.ApiSecret))
        {
            throw new InvalidOperationException("Cloudinary:CloudName, Cloudinary:ApiKey, and Cloudinary:ApiSecret are required.");
        }

        return new Cloudinary(new Account(options.CloudName, options.ApiKey, options.ApiSecret));
    }
}