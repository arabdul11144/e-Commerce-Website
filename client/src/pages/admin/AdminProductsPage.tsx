import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { formatCurrency } from '../../utils/product';

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

const LOW_STOCK_THRESHOLD = 10;

type ProductStatFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

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

function filterProductsByStat(products: Product[], filter: ProductStatFilter) {
  switch (filter) {
    case 'in-stock':
      return products.filter((product) => product.stock > 0);
    case 'low-stock':
      return products.filter(
        (product) => product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD
      );
    case 'out-of-stock':
      return products.filter((product) => product.stock <= 0);
    case 'all':
    default:
      return products;
  }
}

function getStatModalTitle(filter: ProductStatFilter) {
  switch (filter) {
    case 'in-stock':
      return 'In Stock Products';
    case 'low-stock':
      return 'Low Stock Products';
    case 'out-of-stock':
      return 'Out of Stock Products';
    case 'all':
    default:
      return 'All Products';
  }
}

function getStockBadge(product: Product) {
  if (product.stock <= 0) {
    return <Badge variant="error">Out of Stock</Badge>;
  }

  if (product.stock < LOW_STOCK_THRESHOLD) {
    return <Badge variant="warning">Low Stock</Badge>;
  }

  return <Badge variant="success">In Stock</Badge>;
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
  const [allProducts, setAllProducts] = useState<Product[] | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [selectedStatFilter, setSelectedStatFilter] =
    useState<ProductStatFilter>('all');
  const [statProducts, setStatProducts] = useState<Product[]>([]);

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
    setAllProducts(null);

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
      shippingFee: values.shippingFee,
      shortDescription: values.fullDescription,
      fullDescription: values.fullDescription,
      slug: product?.slug || `${baseSlug}-${uniqueSuffix}`,
      sku: product?.sku || `SKU-${uniqueSuffix}`,
      images: values.existingImages,
      specifications: values.specifications,
      featured: values.productType === 'featured',
      productType: values.productType,
      rating: product?.rating || 0,
      reviewsCount: product?.reviewsCount || 0,
      discountPrice: values.discountPrice,
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

  const openStatsModal = async (filter: ProductStatFilter) => {
    setSelectedStatFilter(filter);
    setIsStatsModalOpen(true);

    if (!token) {
      setStatProducts([]);
      return;
    }

    if (allProducts) {
      setStatProducts(filterProductsByStat(allProducts, filter));
      return;
    }

    setIsStatsLoading(true);

    try {
      const response = await fetchAdminProducts(token, {
        page: 1,
        limit: Math.max(productsResponse.summary.totalProducts, 1),
      });

      setAllProducts(response.items);
      setStatProducts(filterProductsByStat(response.items, filter));
    } catch (error) {
      toast.error(getErrorMessage(error));
      setStatProducts([]);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const closeStatsModal = () => {
    setIsStatsModalOpen(false);
    setSelectedStatFilter('all');
  };

  const statCards = [
    {
      key: 'all' as const,
      title: 'Total Products',
      value: productsResponse.summary.totalProducts,
      valueClassName: 'text-primary',
    },
    {
      key: 'in-stock' as const,
      title: 'In Stock',
      value: productsResponse.summary.inStock,
      valueClassName: 'text-status-success',
    },
    {
      key: 'low-stock' as const,
      title: 'Low Stock',
      value: productsResponse.summary.lowStock,
      valueClassName: 'text-status-warning',
    },
    {
      key: 'out-of-stock' as const,
      title: 'Out of Stock',
      value: productsResponse.summary.outOfStock,
      valueClassName: 'text-status-error',
    },
  ];

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
        {statCards.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => openStatsModal(stat.key)}
            className="w-full text-left"
            aria-haspopup="dialog"
          >
            <Card className="p-4 h-full transition-colors hover:bg-elevated/30 hover:border-accent-blue/30">
              <p className="text-sm text-muted font-medium">{stat.title}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.valueClassName}`}>
                {stat.value}
              </p>
            </Card>
          </button>
        ))}
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
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="bg-background border border-subtle/50 rounded-lg py-2 px-4 text-sm text-primary focus:outline-none focus:border-accent-blue transition-colors w-full sm:w-auto"
        >
          <option>All Categories</option>
          <option>Laptops</option>
          <option>Accessories</option>
        </select>
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
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        {product.discountPrice ? (
                          <>
                            <span className="text-sm font-medium text-primary">
                              {formatCurrency(product.discountPrice)}
                            </span>
                            <span className="text-xs text-muted line-through">
                              {formatCurrency(product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm font-medium ${
                          product.stock === 0
                            ? 'text-status-error'
                            : product.stock < LOW_STOCK_THRESHOLD
                            ? 'text-status-warning'
                            : 'text-primary'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4">{getStockBadge(product)}</td>
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

      <AnimatePresence>
        {isStatsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-subtle/30 bg-surface shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-subtle/30">
                <div>
                  <h2 className="text-xl font-bold text-primary">
                    {getStatModalTitle(selectedStatFilter)}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Showing {statProducts.length} product{statProducts.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeStatsModal}
                  className="p-2 rounded-lg text-muted hover:text-primary hover:bg-elevated transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[calc(85vh-84px)] overflow-y-auto custom-scrollbar p-6 space-y-4">
                {isStatsLoading && (
                  <div className="py-12 text-center text-muted">Loading products...</div>
                )}

                {!isStatsLoading && statProducts.length === 0 && (
                  <div className="py-12 text-center text-muted">
                    No products match this status right now.
                  </div>
                )}

                {!isStatsLoading &&
                  statProducts.map((product) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-16 h-16 rounded-xl bg-background border border-subtle/30 overflow-hidden flex-shrink-0">
                            <img
                              src={product.images[0] ?? ''}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-primary line-clamp-1">
                              {product.name}
                            </p>
                            <p className="text-sm text-muted">{product.brand}</p>
                            <p className="text-sm text-body mt-1">{product.category}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2">
                          <div className="text-sm font-medium text-primary">
                            {product.discountPrice ? formatCurrency(product.discountPrice) : formatCurrency(product.price)}
                          </div>
                          <div className="text-sm text-body">Stock: {product.stock}</div>
                          {getStockBadge(product)}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

