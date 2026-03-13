import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { Product } from '../../types';
import { useSellerAuth } from '../../contexts/SellerAuthContext';
import { getErrorMessage } from '../../lib/api';
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  type AdminProductsResponse,
  updateAdminProduct,
} from '../../lib/admin';
import { uploadSellerProductImage } from '../../lib/seller';
import {
  ProductFormModal,
  type ProductFormSubmission,
} from '../../components/admin/ProductFormModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

const EMPTY_PRODUCTS: AdminProductsResponse = {
  items: [],
  summary: {
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  },
  pagination: {
    page: 1,
    limit: 8,
    totalItems: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  },
};

function buildPageNumbers(currentPage: number, totalPages: number) {
  const maxButtons = Math.min(3, totalPages);
  const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - maxButtons + 1));

  return Array.from({ length: maxButtons }, (_, index) => startPage + index);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image file'));
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export function AdminProductsPage() {
  const { token, seller } = useSellerAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [page, setPage] = useState(1);
  const [productsResponse, setProductsResponse] =
    useState<AdminProductsResponse>(EMPTY_PRODUCTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, searchTerm]);

  useEffect(() => {
    if (!token || !seller) {
      setProductsResponse(EMPTY_PRODUCTS);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    fetchAdminProducts(token, {
      page,
      limit: 8,
      search: searchTerm,
      category: categoryFilter === 'All Categories' ? '' : categoryFilter,
    })
      .then((response) => {
        if (!isCancelled) {
          setProductsResponse(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(getErrorMessage(error));
          setProductsResponse(EMPTY_PRODUCTS);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [categoryFilter, page, searchTerm, seller, token]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(productsResponse.pagination.page, productsResponse.pagination.totalPages),
    [productsResponse.pagination.page, productsResponse.pagination.totalPages]
  );

  const refreshProducts = async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchAdminProducts(token, {
        page,
        limit: 8,
        search: searchTerm,
        category: categoryFilter === 'All Categories' ? '' : categoryFilter,
      });

      setProductsResponse(response);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const closeProductModal = () => {
    if (isSubmittingProduct) {
      return;
    }

    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  const resetProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProduct(null);
  };

  const uploadSelectedImages = async (files: File[]) => {
    if (!token || files.length === 0) {
      return [] as string[];
    }

    return Promise.all(
      files.map(async (file) => {
        const image = await readFileAsDataUrl(file);
        const response = await uploadSellerProductImage(token, image);
        return response.url;
      })
    );
  };

  const buildProductPayload = (
    values: ProductFormSubmission,
    product?: Product | null
  ) => {
    const uniqueSuffix = Date.now();
    const baseSlug = slugify(values.name);

    return {
      name: values.name,
      brand: values.brand,
      category: values.category,
      price: values.price,
      stock: values.stock,
      shortDescription: values.shortDescription,
      fullDescription: values.fullDescription,
      slug: product?.slug || `${baseSlug}-${uniqueSuffix}`,
      sku: product?.sku || `SKU-${uniqueSuffix}`,
      images: values.existingImages,
      specifications: values.specifications,
      featured: values.featured,
      rating: product?.rating || 0,
      reviewsCount: product?.reviewsCount || 0,
      discountPrice: values.discountPrice,
      subcategory: values.subcategory || undefined,
    };
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (values: ProductFormSubmission) => {
    if (!token) {
      return;
    }

    setIsSubmittingProduct(true);

    try {
      const uploadedImages = await uploadSelectedImages(values.newImageFiles);
      const payload = buildProductPayload(
        {
          ...values,
          existingImages: [...values.existingImages, ...uploadedImages],
        },
        selectedProduct
      );

      if (selectedProduct) {
        await updateAdminProduct(token, selectedProduct.id, payload);
        toast.success('Product updated');
      } else {
        await createAdminProduct(token, payload);
        toast.success('Product created');
      }

      resetProductModal();
      await refreshProducts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(`Delete ${product.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminProduct(token, product.id);
      toast.success('Product removed');
      await refreshProducts();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All Categories');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Products Management
          </h1>
          <p className="text-body text-sm mt-1">
            Manage your catalog, inventory, and pricing.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddProduct}>
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted font-medium">Total Products</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {productsResponse.summary.totalProducts}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted font-medium">In Stock</p>
          <p className="text-2xl font-bold text-status-success mt-1">
            {productsResponse.summary.inStock}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted font-medium">Low Stock</p>
          <p className="text-2xl font-bold text-status-warning mt-1">
            {productsResponse.summary.lowStock}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted font-medium">Out of Stock</p>
          <p className="text-2xl font-bold text-status-error mt-1">
            {productsResponse.summary.outOfStock}
          </p>
        </Card>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-96 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search products by name or brand..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-background border border-subtle/50 rounded-lg py-2 pl-9 pr-4 text-sm text-primary focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            leftIcon={<Filter className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
            onClick={clearFilters}
          >
            Filter
          </Button>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="bg-background border border-subtle/50 rounded-lg py-2 px-4 text-sm text-primary focus:outline-none focus:border-accent-blue transition-colors flex-1 sm:flex-none"
          >
            <option>All Categories</option>
            <option>Laptops</option>
            <option>Accessories</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-elevated/50 text-muted text-xs uppercase tracking-wider border-b border-subtle/30">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-subtle bg-background text-accent-blue focus:ring-accent-blue"
                  />
                </th>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/20">
              {!isLoading &&
                productsResponse.items.map((product) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={product.id}
                    className="hover:bg-elevated/30 transition-colors group"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-subtle bg-background text-accent-blue focus:ring-accent-blue"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-background border border-subtle/30 overflow-hidden flex-shrink-0">
                          <img
                            src={product.images[0] ?? ''}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-primary line-clamp-1">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-body">{product.category}</span>
                      {product.subcategory && (
                        <span className="text-xs text-muted block mt-0.5">
                          {product.subcategory}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        {product.discountPrice ? (
                          <>
                            <span className="text-sm font-medium text-primary">
                              ${product.discountPrice.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted line-through">
                              ${product.price.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            ${product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm font-medium ${
                          product.stock === 0
                            ? 'text-status-error'
                            : product.stock < 10
                            ? 'text-status-warning'
                            : 'text-primary'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={product.stock > 0 ? 'success' : 'error'}>
                        {product.stock > 0 ? 'Active' : 'Out of Stock'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-1.5 text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="p-1.5 text-muted hover:text-status-error hover:bg-status-error/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
        {!isLoading && productsResponse.items.length === 0 && (
          <div className="p-8 text-center text-muted">
            No products found matching your search.
          </div>
        )}
        {isLoading && (
          <div className="p-8 text-center text-muted">Loading products...</div>
        )}
        <div className="p-4 border-t border-subtle/30 flex items-center justify-between text-sm text-muted">
          <span>
            Showing {productsResponse.items.length} of {productsResponse.pagination.totalItems} products
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={!productsResponse.pagination.hasPrevPage}
              className="px-3 py-1 rounded border border-subtle/30 hover:bg-elevated disabled:opacity-50"
            >
              Prev
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`px-3 py-1 rounded ${
                  pageNumber === productsResponse.pagination.page
                    ? 'bg-accent-blue text-background font-medium'
                    : 'border border-subtle/30 hover:bg-elevated'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={!productsResponse.pagination.hasNextPage}
              className="px-3 py-1 rounded border border-subtle/30 hover:bg-elevated disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
      <ProductFormModal
        isOpen={isProductModalOpen}
        mode={selectedProduct ? 'edit' : 'add'}
        product={selectedProduct}
        isSubmitting={isSubmittingProduct}
        onClose={closeProductModal}
        onSubmit={handleProductSubmit}
      />
    </div>
  );
}
