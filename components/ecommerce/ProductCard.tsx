import React from 'react';
import { ShoppingCart, Heart, Star, Plus, Minus } from 'lucide-react';
import { Product } from '../../types';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  isInWishlist?: boolean;
  isInCart?: boolean;
  cartQuantity?: number;
  onUpdateCartQuantity?: (productId: string, delta: number) => void;
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(({
  product,
  onAddToCart,
  onAddToWishlist,
  onViewDetails,
  isInWishlist,
  isInCart,
  cartQuantity,
  onUpdateCartQuantity
}, ref) => {
  return (
    <motion.div 
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img 
          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/400`} 
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-white/90 backdrop-blur-md text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
            {product.category}
          </span>
          {product.stock < 5 && product.stock > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/20">
              Low Stock
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
              Out of Stock
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-500">
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToWishlist(product); }}
            className={`p-3 rounded-2xl shadow-xl backdrop-blur-md transition-all ${isInWishlist ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-400 hover:text-rose-500'}`}
          >
            <Heart size={18} fill={isInWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* View Details Overlay */}
        <div 
          onClick={() => onViewDetails(product)}
          className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        />
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={10} className="fill-amber-400 text-amber-400 sm:w-3 sm:h-3" />
          ))}
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 ml-1">(4.8)</span>
        </div>

        <h3 
          onClick={() => onViewDetails(product)}
          className="font-black text-slate-800 text-base sm:text-lg leading-tight mb-1.5 sm:mb-2 hover:text-primary cursor-pointer transition-colors line-clamp-1"
        >
          {product.name}
        </h3>
        
        <p className="text-slate-400 text-[10px] sm:text-xs font-medium mb-3 sm:mb-4 line-clamp-2 min-h-[1.5rem] sm:min-h-[2rem]">
          {product.description || 'সেরা মানের পণ্য এবং দ্রুত ডেলিভারি নিশ্চিত করছি।'}
        </p>

        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black text-primary tracking-tighter">
              ৳{(product.salePrice || 0).toLocaleString()}
            </span>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              প্রতি {product.unit || 'pcs'}
            </span>
          </div>

          {isInCart ? (
            <div className="flex items-center bg-slate-100 rounded-xl sm:rounded-2xl p-0.5 sm:p-1">
              <button 
                onClick={() => onUpdateCartQuantity?.(product.id, -1)}
                className="p-1 sm:p-2 hover:bg-white rounded-lg sm:rounded-xl text-slate-600 transition-colors"
              >
                <Minus size={14} className="sm:w-4 sm:h-4" />
              </button>
              <span className="w-6 sm:w-8 text-center font-black text-xs sm:text-sm text-slate-800">
                {cartQuantity}
              </span>
              <button 
                onClick={() => onUpdateCartQuantity?.(product.id, 1)}
                className="p-1 sm:p-2 hover:bg-white rounded-lg sm:rounded-xl text-slate-600 transition-colors"
              >
                <Plus size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              className="bg-primary text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default ProductCard;
