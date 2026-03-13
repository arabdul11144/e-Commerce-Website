import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type ProductCategory = Product['category'];

interface ProductSpecificationInput {
  key: string;
  value: string;
}

export interface ProductFormSubmission {
  name: string;
  brand: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  discountPrice?: number;
  stock: number;
  shortDescription: string;
  fullDescription: string;
  featured: boolean;
  specifications: Record<string, string>;
  existingImages: string[];
  newImageFiles: File[];
}

interface ProductFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  product?: Product | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormSubmission) => Promise<void>;
}

function createInitialSpecifications(product?: Product | null) {
  const entries = Object.entries(product?.specifications || {}).map(([key, value]) => ({
    key,
    value,
  }));

  return entries.length > 0 ? entries : [{ key: '', value: '' }];
}

function createPreviewEntry(file: File) {
  return {
    file,
    preview: URL.createObjectURL(file),
  };
}

export function ProductFormModal({
  isOpen,
  mode,
  product,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Laptops');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [featured, setFeatured] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<Array<{ file: File; preview: string }>>([]);
  const [specifications, setSpecifications] = useState<ProductSpecificationInput[]>([
    { key: '', value: '' },
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(product?.name || '');
    setBrand(product?.brand || '');
    setCategory(product?.category || 'Laptops');
    setSubcategory(product?.subcategory || '');
    setPrice(String(product?.price ?? ''));
    setDiscountPrice(
      product?.discountPrice === undefined ? '' : String(product.discountPrice)
    );
    setStock(String(product?.stock ?? ''));
    setShortDescription(product?.shortDescription || '');
    setFullDescription(product?.fullDescription || '');
    setFeatured(Boolean(product?.featured));
    setExistingImages(product?.images || []);
    setSpecifications(createInitialSpecifications(product));

    setNewImages((currentImages) => {
      currentImages.forEach((image) => URL.revokeObjectURL(image.preview));
      return [];
    });
  }, [isOpen, product]);

  useEffect(() => {
    return () => {
      newImages.forEach((image) => URL.revokeObjectURL(image.preview));
    };
  }, [newImages]);

  const imagePreviews = useMemo(
    () => [
      ...existingImages.map((image, index) => ({
        id: `existing-${index}`,
        src: image,
        type: 'existing' as const,
      })),
      ...newImages.map((image, index) => ({
        id: `new-${index}`,
        src: image.preview,
        type: 'new' as const,
      })),
    ],
    [existingImages, newImages]
  );

  const updateSpecification =
    (index: number, field: keyof ProductSpecificationInput) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setSpecifications((currentSpecifications) =>
        currentSpecifications.map((specification, specificationIndex) =>
          specificationIndex === index
            ? { ...specification, [field]: event.target.value }
            : specification
        )
      );
    };

  const handleAddSpecification = () => {
    setSpecifications((currentSpecifications) => [
      ...currentSpecifications,
      { key: '', value: '' },
    ]);
  };

  const handleRemoveSpecification = (index: number) => {
    setSpecifications((currentSpecifications) => {
      if (currentSpecifications.length === 1) {
        return [{ key: '', value: '' }];
      }

      return currentSpecifications.filter((_, specificationIndex) => specificationIndex !== index);
    });
  };

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 5MB upload limit`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      event.target.value = '';
      return;
    }

    setNewImages((currentImages) => [
      ...currentImages,
      ...validFiles.map((file) => createPreviewEntry(file)),
    ]);
    event.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((currentImages) =>
      currentImages.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const removeNewImage = (index: number) => {
    setNewImages((currentImages) => {
      const nextImages = [...currentImages];
      const removedImage = nextImages.splice(index, 1)[0];

      if (removedImage) {
        URL.revokeObjectURL(removedImage.preview);
      }

      return nextImages;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const numericPrice = Number(price);
    const numericDiscountPrice = discountPrice === '' ? undefined : Number(discountPrice);
    const numericStock = Number(stock);

    if (!name.trim() || !brand.trim() || !shortDescription.trim() || !fullDescription.trim()) {
      toast.error('Please complete all required product fields');
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      toast.error('Please provide a valid product price');
      return;
    }

    if (
      numericDiscountPrice !== undefined &&
      (!Number.isFinite(numericDiscountPrice) || numericDiscountPrice < 0)
    ) {
      toast.error('Please provide a valid discount price');
      return;
    }

    if (!Number.isFinite(numericStock) || numericStock < 0) {
      toast.error('Please provide a valid stock quantity');
      return;
    }

    const normalizedSpecifications = specifications.reduce<Record<string, string>>(
      (accumulator, specification) => {
        const key = specification.key.trim();
        const value = specification.value.trim();

        if (!key || !value) {
          return accumulator;
        }

        accumulator[key] = value;
        return accumulator;
      },
      {}
    );

    await onSubmit({
      name: name.trim(),
      brand: brand.trim(),
      category,
      subcategory: subcategory.trim(),
      price: numericPrice,
      discountPrice: numericDiscountPrice,
      stock: Math.max(0, Math.trunc(numericStock)),
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      featured,
      specifications: normalizedSpecifications,
      existingImages,
      newImageFiles: newImages.map((image) => image.file),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-subtle/30 bg-surface shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-subtle/30">
              <div>
                <h2 className="text-xl font-bold text-primary">
                  {mode === 'add' ? 'Add Product' : 'Edit Product'}
                </h2>
                <p className="text-sm text-muted mt-1">
                  Manage product details, specifications, pricing, and images.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[calc(90vh-84px)] overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Product Name" value={name} onChange={(event) => setName(event.target.value)} required />
                  <Input label="Brand" value={brand} onChange={(event) => setBrand(event.target.value)} required />
                  <div>
                    <label className="text-sm font-medium text-primary block mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value === 'Accessories' ? 'Accessories' : 'Laptops')}
                      className="w-full h-[42px] bg-surface border border-subtle/50 rounded-lg text-primary px-4 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                    >
                      <option value="Laptops">Laptops</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <Input label="Subcategory" value={subcategory} onChange={(event) => setSubcategory(event.target.value)} />
                  <Input label="Price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
                  <Input label="Discount Price" type="number" min="0" step="0.01" value={discountPrice} onChange={(event) => setDiscountPrice(event.target.value)} />
                  <Input label="Stock" type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required />
                  <label className="flex items-center gap-3 text-sm font-medium text-primary pt-7">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(event) => setFeatured(event.target.checked)}
                      className="rounded border-subtle bg-background text-accent-blue focus:ring-accent-blue"
                    />
                    Featured Product
                  </label>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-primary block mb-1.5">
                      Short Description
                    </label>
                    <textarea
                      value={shortDescription}
                      onChange={(event) => setShortDescription(event.target.value)}
                      rows={3}
                      className="w-full bg-surface border border-subtle/50 rounded-lg text-primary px-4 py-3 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-primary block mb-1.5">
                      Full Description
                    </label>
                    <textarea
                      value={fullDescription}
                      onChange={(event) => setFullDescription(event.target.value)}
                      rows={5}
                      className="w-full bg-surface border border-subtle/50 rounded-lg text-primary px-4 py-3 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-primary">Specifications</h3>
                      <p className="text-sm text-muted mt-1">Add key product specifications.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={handleAddSpecification}
                    >
                      Add Spec
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {specifications.map((specification, index) => (
                      <div key={`${index}-${specification.key}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                        <Input
                          label={index === 0 ? 'Specification Name' : undefined}
                          value={specification.key}
                          onChange={updateSpecification(index, 'key')}
                          placeholder="e.g. Processor"
                        />
                        <Input
                          label={index === 0 ? 'Specification Value' : undefined}
                          value={specification.value}
                          onChange={updateSpecification(index, 'value')}
                          placeholder="e.g. Apple M3"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="self-end"
                          onClick={() => handleRemoveSpecification(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-primary">Images</h3>
                    <p className="text-sm text-muted mt-1">
                      Upload product images directly from your computer.
                    </p>
                  </div>
                  <label className="flex items-center justify-center border border-dashed border-subtle/50 rounded-xl px-4 py-6 text-sm text-body hover:border-accent-blue/50 transition-colors cursor-pointer bg-background/40">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelection}
                    />
                    Select Product Images
                  </label>
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((image, index) => (
                        <div
                          key={image.id}
                          className="relative rounded-xl overflow-hidden border border-subtle/30 bg-background aspect-square"
                        >
                          <img src={image.src} alt="Product preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              image.type === 'existing'
                                ? removeExistingImage(index)
                                : removeNewImage(index - existingImages.length)
                            }
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 text-status-error hover:bg-background"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-5 border-t border-subtle/30 flex items-center justify-end gap-3 bg-surface">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {mode === 'add' ? 'Create Product' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
