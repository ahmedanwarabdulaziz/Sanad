-- Add parent_id for hierarchical tags
ALTER TABLE public.marble_tags 
ADD COLUMN parent_id UUID REFERENCES public.marble_tags(id) ON DELETE CASCADE;

-- Add flag to determine if the tag should have its own dedicated page
ALTER TABLE public.marble_tags 
ADD COLUMN has_dedicated_page BOOLEAN NOT NULL DEFAULT false;
