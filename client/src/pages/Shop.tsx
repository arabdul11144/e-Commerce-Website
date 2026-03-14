import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, ChevronDown, Check } from 'lucide-react';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { getErrorMessage } from '../lib/api';
import { fetchProducts } from '../lib/products';
import {
  getCategoryLabel,
  isBestDealProduct,
  matchesProductCategory,
  normalizeCategoryValue,
} from '../utils/product';
import { Button } from '../components/ui/Button';

type SortOption =
  | 'featured'
  | 'newest'
  | 'price_low_high'
  | 'price_high_low'
  | 'top_rated';

function parsePriceInput(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const normalizedCategory = normalizeCategoryValue(categoryParam);
  const dealsParam = searchParams.get('deals');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetchProducts()
      .then((response) => {
        if (!isCancelled) {
          setProducts(response);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setProducts([]);
          console.error(getErrorMessage(error));
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
  }, []);

  const brands = Array.from(new Set(products.map((product) => product.brand))).filter(Boolean);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((currentBrands) =>
      currentBrands.includes(brand)
        ? currentBrands.filter((currentBrand) => currentBrand !== brand)
        : [...currentBrands, brand]
    );
  };

  const filteredProducts = useMemo(() => {
    const minPrice = parsePriceInput(minPriceInput);
    const maxPrice = parsePriceInput(maxPriceInput);

    const result = products.filter((product) => {
      if (dealsParam === 'true' && !isBestDealProduct(product)) {
        return false;
      }

      if (!matchesProductCategory(product, categoryParam)) {
        return false;
      }

      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
        return false;
      }

      const productPrice = product.discountPrice ?? product.price;

      if (minPrice !== undefined && productPrice < minPrice) {
        return false;
      }

      if (maxPrice !== undefined && productPrice > maxPrice) {
        return false;
      }

      return true;
    });

    const sorted = [...result];

    switch (sortBy) {
      case 'newest':
        return sorted.reverse();

      case 'price_low_high':
        return sorted.sort(
          (a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price)
        );

      case 'price_high_low':
        return sorted.sort(
          (a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price)
        );

      case 'top_rated':
        return sorted.sort((a, b) => b.rating - a.rating);

      case 'featured':
      default:
        return sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    }
  }, [categoryParam, dealsParam, maxPriceInput, minPriceInput, products, selectedBrands, sortBy]);

  const clearFilters = () => {
    setSelectedBrands([]);
    setMinPriceInput('');
    setMaxPriceInput('');
    setSortBy('featured');
    setSearchParams({});
  };

  const pageTitle = dealsParam === 'true' ? 'Best Deals' : getCategoryLabel(normalizedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4 capitalize">
          {pageTitle}
        </h1>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-body">Showing {filteredProducts.length} results</p>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              className="lg:hidden flex-1 sm:flex-none"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filters
            </Button>

            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="w-full appearance-none bg-surface border border-subtle/50 rounded-lg py-2 pl-4 pr-10 text-sm text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
                <option value="top_rated">Top Rated</option>
              </select>

              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <motion.aside
          className={`lg:w-64 flex-shrink-0 ${
            showFilters ? 'block' : 'hidden lg:block'
          }`}
          initial={false}
          animate={{ height: showFilters ? 'auto' : undefined }}
        >
          <div className="bg-surface border border-subtle/30 rounded-xl p-6 sticky top-24">
            <div className="mb-8">
              <h3 className="text-primary font-semibold mb-4">Categories</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/shop"
                    className={`text-sm ${
                      !normalizedCategory
                        ? 'text-accent-gold font-medium'
                        : 'text-body hover:text-primary'
                    }`}
                  >
                    All Products
                  </Link>
                </li>

                <li>
                  <Link
                    to="/shop?category=laptops"
                    className={`text-sm ${
                      normalizedCategory === 'laptops'
                        ? 'text-accent-gold font-medium'
                        : 'text-body hover:text-primary'
                    }`}
                  >
                    Laptops
                  </Link>
                </li>

                <li>
                  <Link
                    to="/shop?category=accessories"
                    className={`text-sm ${
                      normalizedCategory === 'accessories'
                        ? 'text-accent-gold font-medium'
                        : 'text-body hover:text-primary'
                    }`}
                  >
                    Accessories
                  </Link>
                </li>
              </ul>
            </div>

            <div className="mb-8">
              <h3 className="text-primary font-semibold mb-4">Brands</h3>
              <div className="space-y-3">
                {brands.map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="sr-only"
                    />

                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedBrands.includes(brand)
                          ? 'bg-accent-blue border-accent-blue'
                          : 'border-subtle group-hover:border-muted'
                      }`}
                    >
                      {selectedBrands.includes(brand) && (
                        <Check className="w-3 h-3 text-background" />
                      )}
                    </div>

                    <span className="text-sm text-body group-hover:text-primary transition-colors">
                      {brand}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-primary font-semibold mb-4">Price Range</h3>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-xs text-muted mb-1 block">Min</span>
                  <input
                    type="number"
                    value={minPriceInput}
                    onChange={(event) => setMinPriceInput(event.target.value)}
                    className="w-full bg-background border border-subtle/50 rounded-md py-1.5 px-3 text-sm text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div className="flex-1">
                  <span className="text-xs text-muted mb-1 block">Max</span>
                  <input
                    type="number"
                    value={maxPriceInput}
                    onChange={(event) => setMaxPriceInput(event.target.value)}
                    className="w-full bg-background border border-subtle/50 rounded-md py-1.5 px-3 text-sm text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-6 justify-center"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            </div>
          </div>
        </motion.aside>

        <div className="flex-1">
          {isLoading ? (
            <div className="text-center py-20 bg-surface border border-subtle/30 rounded-xl">
              <p className="text-body">Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-surface border border-subtle/30 rounded-xl">
              <h3 className="text-xl font-semibold text-primary mb-2">
                No products found
              </h3>
              <p className="text-body mb-6">
                Try adjusting your filters or search criteria.
              </p>
              <Button onClick={clearFilters}>Clear all filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
