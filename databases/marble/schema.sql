-- Create Marble Categories Table
CREATE TABLE public.marble_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Marble Products Table
CREATE TABLE public.marble_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.marble_categories(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    status TEXT CHECK (status IN ('in_stock', 'on_demand', 'not_handled')) NOT NULL DEFAULT 'not_handled',
    main_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Marble Product Features (Pros & Cons) Table
CREATE TABLE public.marble_product_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.marble_products(id) ON DELETE CASCADE,
    feature_ar TEXT NOT NULL,
    feature_en TEXT NOT NULL,
    is_pro BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Marble Product Specifications Table
CREATE TABLE public.marble_product_specs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.marble_products(id) ON DELETE CASCADE,
    spec_key_ar TEXT NOT NULL, 
    spec_key_en TEXT NOT NULL, 
    spec_value_ar TEXT NOT NULL, 
    spec_value_en TEXT NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Tags Table (For classifying images: Kitchens, Bathrooms, Indoor, Outdoor, Commercial, Residential)
CREATE TABLE public.marble_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_group TEXT NOT NULL, -- e.g., 'room', 'environment', 'project_type'
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES public.marble_tags(id) ON DELETE CASCADE,
    has_dedicated_page BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Product Images Table (Multiple images per product)
CREATE TABLE public.marble_product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.marble_products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Image Tags Join Table (Many-to-Many between Images and Tags)
CREATE TABLE public.marble_image_tags (
    image_id UUID REFERENCES public.marble_product_images(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.marble_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (image_id, tag_id)
);

-- Add Row Level Security (RLS) Policies
ALTER TABLE public.marble_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marble_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marble_product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marble_product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marble_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marble_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marble_image_tags ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on marble_categories" ON public.marble_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on marble_products" ON public.marble_products FOR SELECT USING (true);
CREATE POLICY "Allow public read access on marble_product_features" ON public.marble_product_features FOR SELECT USING (true);
CREATE POLICY "Allow public read access on marble_product_specs" ON public.marble_product_specs FOR SELECT USING (true);
CREATE POLICY "Allow public read access on marble_tags" ON public.marble_tags FOR SELECT USING (true);
CREATE POLICY "Allow public read access on marble_product_images" ON public.marble_product_images FOR SELECT USING (true);
CREATE POLICY "Allow public read access on marble_image_tags" ON public.marble_image_tags FOR SELECT USING (true);
