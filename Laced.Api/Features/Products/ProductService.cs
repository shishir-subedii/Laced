using System.Text.Json;
using Laced.Api.Common.Results;
using Laced.Api.Data;
using Laced.Api.Features.Products.DTOs;
using Laced.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Laced.Api.Features.Products;

public class ProductService(
    ApplicationDbContext dbContext,
    IImageStorage imageStorage) : IProductService
{
    private const long MaxImageSize = 5 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly HashSet<string> AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

    public async Task<Result<ProductListResponse>> GetAllAsync(ProductQueryParameters parameters)
    {
        var page = Math.Max(parameters.Page, 1);
        var pageSize = Math.Clamp(parameters.PageSize, 1, 50);
        var query = dbContext.Products
            .AsNoTracking()
            .AsQueryable();

        if (!parameters.IncludeInactive)
        {
            query = query.Where(product => product.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            var searchPattern = $"%{search}%";
            query = query.Where(product =>
                EF.Functions.ILike(product.Name, searchPattern) ||
                EF.Functions.ILike(product.Description, searchPattern) ||
                EF.Functions.ILike(product.Brand, searchPattern));
        }

        if (!string.IsNullOrWhiteSpace(parameters.Brand))
        {
            query = query.Where(product => product.Brand.Contains(parameters.Brand.Trim()));
        }

        if (parameters.MinPrice.HasValue)
        {
            query = query.Where(product => product.Price >= parameters.MinPrice.Value);
        }

        if (parameters.MaxPrice.HasValue)
        {
            query = query.Where(product => product.Price <= parameters.MaxPrice.Value);
        }

        if (parameters.Size.HasValue)
        {
            query = query.Where(product => product.Sizes.Any(size => size.Size == parameters.Size.Value));
        }

        var totalItems = await query.CountAsync();
        var products = await query
            .Include(product => product.Sizes)
            .Include(product => product.Images)
            .OrderByDescending(product => product.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);
        var response = new ProductListResponse(
            products.Select(ToResponse).ToList(),
            page,
            pageSize,
            totalItems,
            totalPages);

        return Result<ProductListResponse>.Success(response);
    }

    public async Task<Result<ProductResponse>> GetByIdAsync(Guid id, bool includeInactive = false)
    {
        var query = dbContext.Products
            .AsNoTracking()
            .Include(item => item.Sizes)
            .Include(item => item.Images)
            .AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(item => item.IsActive);
        }

        var product = await query.FirstOrDefaultAsync(item => item.Id == id);

        return product is null
            ? Result<ProductResponse>.Failure("Product not found.")
            : Result<ProductResponse>.Success(ToResponse(product));
    }

    public async Task<Result<ProductResponse>> CreateAsync(ProductRequest request)
    {
        var sizeResult = ParseSizes(request.Sizes);
        if (!sizeResult.IsSuccess)
        {
            return Result<ProductResponse>.Failure(sizeResult.Error!);
        }

        var imageResult = ValidateImages(request.Images);
        if (!imageResult.IsSuccess)
        {
            return Result<ProductResponse>.Failure(imageResult.Error!);
        }

        var now = DateTime.UtcNow;
        var product = new Product
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Brand = request.Brand.Trim(),
            Price = request.Price,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now,
            Sizes = sizeResult.Value!.Select(size => new ProductSize
            {
                Size = size.Size,
                Quantity = size.Quantity
            }).ToList()
        };

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync();
        var addedImages = await AddImagesAsync(product, request.Images);
        SetHeroImage(product, request.HeroImageFileName, null, request.HeroImageIndex, addedImages);
        await dbContext.SaveChangesAsync();

        return Result<ProductResponse>.Success(ToResponse(product));
    }

    public async Task<Result<ProductResponse>> UpdateAsync(Guid id, ProductUpdateRequest request)
    {
        var product = await dbContext.Products
            .Include(item => item.Sizes)
            .Include(item => item.Images)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (product is null)
        {
            return Result<ProductResponse>.Failure("Product not found.");
        }

        List<SizeInput>? incomingSizes = null;
        if (!string.IsNullOrWhiteSpace(request.Sizes))
        {
            var sizeResult = ParseSizes(request.Sizes);
            if (!sizeResult.IsSuccess)
            {
                return Result<ProductResponse>.Failure(sizeResult.Error!);
            }

            incomingSizes = sizeResult.Value!;
        }

        var imageResult = ValidateImages(request.Images);
        if (!imageResult.IsSuccess)
        {
            return Result<ProductResponse>.Failure(imageResult.Error!);
        }

        if (request.Name is not null)
        {
            product.Name = request.Name.Trim();
        }

        if (request.Description is not null)
        {
            product.Description = request.Description.Trim();
        }

        if (request.Brand is not null)
        {
            product.Brand = request.Brand.Trim();
        }

        if (request.Price.HasValue)
        {
            product.Price = request.Price.Value;
        }

        if (request.IsActive.HasValue)
        {
            product.IsActive = request.IsActive.Value;
        }

        product.UpdatedAt = DateTime.UtcNow;

        if (incomingSizes is not null)
        {
            foreach (var existingSize in product.Sizes.ToList())
            {
                var incomingSize = incomingSizes.FirstOrDefault(size => size.Size == existingSize.Size);
                if (incomingSize is null)
                {
                    dbContext.ProductSizes.Remove(existingSize);
                }
                else
                {
                    existingSize.Quantity = incomingSize.Quantity;
                }
            }

            foreach (var incomingSize in incomingSizes.Where(size => product.Sizes.All(existing => existing.Size != size.Size)))
            {
                product.Sizes.Add(new ProductSize { Size = incomingSize.Size, Quantity = incomingSize.Quantity });
            }
        }

        await RemoveImagesAsync(product, request.RemoveImageIds);
        var addedImages = await AddImagesAsync(product, request.Images);
        SetHeroImage(product, request.HeroImageFileName, request.HeroImageId, request.HeroImageIndex, addedImages);
        await dbContext.SaveChangesAsync();

        return Result<ProductResponse>.Success(ToResponse(product));
    }

    public async Task<Result> DeleteAsync(Guid id)
    {
        var product = await dbContext.Products
            .Include(item => item.Images)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (product is null)
        {
            return Result.Failure("Product not found.");
        }

        foreach (var image in product.Images)
        {
            await imageStorage.DeleteAsync(image.FileName);
        }

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync();
        return Result.Success();
    }

    private async Task<List<ProductImage>> AddImagesAsync(Product product, IEnumerable<IFormFile> files)
    {
        var addedImages = new List<ProductImage>();

        foreach (var file in files)
        {
            var storedImage = await imageStorage.UploadAsync(file);

            var image = new ProductImage
            {
                ProductId = product.Id,
                FileName = storedImage.PublicId,
                FilePath = storedImage.SecureUrl
            };
            product.Images.Add(image);
            addedImages.Add(image);
        }

        return addedImages;
    }

    private async Task RemoveImagesAsync(Product product, string? imageIds)
    {
        if (string.IsNullOrWhiteSpace(imageIds))
        {
            return;
        }

        foreach (var idText in imageIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!Guid.TryParse(idText, out var imageId))
            {
                continue;
            }

            var image = product.Images.FirstOrDefault(item => item.Id == imageId);
            if (image is null)
            {
                continue;
            }

            await imageStorage.DeleteAsync(image.FileName);
            dbContext.ProductImages.Remove(image);
            product.Images.Remove(image);
        }
    }

    private void SetHeroImage(
        Product product,
        string? heroFileName,
        string? heroImageId,
        int? heroImageIndex,
        IReadOnlyList<ProductImage> addedImages)
    {
        var selectedImage = Guid.TryParse(heroImageId, out var parsedId)
            ? product.Images.FirstOrDefault(image => image.Id == parsedId)
            : null;

        selectedImage ??= !string.IsNullOrWhiteSpace(heroFileName)
            ? product.Images.LastOrDefault(image => image.FileName.Equals(heroFileName, StringComparison.OrdinalIgnoreCase))
            : null;

        selectedImage ??= heroImageIndex.HasValue && heroImageIndex.Value >= 0 && heroImageIndex.Value < addedImages.Count
            ? addedImages[heroImageIndex.Value]
            : null;

        selectedImage ??= product.Images.FirstOrDefault(image => image.IsHero) ?? product.Images.FirstOrDefault();
        foreach (var image in product.Images)
        {
            image.IsHero = image == selectedImage;
        }
    }

    private Result<List<SizeInput>> ParseSizes(string sizesJson)
    {
        try
        {
            var sizes = JsonSerializer.Deserialize<List<SizeInput>>(sizesJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? [];

            if (sizes.Any(size => size.Size <= 0 || size.Quantity < 0))
            {
                return Result<List<SizeInput>>.Failure("Sizes must be positive and quantities cannot be negative.");
            }

            if (sizes.GroupBy(size => size.Size).Any(group => group.Count() > 1))
            {
                return Result<List<SizeInput>>.Failure("A product size cannot be duplicated.");
            }

            return Result<List<SizeInput>>.Success(sizes);
        }
        catch (JsonException)
        {
            return Result<List<SizeInput>>.Failure("Sizes must be valid JSON, for example [{\"size\":42,\"quantity\":5}].");
        }
    }

    private static Result ValidateImages(IEnumerable<IFormFile> files)
    {
        foreach (var file in files)
        {
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension) || !AllowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            {
                return Result.Failure("Only jpg, jpeg, png, and webp images are supported.");
            }

            if (file.Length <= 0 || file.Length > MaxImageSize)
            {
                return Result.Failure("Each image must be smaller than 5 MB.");
            }
        }

        return Result.Success();
    }

    private static ProductResponse ToResponse(Product product) => new(
        product.Id,
        product.Name,
        product.Description,
        product.Brand,
        product.Price,
        product.IsActive,
        product.CreatedAt,
        product.UpdatedAt,
        product.Sizes.OrderBy(size => size.Size).Select(size => new ProductSizeResponse(size.Id, size.Size, size.Quantity)).ToList(),
        product.Images.Select(image => new ProductImageResponse(image.Id, image.FileName, image.FilePath, image.IsHero)).ToList());

    private sealed record SizeInput(decimal Size, int Quantity);
}
