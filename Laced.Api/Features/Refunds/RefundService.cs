using Laced.Api.Common.Results;
using Laced.Api.Data;
using Laced.Api.Features.Refunds.DTOs;
using Laced.Api.Models;
using Microsoft.EntityFrameworkCore;
using RefundEntity = Laced.Api.Models.RefundRequest;

namespace Laced.Api.Features.Refunds;

public class RefundService(ApplicationDbContext dbContext) : IRefundService
{
    public async Task<Result<RefundResponse>> CreateAsync(Guid userId, CreateRefundRequest request)
    {
        var order = await dbContext.Orders.FirstOrDefaultAsync(item => item.Id == request.OrderId && item.UserId == userId);
        if (order is null)
        {
            return Result<RefundResponse>.Failure("Order not found.");
        }

        var isEligibleEsewaOrder = order.PaymentMethod == PaymentMethod.Esewa && order.OrderStatus == OrderStatus.Cancelled;
        var isEligibleCodOrder = order.PaymentMethod == PaymentMethod.COD && order.OrderStatus == OrderStatus.Delivered;
        if (order.PaymentStatus != PaymentStatus.Paid || (!isEligibleEsewaOrder && !isEligibleCodOrder))
        {
            return Result<RefundResponse>.Failure("Only paid, cancelled eSewa or paid, delivered COD orders can be refunded.");
        }

        var existingRequest = await dbContext.RefundRequests
            .AnyAsync(item => item.OrderId == request.OrderId && item.Status != RefundStatus.Rejected);
        if (existingRequest)
        {
            return Result<RefundResponse>.Failure("An active refund request already exists for this order.");
        }

        var refund = new RefundEntity
        {
            OrderId = order.Id,
            UserId = userId,
            PaymentInfo = request.PaymentInfo.Trim(),
            Reason = request.Reason.Trim(),
            Status = RefundStatus.Requested,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.RefundRequests.Add(refund);
        await dbContext.SaveChangesAsync();
        await dbContext.Entry(refund).Reference(item => item.Order).LoadAsync();
        await dbContext.Entry(refund).Reference(item => item.User).LoadAsync();
        return Result<RefundResponse>.Success(ToResponse(refund));
    }

    public async Task<Result<IReadOnlyList<RefundResponse>>> GetMineAsync(Guid userId)
    {
        var refunds = await RefundsWithDetails()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();
        return Result<IReadOnlyList<RefundResponse>>.Success(refunds.Select(ToResponse).ToList());
    }

    public async Task<Result<IReadOnlyList<RefundResponse>>> GetAllAsync()
    {
        var refunds = await RefundsWithDetails()
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();
        return Result<IReadOnlyList<RefundResponse>>.Success(refunds.Select(ToResponse).ToList());
    }

    public async Task<Result<RefundResponse>> GetByIdAsync(Guid refundId)
    {
        var refund = await RefundsWithDetails().FirstOrDefaultAsync(item => item.Id == refundId);
        return refund is null
            ? Result<RefundResponse>.Failure("Refund request not found.")
            : Result<RefundResponse>.Success(ToResponse(refund));
    }

    public async Task<Result<RefundResponse>> UpdateStatusAsync(Guid refundId, UpdateRefundStatusRequest request)
    {
        if (!Enum.TryParse<RefundStatus>(request.Status, true, out var status))
        {
            return Result<RefundResponse>.Failure("Invalid refund status.");
        }

        var refund = await RefundsWithDetails().FirstOrDefaultAsync(item => item.Id == refundId);
        if (refund is null)
        {
            return Result<RefundResponse>.Failure("Refund request not found.");
        }

        refund.Status = status;
        if (request.AdminNote is not null)
        {
            refund.AdminNote = request.AdminNote.Trim();
        }
        refund.ProcessedAt = status == RefundStatus.Paid ? DateTime.UtcNow : null;
        refund.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        return Result<RefundResponse>.Success(ToResponse(refund));
    }

    private IQueryable<RefundEntity> RefundsWithDetails() => dbContext.RefundRequests
        .Include(item => item.Order)
        .Include(item => item.User);

    private static RefundResponse ToResponse(RefundEntity refund) => new(
        refund.Id,
        refund.OrderId,
        refund.UserId,
        refund.User?.Name,
        refund.User?.Email,
        refund.Order?.TotalAmount ?? 0,
        refund.PaymentInfo,
        refund.Reason,
        refund.Status,
        refund.AdminNote,
        refund.CreatedAt,
        refund.UpdatedAt,
        refund.ProcessedAt);
}
