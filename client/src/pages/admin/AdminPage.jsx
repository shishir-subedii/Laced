import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';

const adminLinks = [
  { title: 'Products', to: '/admin/products', description: 'Manage product catalog items.' },
  { title: 'Orders', to: '/admin/orders', description: 'Review store orders.' },
  { title: 'Refunds', to: '/admin/refunds', description: 'Track customer refund requests.' },
];

export default function AdminPage() {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest('/api/products?page=1&pageSize=50'),
      apiRequest('/api/admin/orders?page=1&pageSize=1'),
      apiRequest('/api/admin/refunds'),
    ])
      .then(([products, orders, refunds]) => setCounts({ products: products?.totalItems || 0, orders: orders?.totalItems || 0, refunds: refunds?.length || 0 }))
      .catch((requestError) => setError(requestError.message || 'Unable to load dashboard data.'));
  }, []);

  return (
    <div className="space-y-8 pb-8">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-slate-900">Store overview</h1>
        <p className="mt-3 text-sm text-slate-600">Manage the catalogue, orders, and manual refunds.</p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {counts && <div className="grid gap-4 sm:grid-cols-3">{[['Products', counts.products, '/admin/products'], ['Orders', counts.orders, '/admin/orders'], ['Refunds', counts.refunds, '/admin/refunds']].map(([label, count, to]) => <Link key={label} to={to} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold text-slate-900">{count}</p></Link>)}</div>}

      <div className="grid gap-5 md:grid-cols-3">
        {adminLinks.map((link) => (
          <Link key={link.title} to={link.to} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-900">{link.title}</h2>
            <p className="mt-3 text-sm text-slate-600">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
