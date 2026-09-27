using Laced.Api.Common.Results;
using Laced.Api.Data;
using Laced.Api.Features.Orders.DTOs;
using Laced.Api.Models;
using Microsoft.EntityFrameworkCore;
using OrderEntity = Laced.Api.Models.Order;
using OrderItemEntity = Laced.Api.Models.OrderItem;

namespace Laced.Api.Features.Orders;

public class OrderService(ApplicationDbContext dbContext) : IOrderService
{
    public async Task<Result<OrderResponse>> PlaceAsync(Guid userId, PlaceOrderRequest request)
    {
        if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var paymentMethod))
        {
            return Result<OrderResponse>.Failure("Payment method must be COD or Esewa.");
        }

        var cart = await dbContext.Carts
            .Include(item => item.Items)
                .ThenInclude(item => item.Product)
            .Include(item => item.Items)
                .ThenInclude(item => item.ProductSize)
            .FirstOrDefaultAsync(item => item.UserId == userId);

        if (cart is null || cart.Items.Count == 0)
        {
            return Result<OrderResponse>.Failure("Your cart is empty.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        try
        {
            var orderItems = new List<OrderItemEntity>();
            foreach (var cartItem in cart.Items)
            {
                if (!cartItem.Product.IsActive)
                {
                    return Result<OrderResponse>.Failure($"Product '{cartItem.Product.Name}' is no longer available.");
                }

                if (cartItem.ProductSize.ProductId != cartItem.ProductId)
                {
                    return Result<OrderResponse>.Failure("A cart item has an invalid product size.");
                }

                if (cartItem.Quantity <= 0 || cartItem.Quantity > cartItem.ProductSize.Quantity)
                {
                    return Result<OrderResponse>.Failure($"Insufficient inventory for '{cartItem.Product.Name}' size {cartItem.ProductSize.Size}.");
                }

                var lineTotal = cartItem.Product.Price * cartItem.Quantity;
                orderItems.Add(new OrderItemEntity
                {
                    ProductId = cartItem.ProductId,
                    ProductSizeId = cartItem.ProductSizeId,
                    ProductName = cartItem.Product.Name,
                    Size = cartItem.ProductSize.Size,
                    UnitPrice = cartItem.Product.Price,
                    Quantity = cartItem.Quantity,
                    LineTotal = lineTotal
                });
            }

            var order = new OrderEntity
            {
                UserId = userId,
                TotalAmount = orderItems.Sum(item => item.LineTotal),
                ShippingName = request.ShippingName.Trim(),
                ShippingPhone = request.ShippingPhone.Trim(),
                ShippingAddress = request.ShippingAddress.Trim(),
                ShippingCity = request.ShippingCity.Trim(),
                ShippingPostalCode = request.ShippingPostalCode?.Trim(),
                PaymentMethod = paymentMethod,
                PaymentStatus = PaymentStatus.Pending,
                OrderStatus = paymentMethod == PaymentMethod.COD ? OrderStatus.Confirmed : OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Items = orderItems
            };

            foreach (var cartItem in cart.Items)
            {
                cartItem.ProductSize.Quantity -= cartItem.Quantity;
            }

            dbContext.Orders.Add(order);
            dbContext.CartItems.RemoveRange(cart.Items);
            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            await dbContext.Entry(order).Reference(item => item.User).LoadAsync();
            return Result<OrderResponse>.Success(ToResponse(order));
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<Result<OrderListResponse>> GetMineAsync(Guid userId, OrderQueryParameters parameters)
    {
        var result = await GetListAsync(parameters, query => query.Where(order => order.UserId == userId));
        return result;
    }

    public async Task<Result<OrderResponse>> GetMineByIdAsync(Guid userId, Guid orderId)
    {
        var order = await OrdersWithDetails()
            .FirstOrDefaultAsync(item => item.Id == orderId && item.UserId == userId);

        return order is null
            ? Result<OrderResponse>.Failure("Order not found.")
            : Result<OrderResponse>.Success(ToResponse(order));
    }

    public Task<Result> CancelMineAsync(Guid userId, Guid orderId) => CancelAsync(orderId, userId);

    public Task<Result<OrderListResponse>> GetAdminAsync(OrderQueryParameters parameters) =>
        GetListAsync(parameters, query => query);

    public async Task<Result<OrderResponse>> GetAdminByIdAsync(Guid orderId)
    {
        var order = await OrdersWithDetails().FirstOrDefaultAsync(item => item.Id == orderId);
        return order is null
            ? Result<OrderResponse>.Failure("Order not found.")
            : Result<OrderResponse>.Success(ToResponse(order));
    }

    public async Task<Result<OrderResponse>> UpdateStatusAsync(Guid orderId, OrderStatusRequest request)
    {
        if (!Enum.TryParse<OrderStatus>(request.Status, true, out var requestedStatus))
        {
            return Result<OrderResponse>.Failure("Invalid order status.");
        }

        var order = await OrdersWithDetails().FirstOrDefaultAsync(item => item.Id == orderId);
        if (order is null)
        {
            return Result<OrderResponse>.Failure("Order not found.");
        }

        if (requestedStatus == OrderStatus.Cancelled)
        {
            return Result<OrderResponse>.Failure("Use the cancel endpoint to cancel an order.");
        }

        if (!IsValidStatusTransition(order.OrderStatus, requestedStatus))
        {
            return Result<OrderResponse>.Failure("That order status transition is not allowed.");
        }

        order.OrderStatus = requestedStatus;
        if (order.PaymentMethod == PaymentMethod.COD && requestedStatus == OrderStatus.Delivered)
        {
            order.PaymentStatus = PaymentStatus.Paid;
        }

        order.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        return Result<OrderResponse>.Success(ToResponse(order));
    }

    public Task<Result> CancelAdminAsync(Guid orderId) => CancelAsync(orderId, null);

    private async Task<Result> CancelAsync(Guid orderId, Guid? userId)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        try
        {
            var query = OrdersWithDetails();
            if (userId.HasValue)
            {
                query = query.Where(order => order.UserId == userId.Value);
            }

            var order = await query.FirstOrDefaultAsync(item => item.Id == orderId);
            if (order is null)
            {
                return Result.Failure("Order not found.");
            }

            if (order.OrderStatus == OrderStatus.Cancelled)
            {
                return Result.Failure("Order is already cancelled.");
            }

            if (order.OrderStatus is OrderStatus.Shipped or OrderStatus.Delivered)
            {
                return Result.Failure("This order can no longer be cancelled.");
            }

            foreach (var item in order.Items)
            {
                if (item.ProductSize is null)
                {
                    return Result.Failure("A purchased product size no longer exists.");
                }

                item.ProductSize.Quantity += item.Quantity;
            }

            order.OrderStatus = OrderStatus.Cancelled;
            order.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            return Result.Success();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<Result<OrderListResponse>> GetListAsync(
        OrderQueryParameters parameters,
        Func<IQueryable<OrderEntity>, IQueryable<OrderEntity>> filter)
    {
        var page = Math.Max(parameters.Page, 1);
        var pageSize = Math.Clamp(parameters.PageSize, 1, 50);
        var query = filter(OrdersWithDetails());

        if (!string.IsNullOrWhiteSpace(parameters.Status))
        {
            if (!Enum.TryParse<OrderStatus>(parameters.Status, true, out var status))
            {
                return Result<OrderListResponse>.Failure("Invalid order status filter.");
            }

            query = query.Where(order => order.OrderStatus == status);
        }

        if (!string.IsNullOrWhiteSpace(parameters.PaymentStatus))
        {
            if (!Enum.TryParse<PaymentStatus>(parameters.PaymentStatus, true, out var paymentStatus))
            {
                return Result<OrderListResponse>.Failure("Invalid payment status filter.");
            }

            query = query.Where(order => order.PaymentStatus == paymentStatus);
        }

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(order => order.User.Email != null && order.User.Email.Contains(search));
        }

        var totalItems = await query.CountAsync();
        var orders = await query
            .OrderByDescending(order => order.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        var response = new OrderListResponse(
            orders.Select(ToResponse).ToList(),
            page,
            pageSize,
            totalItems,
            (int)Math.Ceiling(totalItems / (double)pageSize));

        return Result<OrderListResponse>.Success(response);
    }

    private IQueryable<OrderEntity> OrdersWithDetails() => dbContext.Orders
        .Include(order => order.User)
        .Include(order => order.Items)
            .ThenInclude(item => item.ProductSize)
        .Include(order => order.Items)
            .ThenInclude(item => item.Product)
                .ThenInclude(product => product.Images);

    private static bool IsValidStatusTransition(OrderStatus current, OrderStatus requested) =>
        current != OrderStatus.Cancelled &&
        current != OrderStatus.Delivered &&
        requested != OrderStatus.Cancelled &&
        (int)requested >= (int)current;

    private static OrderResponse ToResponse(OrderEntity order) => new(
        order.Id,
        order.UserId,
        order.User?.Name,
        order.User?.Email,
        order.Items.Select(item => new OrderItemResponse(
            item.Id,
            item.ProductId,
            item.ProductSizeId,
            item.ProductName,
            item.Size,
            item.UnitPrice,
            item.Quantity,
            item.LineTotal,
            item.Product.Images
                .OrderByDescending(image => image.IsHero)
                .Select(image => image.FilePath)
                .FirstOrDefault())).ToList(),
        order.TotalAmount,
        order.ShippingName,
        order.ShippingPhone,
        order.ShippingAddress,
        order.ShippingCity,
        order.ShippingPostalCode,
        order.PaymentMethod,
        order.PaymentStatus,
        order.OrderStatus,
        order.CreatedAt,
        order.UpdatedAt);
}
