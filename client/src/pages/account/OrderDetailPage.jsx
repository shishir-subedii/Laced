import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from '../../components/order/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../services/api';
import { buildImageUrl } from '../../utils/image';

function submitEsewaForm(paymentData) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentData.paymentUrl;

  Object.entries(paymentData.fields || {}).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value ?? '');
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [refunds, setRefunds] = useState([]);
  const [refundReason, setRefundReason] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const result = await apiRequest(`/api/orders/${id}`);
      setOrder(result);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load this order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  useEffect(() => {
    apiRequest('/api/refunds/my')
      .then(setRefunds)
      .catch(() => setRefunds([]));
  }, [id]);

  const orderStatus = Number(order?.orderStatus ?? 0);
  const paymentStatus = Number(order?.paymentStatus ?? 0);
  const paymentMethod = Number(order?.paymentMethod ?? 0);
  const canCancel = ![3, 4, 5].includes(orderStatus);
  const canPayAgain = paymentMethod === 1 && orderStatus !== 5 && paymentStatus !== 1 && paymentStatus !== 3;
  const canCheckPayment = paymentMethod === 1 && paymentStatus === 0 && orderStatus !== 5;
  const existingRefund = refunds.find((refund) => refund.orderId === id && Number(refund.status) !== 2);
  const canRequestRefund = paymentStatus === 1
    && ((paymentMethod === 1 && orderStatus === 5) || (paymentMethod === 0 && orderStatus === 4))
    && !existingRefund;

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) {
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest(`/api/orders/${id}/cancel`, { method: 'POST' });
      showToast('Order cancelled successfully.', 'success');
      await loadOrder();
    } catch (err) {
      showToast(err.message || 'Unable to cancel this order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);

    try {
      await apiRequest(`/api/payments/esewa/status/${id}`, { method: 'POST' });
      await loadOrder();
      showToast('Payment status refreshed.', 'success');
    } catch (err) {
      showToast(err.message || 'Unable to refresh payment status.', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePayAgain = async () => {
    setSubmitting(true);

    try {
      const paymentData = await apiRequest(`/api/payments/esewa/pay-again/${id}`, { method: 'POST' });
      submitEsewaForm(paymentData);
    } catch (err) {
      showToast(err.message || 'Unable to start eSewa payment again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefundSubmit = async (event) => {
    event.preventDefault();
    setRefundSubmitting(true);

    try {
      await apiRequest('/api/refunds', {
        method: 'POST',
        body: { orderId: id, reason: refundReason, paymentInfo },
      });
      setRefundReason('');
      setPaymentInfo('');
      setRefunds(await apiRequest('/api/refunds/my'));
      showToast('Refund request submitted.', 'success');
    } catch (err) {
      showToast(err.message || 'Unable to submit the refund request.', 'error');
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (loading) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">Loading order...</div>;
  }

  if (error || !order) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700 shadow-sm">
        {error || 'This order could not be found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Order details</p>
            <h1 className="mt-2 break-all text-2xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-3xl">{order.id}</h1>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order status</p>
              <div className="mt-2"><OrderStatusBadge status={order.orderStatus} /></div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment status</p>
              <div className="mt-2"><PaymentStatusBadge status={order.paymentStatus} /></div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment method</p>
              <div className="mt-2"><PaymentMethodBadge method={order.paymentMethod} /></div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Order date</p>
            <p className="mt-2 text-sm text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">NPR {Number(order.totalAmount || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Items</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{order.items?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment</p>
            <p className="mt-2 text-sm text-slate-900">{paymentMethod === 1 ? 'eSewa' : 'Cash on Delivery'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap gap-3">
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}

          {paymentMethod === 1 && (
            <>
              {canCheckPayment && <div className="flex flex-col gap-1"><button type="button" onClick={handleCheckStatus} disabled={checkingStatus} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70">{checkingStatus ? 'Checking...' : 'Refresh payment status'}</button><span className="text-xs text-slate-500">Checks eSewa and updates this order.</span></div>}

              {canPayAgain && (
                <button
                  type="button"
                  onClick={handlePayAgain}
                  disabled={submitting}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Starting payment...' : 'Pay Again'}
                </button>
              )}
            </>
          )}

          <Link to="/account/orders" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300">
            Back to orders
          </Link>
        </div>
      </div>

      {canRequestRefund && (
        <form onSubmit={handleRefundSubmit} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">Request refund</h2>
          <p className="mt-2 text-sm text-slate-600">Refunds are reviewed and paid manually by the Laced team.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Reason
              <textarea required value={refundReason} onChange={(event) => setRefundReason(event.target.value)} rows="4" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-slate-500" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Payment information
              <textarea required value={paymentInfo} onChange={(event) => setPaymentInfo(event.target.value)} rows="4" placeholder="Bank account or wallet details" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:border-slate-500" />
            </label>
          </div>
          <button type="submit" disabled={refundSubmitting} className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70">
            {refundSubmitting ? 'Submitting...' : 'Request Refund'}
          </button>
        </form>
      )}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">Refund history</h2><span className="text-sm text-slate-500">{existingRefund ? 'Refund requested' : 'No refund requested'}</span></div>
        {refunds.filter((refund) => refund.orderId === id).length === 0 ? <p className="mt-3 text-sm text-slate-600">There are no refund requests linked to this order.</p> : <div className="mt-4 divide-y divide-slate-200">{refunds.filter((refund) => refund.orderId === id).map((refund) => <div key={refund.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-900">{['Requested', 'Approved', 'Rejected', 'Paid'][Number(refund.status)] || 'Unknown'}</p><p className="text-xs text-slate-500">{new Date(refund.createdAt).toLocaleString()}</p></div><p className="mt-2 text-sm text-slate-700">{refund.reason}</p>{refund.adminNote && <p className="mt-2 text-sm text-slate-600"><span className="font-medium text-slate-900">Admin note:</span> {refund.adminNote}</p>}</div>)}</div>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">Items</h2>

          <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 px-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <img src={buildImageUrl(item.heroImage || item.image)} alt={item.productName} className="h-20 w-20 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{item.productName}</p>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <span>Size {item.size}</span>
                    <span>Qty {item.quantity}</span>
                    <span>NPR {Number(item.unitPrice || 0).toLocaleString()}</span>
                    <span className="font-medium text-slate-900">NPR {Number(item.lineTotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">Shipping</h2>

          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Name</p>
              <p className="mt-2 text-slate-900">{order.shippingName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Phone</p>
              <p className="mt-2 text-slate-900">{order.shippingPhone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Address</p>
              <p className="mt-2 text-slate-900">{order.shippingAddress}</p>
              <p className="mt-1 text-slate-900">{order.shippingCity}{order.shippingPostalCode ? `, ${order.shippingPostalCode}` : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
