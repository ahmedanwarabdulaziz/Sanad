export type MarbleCategory = {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  created_at: string;
};

export type MarbleProduct = {
  id: string;
  category_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  status: 'in_stock' | 'on_demand' | 'not_handled';
  main_image_url: string | null;
  created_at: string;
};

export type MarbleProductFeature = {
  id: string;
  product_id: string;
  feature_ar: string;
  feature_en: string;
  is_pro: boolean;
  created_at: string;
};

export type MarbleProductSpec = {
  id: string;
  product_id: string;
  spec_key_ar: string;
  spec_key_en: string;
  spec_value_ar: string;
  spec_value_en: string;
  created_at: string;
};

export type MarbleTag = {
  id: string;
  tag_group: string; // e.g., 'room', 'environment', 'project_type'
  name_ar: string;
  name_en: string;
  slug: string;
  parent_id?: string | null;
  has_dedicated_page: boolean;
  created_at: string;
};

export type MarbleProductImage = {
  id: string;
  product_id: string;
  url: string;
  created_at: string;
};

export type MarbleImageTag = {
  image_id: string;
  tag_id: string;
};
