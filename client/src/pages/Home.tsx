import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Clock,
  HeadphonesIcon,
  ShoppingBag,
  CreditCard,
  Package,
} from 'lucide-react';
import type { Product } from '../types';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/ProductCard';
import { apiRequest, getErrorMessage } from '../lib/api';
import { normalizeProduct, formatCurrency } from '../utils/product';
import { AnnouncementBar } from '../components/home/AnnouncementBar';
import { TopBrands } from '../components/home/TopBrands';
import { BestDeals } from '../components/home/BestDeals';
import { Testimonials } from '../components/home/Testimonials';
import { Newsletter } from '../components/home/Newsletter';

function matchesCategory(product: Product, category: 'laptops' | 'accessories') {
  const normalizedCategory = product.category.toLowerCase();

  if (category === 'laptops') {
    return normalizedCategory.includes('laptop');
  }

  return normalizedCategory.includes('accessor');
}

const ALL_PRODUCTS_PAGE_SIZE = 128;

function HeroCommerceAnimation() {
  const shouldReduceMotion = useReducedMotion();

  const floatingTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      };

  return (
    <div aria-hidden="true" className="hidden lg:block relative">
      <div className="relative mx-auto w-full max-w-[460px] h-[520px]">
        <motion.div
          className="absolute inset-0 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -10, 0],
                }
          }
          transition={floatingTransition}
        />

        <motion.div
          className="absolute top-10 left-8 right-16 rounded-[2rem] border border-white/10 bg-[#11161d]/90 p-6 shadow-2xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, 12, 0],
                }
          }
          transition={{ ...floatingTransition, duration: 9 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent-blue/80">
                LapLab Cart
              </p>
              <h3 className="text-2xl font-bold text-primary mt-2">
                Smooth checkout flow
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent-gold/15 flex items-center justify-center text-accent-gold">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                name: 'MacBook Pro 16\"',
                meta: 'In cart',
                price: formatCurrency(3499),
              },
              {
                name: 'Sony WH-1000XM5',
                meta: 'Best deal',
                price: formatCurrency(299),
              },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{item.name}</p>
                  <p className="text-xs text-muted mt-1">{item.meta}</p>
                </div>
                <span className="text-sm font-semibold text-accent-gold">{item.price}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 p-4">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted">Checkout progress</span>
              <span className="text-accent-blue font-semibold">92%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-gold"
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.1, delay: 0.2 }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-24 right-0 w-48 rounded-[1.75rem] border border-white/10 bg-[#171d25]/90 p-5 shadow-2xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, -14, 0],
                }
          }
          transition={{ ...floatingTransition, duration: 7 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-accent-gold/15 flex items-center justify-center text-accent-gold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Secure payment</p>
              <p className="text-xs text-muted">Verified at every step</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 rounded-full bg-white/10" />
            <div className="h-3 w-4/5 rounded-full bg-white/10" />
            <div className="h-10 rounded-2xl bg-accent-gold/15 border border-accent-gold/25 flex items-center justify-center text-sm font-semibold text-accent-gold">
              Ready to order
            </div>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-16 left-0 w-52 rounded-[1.75rem] border border-white/10 bg-[#171d25]/90 p-5 shadow-2xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  y: [0, 10, 0],
                }
          }
          transition={{ ...floatingTransition, duration: 10 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-accent-blue/15 flex items-center justify-center text-accent-blue">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Fast dispatch</p>
              <p className="text-xs text-muted">Packed for Sri Lanka</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-body">
            <div className="flex items-center justify-between">
              <span>Order prep</span>
              <span className="text-accent-blue">Done</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment check</span>
              <span className="text-accent-blue">Done</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Delivery slot</span>
              <span className="text-accent-gold">Booked</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProductsPage, setAllProductsPage] = useState(1);

  useEffect(() => {
    let isCancelled = false;

    const fetchProducts = async () => {
      try {
        const response = await apiRequest<Product[]>('/api/products');

        if (!isCancelled) {
          setProducts(response.map((product) => normalizeProduct(product)));
        }
      } catch (error) {
        if (!isCancelled) {
          setProducts([]);
          console.error(getErrorMessage(error));
        }
      }
    };

    fetchProducts();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setAllProductsPage(1);
  }, [products.length]);

  const laptopProducts = useMemo(
    () => products.filter((product) => matchesCategory(product, 'laptops')),
    [products]
  );

  const accessoryProducts = useMemo(
    () => products.filter((product) => matchesCategory(product, 'accessories')),
    [products]
  );

  const allProductsTotalPages = Math.max(1, Math.ceil(products.length / ALL_PRODUCTS_PAGE_SIZE));
  const allProductsStartIndex = (allProductsPage - 1) * ALL_PRODUCTS_PAGE_SIZE;
  const visibleAllProducts = products.slice(
    allProductsStartIndex,
    allProductsStartIndex + ALL_PRODUCTS_PAGE_SIZE
  );

  const containerVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const serviceHighlights = [
    {
      icon: Truck,
      title: 'Free Shipping',
      desc: `On orders over ${formatCurrency(500)}`,
    },
    {
      icon: ShieldCheck,
      title: 'Secure Payment',
      desc: '100% secure checkout',
    },
    {
      icon: Clock,
      title: '30 Days Return',
      desc: 'No questions asked',
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 Support',
      desc: 'Dedicated premium support',
    },
  ];

  return (
    <>
      <AnnouncementBar />
      <div className="flex flex-col gap-24 pb-24">
        <section className="relative min-h-[600px] flex items-center overflow-hidden py-24 lg:py-12">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=2000"
              alt="Premium workspace"
              className="w-full h-full object-cover opacity-30"
            />

            <motion.div
              className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-accent-gold/10 blur-3xl"
              animate={{
                x: [0, 80, 0],
                y: [0, 40, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <motion.div
              className="absolute top-1/3 right-[-120px] w-[380px] h-[380px] rounded-full bg-accent-blue/10 blur-3xl"
              animate={{
                x: [0, -70, 0],
                y: [0, -30, 0],
                scale: [1, 1.12, 1],
              }}
              transition={{
                duration: 14,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <motion.div
              className="absolute bottom-[-120px] left-1/3 w-[320px] h-[320px] rounded-full bg-accent-gold/10 blur-3xl"
              animate={{
                x: [0, 50, 0],
                y: [0, -40, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 16,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_460px] gap-12 items-center">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 30,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.8,
                  ease: 'easeOut',
                }}
                className="max-w-2xl"
              >
                <h1 className="text-5xl md:text-7xl font-bold text-primary tracking-tight mb-6 leading-tight">
                  Power Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold to-accent-goldHover">
                    Potential.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-body mb-10 leading-relaxed max-w-xl">
                  Discover premium laptops and accessories engineered for
                  professionals, creators, and gamers who demand excellence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/shop?category=laptops">
                    <Button size="lg" className="w-full sm:w-auto text-base px-8">
                      Shop Laptops
                    </Button>
                  </Link>
                  <Link to="/shop?category=accessories">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto text-base px-8"
                    >
                      Explore Accessories
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <HeroCommerceAnimation />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-16">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
              ease: 'easeOut',
            }}
            className="rounded-[2rem] bg-white p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-white/60"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {serviceHighlights.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    delay: i * 0.1,
                  }}
                  whileHover={{
                    y: -6,
                    scale: 1.02,
                  }}
                  className="flex flex-col items-center text-center p-6 rounded-2xl bg-yellow-400 border border-yellow-300 shadow-md"
                >
                  <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center text-gray-900 mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-800">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <BestDeals products={products} withinContainer />
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">Laptops</h2>
              <p className="text-body">
                Premium machines for ultimate performance.
              </p>
            </div>
            <Link
              to="/shop?category=laptops"
              className="hidden sm:flex items-center text-accent-blue hover:text-accent-blueHover font-medium transition-colors"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {laptopProducts.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                margin: '-100px',
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {laptopProducts.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-subtle/30 bg-surface p-8 text-center text-muted">
              Laptop products will appear here when they are available.
            </div>
          )}
        </section>


        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">
                Accessories
              </h2>
              <p className="text-body">
                Complete your setup with premium gear.
              </p>
            </div>
            <Link
              to="/shop?category=accessories"
              className="hidden sm:flex items-center text-accent-blue hover:text-accent-blueHover font-medium transition-colors"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {accessoryProducts.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                margin: '-100px',
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {accessoryProducts.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-subtle/30 bg-surface p-8 text-center text-muted">
              Accessory products will appear here when they are available.
            </div>
          )}
        </section>


        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">All Products</h2>
              <p className="text-body">
                Browse every customer-visible product currently available.
              </p>
            </div>
            <Link
              to="/shop"
              className="hidden sm:flex items-center text-accent-blue hover:text-accent-blueHover font-medium transition-colors"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {visibleAllProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleAllProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {allProductsTotalPages > 1 && (
                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-body">
                    Showing {allProductsStartIndex + 1}-{allProductsStartIndex + visibleAllProducts.length} of {products.length} products
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setAllProductsPage((currentPage) => Math.max(1, currentPage - 1))}
                      disabled={allProductsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-body">
                      Page {allProductsPage} of {allProductsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setAllProductsPage((currentPage) =>
                          Math.min(allProductsTotalPages, currentPage + 1)
                        )
                      }
                      disabled={allProductsPage === allProductsTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-subtle/30 bg-surface p-8 text-center text-muted">
              Products will appear here when they are available.
            </div>
          )}
        </section>
        <TopBrands />

        <Testimonials />
        <Newsletter />
      </div>
    </>
  );
}




