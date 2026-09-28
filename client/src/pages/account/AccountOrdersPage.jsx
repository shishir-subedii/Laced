import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from '../../components/order/StatusBadge';
import { apiRequest } from '../../services/api';
import Pagination from '../../components/common/Pagination';

function formatCurrency(value) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const result = await apiRequest(`/api/orders?page=${page}&pageSize=10`);
      setOrders(result?.items || []);
      setPagination({ page: result?.page || page, totalPages: result?.totalPages || 0 });
    } catch (err) {
      setError(err.message || 'Unable to load orders right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  if (loading) {
    return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading orders...</div>;
  }

  if (error) {
    return <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="border-t border-slate-200 py-8">
        <h1 className="text-3xl font-semibold tracking-[-0.06em] text-slate-900">Your orders</h1>
        <p className="mt-4 text-slate-600">You have not placed any orders yet.</p>
        <Link to="/shop" className="mt-6 inline-flex rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700">
          Shop sneakers
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-[-0.06em] text-slate-900">Your orders</h1>
        <p className="text-sm text-slate-500">{orders.length} order{orders.length === 1 ? '' : 's'} on this page</p>
      </div>

      <div className="divide-y divide-slate-200">
        {orders.map((order) => (
          <Link key={order.id} to={`/account/orders/${order.id}`} className="block py-6 transition-colors hover:bg-white/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Order</p>
                <h2 className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-slate-900">{order.id}</h2>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <OrderStatusBadge status={order.orderStatus} />
                <PaymentStatusBadge status={order.paymentStatus} />
                <PaymentMethodBadge method={order.paymentMethod} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Date</p><p className="mt-1 text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total</p><p className="mt-1 font-medium text-slate-900">{formatCurrency(order.totalAmount)}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Items</p><p className="mt-1 text-slate-900">{(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment</p><p className="mt-1 text-slate-900">{order.paymentMethod === 1 ? 'eSewa' : 'Cash on Delivery'}</p></div>
            </div>
          </Link>
        ))}
      </div>
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={fetchOrders} />
    </div>
  );
}
