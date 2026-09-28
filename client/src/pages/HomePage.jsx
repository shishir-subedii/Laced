import { Link } from 'react-router-dom';
import { categories, featuredProducts } from '../data/mockData';

export default function HomePage() {
  return (
    <div className="space-y-16 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-12">
          <div>
            <h1 className="max-w-lg text-4xl font-semibold tracking-[-0.08em] text-slate-900 sm:text-5xl">
              Everyday sneakers for the city pace.
            </h1>
            <p className="mt-5 max-w-lg text-base text-slate-600">
              Discover clean silhouettes, lightweight cushioning, and versatile pairs designed for campus life and weekend plans.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/shop" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700">
                Shop now
              </Link>
              <Link to="/about" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300">
                Learn more
              </Link>
            </div>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=1200&q=80"
              alt="Sneaker on a clean studio setup"
              className="h-[420px] w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">Shop by Style</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="text-xl font-semibold tracking-[-0.04em] text-slate-900">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">New Arrivals</h2>
          <Link to="/shop" className="text-sm font-medium text-slate-700 transition hover:text-slate-900">View all</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featuredProducts.map((product) => (
            <Link key={product.id} to="/shop" className="group block overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
              <img src={product.image} alt={product.name} className="h-72 w-full object-cover" />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{product.category}</span><span className="text-xs font-medium text-slate-500">{product.accent}</span></div>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-900">{product.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{product.description}</p>
                <div className="mt-5 flex items-center justify-between"><span className="text-lg font-semibold text-slate-900">NPR {product.price.toLocaleString()}</span><span className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">View</span></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3 md:p-8">
        <div>
          <h3 className="text-2xl font-semibold tracking-[-0.05em] text-slate-900">Built for everyday wear.</h3>
        </div>
        <div className="text-sm text-slate-600">
          Thoughtful silhouettes, balanced comfort, and no-fuss styling for campus, weekends, and daily movement.
        </div>
        <div className="text-sm text-slate-600">
          A lightweight project storefront designed to showcase a modern sneaker ecommerce experience.
        </div>
      </section>
    </div>
  );
}
