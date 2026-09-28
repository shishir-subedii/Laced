import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { buildImageUrl } from '../../utils/image';

function buildProductImage(product) {
  const images = product?.images || [];
  const hero = images.find((image) => image.isHero) || images[0];

  if (!hero?.url) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80';
  }

  return buildImageUrl(hero.url);
}

function formatPrice(value) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

export default function ProductCard({ product }) {
  if (!product) {
    return null;
  }

  const sizes = product.sizes || [];
  const availableSizes = sizes.filter((size) => Number(size.quantity) > 0).map((size) => size.size);

  return (
    <article className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
      <Link to={`/products/${product.id}`} className="block">
        <div className="overflow-hidden">
          <img
            src={buildProductImage(product)}
            alt={product.name}
            className="h-72 w-full object-cover"
          />
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{product.brand}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-900">{product.name}</h3>
          </div>
          <Link to={`/products/${product.id}`} className="rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-slate-300">
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <p className="mt-3 text-base font-medium text-slate-600">{formatPrice(product.price)}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          {availableSizes.length > 0 ? (
            availableSizes.slice(0, 4).map((size) => (
              <span key={size} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                {size}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-red-700">Out of stock</span>
          )}
        </div>
      </div>
    </article>
  );
}
