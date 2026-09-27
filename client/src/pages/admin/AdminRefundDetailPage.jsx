import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const statuses = ['Requested', 'Approved', 'Rejected', 'Paid'];
const label = (value) => statuses[Number(value)] || value || 'Unknown';

export default function AdminRefundDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [refund, setRefund] = useState(null);
  const [status, setStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [state, setState] = useState({ loading: true, saving: false, error: '' });

  const loadRefund = async () => {
    try {
      const data = await apiRequest(`/api/admin/refunds/${id}`);
      setRefund(data);
      setStatus(label(data.status));
      setAdminNote(data.adminNote || '');
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Unable to load refund.' }));
    } finally {
      setState((current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => { loadRefund(); }, [id]);

  const saveStatus = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true }));
    try {
      await apiRequest(`/api/admin/refunds/${id}/status`, { method: 'PUT', body: { status, adminNote: adminNote || null } });
      showToast('Refund status updated.', 'success');
      await loadRefund();
    } catch (error) {
      showToast(error.message || 'Unable to update refund.', 'error');
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  };

  if (state.loading) return <p className="text-sm text-slate-500">Loading refund...</p>;
  if (state.error || !refund) return <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{state.error || 'Refund not found.'}</p>;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin/refunds"
          className="text-sm text-slate-600 underline"
        >
          Back to refunds
        </Link>
        <h2 className="mt-2 text-3xl font-semibold text-white-900">
          Refund request
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Order ID
              </p>
              <p className="mt-2 text-sm">{refund.orderId}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Customer
              </p>
              <p className="mt-2 text-sm">
                {refund.customerName || "Unknown"}
                <br />
                {refund.customerEmail}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Order total
              </p>
              <p className="mt-2 text-sm">
                NPR {Number(refund.orderTotal).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Created
              </p>
              <p className="mt-2 text-sm">
                {new Date(refund.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Reason
              </p>
              <p className="mt-2 text-sm text-slate-700">{refund.reason}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                Payment information
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {refund.paymentInfo}
              </p>
            </div>
          </div>
        </section>

        <form
          onSubmit={saveStatus}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-xl font-semibold text-slate-900">
            Manage refund
          </h3>

          <label className="mt-4 block text-sm font-medium">
            Refund status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
            >
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium">
            Admin note
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows="4"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
            />
          </label>

          <button
            disabled={state.saving}
            className="mt-4 w-full rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {state.saving ? "Saving..." : "Save status"}
          </button>
        </form>
      </div>
    </div>
  );
}
