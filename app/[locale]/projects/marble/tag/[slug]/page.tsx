import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import { Link } from '@/navigation';

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch the tag details
  const { data: tag, error: tagError } = await supabase
    .from('marble_tags')
    .select('*')
    .eq('slug', slug)
    .single();

  // Fetch images for this tag along with their product info
  // Since we need to join marble_image_tags -> marble_product_images -> marble_products
  const { data: images, error: imagesError } = await supabase
    .from('marble_image_tags')
    .select(`
      image_id,
      marble_product_images (
        url,
        product_id,
        marble_products (
          id,
          name_ar,
          name_en,
          slug
        )
      )
    `)
    .eq('tag_id', tag?.id || '');

  // For Demo purposes before data exists:
  const isDemo = !tag || !images || images.length === 0;
  
  const displayTitle = tag ? tag.name_ar : 'تصنيف: ' + slug;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 pt-24 px-4 md:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">
            {displayTitle}
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            استكشف أحدث التصميمات والأفكار
          </p>
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {isDemo ? (
            // Demo content
            [1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="break-inside-avoid relative rounded-2xl overflow-hidden group mb-6">
                <Image 
                  src={`https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop&sig=${i}`}
                  alt="Demo Image"
                  width={600}
                  height={i % 2 === 0 ? 800 : 500}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <h3 className="text-white font-bold text-xl mb-2">اسم المنتج الوهمي</h3>
                  <Link href="/projects/marble/product/demo" className="text-white text-sm underline underline-offset-4">
                    عرض تفاصيل المنتج
                  </Link>
                </div>
              </div>
            ))
          ) : (
            // Actual Data
            images.map((item: any) => {
              const img = item.marble_product_images;
              const product = img?.marble_products;
              if (!img || !product) return null;
              
              return (
                <div key={img.url} className="break-inside-avoid relative rounded-2xl overflow-hidden group mb-6 shadow-md">
                  <Image 
                    src={img.url}
                    alt={product.name_ar}
                    width={600}
                    height={600} // Ideally we don't fix height for true masonry, but Image requires it. We can use object-cover.
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <h3 className="text-white font-bold text-xl mb-2">
                      {product.name_ar}
                    </h3>
                    <Link href={`/projects/marble/product/${product.slug}`} className="text-white text-sm underline underline-offset-4 font-semibold hover:text-blue-300">
                      عرض تفاصيل المنتج
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
