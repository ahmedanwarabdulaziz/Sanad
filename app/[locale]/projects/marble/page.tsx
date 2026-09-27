import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/navigation';

export default function MarbleCatalogHome() {
  // We can use a dedicated namespace for Marble, or fallback to common if not ready
  // const t = useTranslations('Marble');
  
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop"
            alt="Marble Background"
            fill
            className="object-cover brightness-50"
            priority
          />
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg tracking-tight">
            تشكيلة الرخام والجرانيت
          </h1>
          <p className="text-lg md:text-2xl font-light max-w-2xl mx-auto mb-8 drop-shadow-md">
            اكتشف الفخامة في كل تفصيلة، مجموعة مختارة من أجود أنواع الرخام والجرانيت لمشاريعك السكنية والتجارية.
          </p>
          <Link href="/projects/marble/categories">
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/50 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
              تصفح الكتالوج
            </button>
          </Link>
        </div>
      </section>

      {/* Main Categories */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 text-neutral-800 dark:text-neutral-100">
          أقسام المنتجات
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { id: 'marble', name: 'رخام', image: 'https://images.unsplash.com/photo-1598506044431-7cb46c592a83?q=80&w=1000&auto=format&fit=crop' },
            { id: 'granite', name: 'جرانيت', image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop' },
            { id: 'interlock', name: 'انترلوك', image: 'https://images.unsplash.com/photo-1590492817293-6c84b4ff3d8e?q=80&w=1000&auto=format&fit=crop' },
            { id: 'curbs', name: 'بلدورة', image: 'https://images.unsplash.com/photo-1597818967911-370cc8b8f2fc?q=80&w=1000&auto=format&fit=crop' },
          ].map((cat) => (
            <Link href={`/projects/marble/category/${cat.id}`} key={cat.id} className="group relative h-80 rounded-2xl overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2">
              <Image src={cat.image} alt={cat.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <h3 className="absolute bottom-6 left-6 right-6 text-2xl font-bold text-white z-10 text-center">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Inspirational Spaces (Tags mapping) */}
      <section className="py-20 px-4 md:px-8 bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 text-neutral-800 dark:text-neutral-100">
            مساحات ملهمة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'kitchen', name: 'مطابخ', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop' },
              { id: 'bathroom', name: 'حمامات', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=1000&auto=format&fit=crop' },
              { id: 'outdoor', name: 'خارجي', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop' },
            ].map((space) => (
              <Link href={`/projects/marble/tag/${space.id}`} key={space.id} className="group block h-64 relative rounded-xl overflow-hidden">
                <Image src={space.image} alt={space.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white tracking-wider border-2 border-white/50 px-6 py-2 rounded-lg backdrop-blur-sm">
                    {space.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
