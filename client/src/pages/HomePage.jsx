import { Link } from 'react-router-dom';
import { categories, featuredProducts } from '../data/mockData';

const styleDescriptions = {
  Running: 'Lightweight pairs for daily miles and quick city movement.',
  Lifestyle: 'Clean, easy silhouettes that work with everything you wear.',
  Court: 'Crisp low-tops with a confident, classic profile.',
  'New Arrivals': 'Fresh shapes and colors, just added to the rotation.',
};

const styleImages = [
  'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1605408499391-6368c628ef42?auto=format&fit=crop&w=900&q=80',
];

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
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.06em] text-slate-900">Shop by style</h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to={category.href}
              className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <img src={styleImages[index]} alt="" className="h-40 w-full object-cover" />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-semibold tracking-[-0.04em] text-slate-900">{category.name === 'New Arrivals' ? 'Performance' : category.name}</p>
                  <span className="text-lg text-slate-400 transition-colors group-hover:text-slate-700" aria-hidden="true">↗</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{styleDescriptions[category.name]}</p>
              </div>
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

      <section className="overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-7 sm:p-10 lg:p-12">
            <h3 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.06em] sm:text-4xl">The pair you reach for without thinking.</h3>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">Thoughtful silhouettes, balanced comfort, and no-fuss styling for campus, weekends, and every plan in between.</p>
            <Link to="/shop" className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200">Explore the collection</Link>
          </div>

          <div className="border-t border-white/15 bg-slate-800/60 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <div className="divide-y divide-white/15">
              <div className="flex gap-4 pb-5">
                <span className="text-sm font-semibold text-slate-400">01</span>
                <div><p className="font-medium">Comfort that keeps up</p><p className="mt-1 text-sm leading-6 text-slate-400">Cushioned underfoot for long days and longer walks.</p></div>
              </div>
              <div className="flex gap-4 py-5">
                <span className="text-sm font-semibold text-slate-400">02</span>
                <div><p className="font-medium">Style without the effort</p><p className="mt-1 text-sm leading-6 text-slate-400">Versatile colors and clean lines for daily outfits.</p></div>
              </div>
              <div className="flex gap-4 pt-5">
                <span className="text-sm font-semibold text-slate-400">03</span>
                <div><p className="font-medium">Ready for the rotation</p><p className="mt-1 text-sm leading-6 text-slate-400">Easy pairs made to be worn, not left on the shelf.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
