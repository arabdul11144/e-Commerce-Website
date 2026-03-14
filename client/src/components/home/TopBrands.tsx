import { motion } from 'framer-motion';

const brandLogos = [
  { id: 'apple', name: 'Apple', src: '/logo/apple.png', panelClassName: 'bg-white' },
  { id: 'asus', name: 'ASUS', src: '/logo/asus.png', panelClassName: 'bg-[#eef1f5]' },
  { id: 'dell', name: 'Dell', src: '/logo/dell.png', panelClassName: 'bg-[#eef7ff]' },
  { id: 'lenovo', name: 'Lenovo', src: '/logo/lenovo.png', panelClassName: 'bg-[#f4f4f4]' },
  { id: 'logitech', name: 'Logitech', src: '/logo/logitech.png', panelClassName: 'bg-[#f3f5ff]' },
  { id: 'razer', name: 'Razer', src: '/logo/razer.png', panelClassName: 'bg-[#111814]' },
  { id: 'samsung', name: 'Samsung', src: '/logo/samsung.png', panelClassName: 'bg-[#eef4ff]' },
  { id: 'sony', name: 'Sony', src: '/logo/sony.png', panelClassName: 'bg-[#f5f5f5]' },
];

export function TopBrands() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-primary mb-2">
          Trusted by Top Brands
        </h2>
        <p className="text-body">We partner with the best in the industry.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {brandLogos.map((brand, i) => (
          <motion.div
            key={brand.id}
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
              delay: i * 0.05,
            }}
            className="bg-surface border border-subtle/20 rounded-xl p-6 flex flex-col items-center gap-4 hover:border-subtle/60 hover:bg-elevated transition-colors"
          >
            <div
              className={`h-24 w-full rounded-xl border border-subtle/10 overflow-hidden flex items-center justify-center px-4 ${brand.panelClassName}`}
            >
              <img
                src={brand.src}
                alt={`${brand.name} logo`}
                className="max-h-12 w-auto max-w-full object-contain"
              />
            </div>
            <span className="text-primary font-medium text-center">{brand.name}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
