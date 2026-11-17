import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  Send,
  ArrowRight,
  Truck,
  Sparkles,
  Image as ImageIcon,
  Gift,
  Crown,
  Flame,
  Plus,
  Check,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { CartItem, OrderCustomerInfo, Product, CustomizationData } from '../types';
import {
  STORE_CONFIG,
  formatPrice,
  CART_REWARD_TIERS,
  CART_PROMO_PRODUCTS,
  type CartPromoProduct,
  INITIAL_PRODUCTS,
} from '../data/products';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onAddToCart?: (product: Product, customization: CustomizationData, quantity: number) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToCart,
}) => {
  useModalBehavior(isOpen, onClose);

  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [customerInfo, setCustomerInfo] = useState<OrderCustomerInfo>({
    name: '',
    phone: '',
    city: '',
    address: '',
    notes: '',
  });

  const [addedPromoId, setAddedPromoId] = useState<string | null>(null);

  // Subtotal calculation
  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // Reward Tiers thresholds
  const FREE_SHIPPING_THRESHOLD = STORE_CONFIG.freeShippingThreshold;
  const GIFT_TIER_1_THRESHOLD = CART_REWARD_TIERS[1].threshold;
  const GIFT_TIER_2_THRESHOLD = CART_REWARD_TIERS[2].threshold;

  const isTier1Unlocked = subtotal >= FREE_SHIPPING_THRESHOLD; // Envío Gratis
  const isTier2Unlocked = subtotal >= GIFT_TIER_1_THRESHOLD; // Llavero de Regalo
  const isTier3Unlocked = subtotal >= GIFT_TIER_2_THRESHOLD; // Caja Regalo VIP

  const unlockedCount = (isTier1Unlocked ? 1 : 0) + (isTier2Unlocked ? 1 : 0) + (isTier3Unlocked ? 1 : 0);
  const prevUnlockedRef = useRef<number>(unlockedCount);

  // Confetti when crossing a milestone tier
  useEffect(() => {
    if (isOpen && unlockedCount > prevUnlockedRef.current) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.25 },
      });
    }
    prevUnlockedRef.current = unlockedCount;
  }, [unlockedCount, isOpen]);

  // Progress percentage (max milestone is 260k)
  const maxMilestone = GIFT_TIER_2_THRESHOLD;
  const progressPercentage = Math.min(100, Math.max(0, (subtotal / maxMilestone) * 100));

  // Handle adding promotional items from cart
  const handleAddPromoItem = (promo: CartPromoProduct) => {
    if (!onAddToCart) return;

    const base = INITIAL_PRODUCTS.find((p) => p.id === promo.baseProductId);
    const promoProduct: Product = {
      ...(base || {
        id: promo.baseProductId,
        category: 'regalos',
        features: [promo.tagline],
        mockupType: 'puzzle',
        rating: 5.0,
        reviewsCount: 50,
      }),
      id: promo.baseProductId,
      name: promo.name,
      price: promo.promoPrice,
      originalPrice: promo.originalPrice,
      image: promo.image,
      badge: promo.badge,
      description: promo.tagline,
    };

    const customization: CustomizationData = {
      uploadedImage: null,
      customText: '',
      textColor: '#000000',
      fontFamily: 'Plus Jakarta Sans',
      notes: `Promo Carrito (${promo.badge}) · Personalización a coordinar por WhatsApp`,
    };

    onAddToCart(promoProduct, customization, 1);

    setAddedPromoId(promo.id);
    setTimeout(() => {
      setAddedPromoId(null);
    }, 2000);
  };

  const handleCheckoutWhatsApp = () => {
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      alert('Por favor completa al menos tu nombre y teléfono para procesar el pedido.');
      return;
    }

    // Celebratory confetti
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });

    // Format WhatsApp order message
    let message = `🛍️ *¡NUEVO PEDIDO EN ${STORE_CONFIG.storeName.toUpperCase()}!* 🛍️\n`;
    message += `🌐 _Vía ${STORE_CONFIG.domain}_\n\n`;
    message += `👤 *DATOS DEL CLIENTE:*\n`;
    message += `• *Nombre:* ${customerInfo.name}\n`;
    message += `• *Teléfono:* ${customerInfo.phone}\n`;
    if (customerInfo.city) message += `• *Ciudad:* ${customerInfo.city}\n`;
    if (customerInfo.address) message += `• *Dirección de Entrega:* ${customerInfo.address}\n`;
    if (customerInfo.notes) message += `• *Notas:* ${customerInfo.notes}\n`;

    message += `\n📦 *DETALLE DE PRODUCTOS:*\n`;
    items.forEach((item, index) => {
      message += `\n*${index + 1}. ${item.quantity}x ${item.product.name}*\n`;
      if (item.customization.selectedColor) {
        message += `   • Color: ${item.customization.selectedColor.name}\n`;
      }
      if (item.customization.selectedSize) {
        message += `   • Talla: ${item.customization.selectedSize}\n`;
      }
      if (item.customization.customText) {
        message += `   • Texto Personalizado: "${item.customization.customText}"\n`;
      }
      if (item.customization.uploadedImage) {
        message += `   • 📸 *Foto cargada:* (Te la adjunto en este chat a continuación)\n`;
      } else {
        message += `   • Foto / Diseño: (La enviaré directamente por aquí)\n`;
      }
      if (item.customization.notes) {
        message += `   • Instrucciones: ${item.customization.notes}\n`;
      }
      message += `   • Subtotal: ${formatPrice(item.product.price * item.quantity)}\n`;
    });

    // Append unlocked rewards to WhatsApp message
    if (isTier1Unlocked || isTier2Unlocked || isTier3Unlocked) {
      message += `\n🎁 *BENEFICIOS Y REGALOS DESBLOQUEADOS:* \n`;
      if (isTier1Unlocked) {
        message += `   🚚 *Envío Nacional:* ¡GRATIS A TODA COLOMBIA! ($0 COP)\n`;
      }
      if (isTier2Unlocked) {
        message += `   🎁 *Regalo Nivel 2:* Llavero Personalizado con Foto/Frase ($0 GRATIS)\n`;
      }
      if (isTier3Unlocked) {
        message += `   👑 *Regalo VIP Nivel 3:* Caja de Regalo Decorada de Lujo + Tarjeta Especial ($0 GRATIS)\n`;
      }
    }

    message += `\n--------------------------------\n`;
    message += `💰 *SUBTOTAL PRODUCTOS:* ${formatPrice(subtotal)} ${STORE_CONFIG.currencyCode}\n`;
    message += `🚚 *ENVÍO:* ${isTier1Unlocked ? '¡GRATIS! ($0 COP)' : 'A coordinar por WhatsApp'}\n`;
    message += `💳 *TOTAL GENERAL:* ${formatPrice(subtotal)} ${STORE_CONFIG.currencyCode}\n`;
    message += `--------------------------------\n\n`;
    message += `¡Hola! Acabo de armar mi pedido en la tienda web ${STORE_CONFIG.domain}. ¿Me confirmas los métodos de pago y el tiempo de entrega? 😊`;

    const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/60 via-pink-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shadow-sm border border-purple-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-slate-900">
                {step === 'cart' ? 'Tu Carrito' : 'Finalizar Pedido'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && step === 'cart' && (
              <button
                onClick={onClearCart}
                className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors mr-2"
              >
                Vaciar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar carrito"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* GAMIFIED REWARD MILESTONES & FREE SHIPPING BAR */}
        {items.length > 0 && (
          <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-b from-purple-50/80 via-pink-50/50 to-white border-b border-purple-100 shadow-sm">
            {/* Dynamic Motivation Message */}
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-800 leading-tight">
                {!isTier1Unlocked ? (
                  <>
                    <Truck className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>
                      Te faltan <strong className="text-purple-700">{formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}</strong> para <strong className="text-purple-900">Envío Gratis</strong>
                    </span>
                  </>
                ) : !isTier2Unlocked ? (
                  <>
                    <Gift className="w-4 h-4 text-pink-600 shrink-0 animate-bounce" />
                    <span>
                      🎉 ¡Envío Gratis listo! Faltan <strong className="text-pink-600">{formatPrice(GIFT_TIER_1_THRESHOLD - subtotal)}</strong> para tu <strong className="text-pink-700">Llavero Gratis</strong> 🎁
                    </span>
                  </>
                ) : !isTier3Unlocked ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                    <span>
                      🎁 ¡Llavero listo! Faltan <strong className="text-amber-600">{formatPrice(GIFT_TIER_2_THRESHOLD - subtotal)}</strong> para la <strong className="text-amber-700">Caja de Regalo VIP</strong> 👑
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
                    <span className="text-purple-950 font-black">
                      🌟 ¡Máximo Nivel! Envío Gratis + Todos los Regalos VIP incluidos ✨
                    </span>
                  </>
                )}
              </span>

              <span className="text-[11px] font-black text-purple-900 shrink-0 ml-2">
                {formatPrice(subtotal)}
              </span>
            </div>

            {/* Stepped Milestone Track */}
            <div className="relative w-full h-2.5 bg-purple-100/80 rounded-full overflow-hidden mb-3.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 transition-all duration-700 ease-out rounded-full shadow-sm"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* 3 Milestone Badges */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {/* Milestone 1: Envío Gratis ($150k) */}
              <div
                className={`p-1.5 rounded-xl border text-center transition-all ${
                  isTier1Unlocked
                    ? 'bg-purple-100/90 border-purple-300 text-purple-950 font-extrabold shadow-xs'
                    : 'bg-white/80 border-slate-200 text-slate-500 opacity-75'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  <Truck className={`w-3 h-3 ${isTier1Unlocked ? 'text-purple-700' : 'text-slate-400'}`} />
                  <span>Envío Gratis</span>
                  {isTier1Unlocked && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold">$150.000</div>
              </div>

              {/* Milestone 2: Llavero de Regalo ($200k) */}
              <div
                className={`p-1.5 rounded-xl border text-center transition-all ${
                  isTier2Unlocked
                    ? 'bg-pink-100/90 border-pink-300 text-pink-950 font-extrabold shadow-xs'
                    : 'bg-white/80 border-slate-200 text-slate-500 opacity-75'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  <Gift className={`w-3 h-3 ${isTier2Unlocked ? 'text-pink-600' : 'text-slate-400'}`} />
                  <span>Llavero Gratis</span>
                  {isTier2Unlocked && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold">$200.000</div>
              </div>

              {/* Milestone 3: Caja Regalo VIP ($260k) */}
              <div
                className={`p-1.5 rounded-xl border text-center transition-all ${
                  isTier3Unlocked
                    ? 'bg-amber-100/90 border-amber-300 text-amber-950 font-extrabold shadow-xs'
                    : 'bg-white/80 border-slate-200 text-slate-500 opacity-75'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  <Crown className={`w-3 h-3 ${isTier3Unlocked ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>Caja VIP</span>
                  {isTier3Unlocked && <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold">$260.000</div>
              </div>
            </div>

            {/* Active Unlocked Rewards Pill Strip */}
            {(isTier1Unlocked || isTier2Unlocked || isTier3Unlocked) && (
              <div className="mt-2.5 pt-2 border-t border-purple-100/90 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-purple-900 tracking-wider">
                  Desbloqueado:
                </span>
                {isTier1Unlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Envío Nacional Gratis</span>
                  </span>
                )}
                {isTier2Unlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-extrabold border border-pink-200">
                    <Check className="w-2.5 h-2.5 text-pink-600" />
                    <span>Llavero Regalo ($0)</span>
                  </span>
                )}
                {isTier3Unlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold border border-amber-300">
                    <Crown className="w-2.5 h-2.5 text-amber-600" />
                    <span>Caja Regalo VIP ($0)</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 rounded-full bg-purple-50 text-purple-400 flex items-center justify-center border-2 border-purple-100">
                <ShoppingBag className="w-10 h-10 text-purple-600" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-slate-800">
                  Tu carrito está vacío
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Agrega productos para desbloquear <strong>Envío Gratis desde $150.000</strong> y <strong>regalos sorpresa exclusivos</strong>.
                </p>
              </div>

              {/* Promotional teaser for empty cart */}
              <div className="w-full pt-4 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                  <h4 className="font-heading font-extrabold text-xs text-purple-950 uppercase tracking-wider">
                    Productos recomendados en promoción:
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {CART_PROMO_PRODUCTS.slice(0, 2).map((promo) => (
                    <div
                      key={promo.id}
                      className="p-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/40 to-white flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={promo.image}
                          alt={promo.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-purple-100"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{promo.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-extrabold text-xs text-purple-900">
                              {formatPrice(promo.promoPrice)}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatPrice(promo.originalPrice)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddPromoItem(promo)}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-800 to-pink-600 hover:from-purple-900 hover:to-pink-700 text-white font-extrabold text-[11px] shrink-0 shadow-sm transition-all active:scale-95"
                      >
                        + Agregar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full bg-white border-2 border-purple-200 text-purple-900 font-extrabold text-xs sm:text-sm hover:bg-purple-50 shadow-sm"
              >
                Explorar Catálogo Completo
              </button>
            </div>
          ) : step === 'cart' ? (
            <>
              {/* CART ITEMS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                    Artículos en tu orden ({items.length})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Personalización incluida</span>
                </div>

                {items.map((item) => {
                  const hasDiscount = item.product.originalPrice && item.product.originalPrice > item.product.price;
                  const isCartPromo = item.customization.notes?.includes('Promo Carrito');

                  return (
                    <div
                      key={item.cartItemId}
                      className="p-3.5 rounded-2xl border-2 border-purple-100/90 bg-white hover:border-pink-300 transition-all flex gap-3 shadow-sm relative group"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 relative shrink-0 border border-purple-100 flex items-center justify-center p-1">
                        <img
                          src={item.customization.uploadedImage || item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                        {item.customization.uploadedImage && (
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[8px] font-bold py-0.5 text-center flex items-center justify-center gap-0.5">
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>Foto</span>
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {item.product.name}
                              </h4>
                              {isCartPromo && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-pink-100 text-pink-700 text-[10px] font-extrabold mt-0.5">
                                  <Tag className="w-2.5 h-2.5" />
                                  <span>Promo de Carrito</span>
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => onRemoveItem(item.cartItemId)}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                              aria-label="Eliminar del carrito"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Customization specs chips */}
                          <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-slate-500">
                            {item.customization.selectedColor && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-medium border border-purple-100">
                                Color: {item.customization.selectedColor.name}
                              </span>
                            )}
                            {item.customization.selectedSize && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-medium border border-purple-100">
                                Talla: {item.customization.selectedSize}
                              </span>
                            )}
                            {item.customization.customText && (
                              <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 font-medium truncate max-w-[150px] border border-pink-100">
                                &ldquo;{item.customization.customText}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity & Item Subtotal */}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                          <div className="flex items-center border border-purple-200 rounded-lg overflow-hidden bg-purple-50/50">
                            <button
                              onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                              aria-label="Disminuir cantidad"
                              className="px-2 py-0.5 text-xs text-slate-700 hover:bg-purple-200 font-bold transition-colors"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-bold text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.cartItemId, Math.min(99, item.quantity + 1))}
                              aria-label="Aumentar cantidad"
                              className="px-2 py-0.5 text-xs text-slate-700 hover:bg-purple-200 font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="font-heading font-black text-sm text-slate-900">
                              {formatPrice(item.product.price * item.quantity)}
                            </div>
                            {hasDiscount && (
                              <div className="text-[10px] text-slate-400 line-through">
                                {formatPrice((item.product.originalPrice || 0) * item.quantity)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CROSS-SELLING PROMOTIONAL PRODUCTS IN CART */}
              <div className="pt-2">
                <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50/60 to-purple-50 border-2 border-purple-200/90 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                      <h4 className="font-heading font-extrabold text-xs sm:text-sm text-purple-950">
                        Ofertas Especiales para tu Pedido
                      </h4>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-600 text-white shadow-xs">
                      Descuento en Carrito
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mb-3.5 leading-snug">
                    Añade un detalle extra para alguien especial y acércate a <strong>Envío Gratis ($150k)</strong> y <strong>regalos sorpresa</strong>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CART_PROMO_PRODUCTS.map((promo) => {
                      const isItemAdded = addedPromoId === promo.id;

                      return (
                        <div
                          key={promo.id}
                          className="bg-white/95 rounded-2xl p-2.5 border border-purple-200/80 hover:border-pink-400 transition-all shadow-xs flex flex-col justify-between"
                        >
                          <div className="flex gap-2.5 items-start">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-purple-100">
                              <img
                                src={promo.image}
                                alt={promo.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="inline-block text-[9px] font-black uppercase tracking-wider text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200/60 mb-0.5">
                                {promo.badge}
                              </span>
                              <h5 className="font-bold text-xs text-slate-900 leading-tight line-clamp-1">
                                {promo.name}
                              </h5>
                              <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="font-black text-xs text-purple-900">
                                  {formatPrice(promo.promoPrice)}
                                </span>
                                <span className="text-[10px] text-slate-400 line-through">
                                  {formatPrice(promo.originalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddPromoItem(promo)}
                            className={`w-full mt-2 py-1.5 px-3 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                              isItemAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gradient-to-r from-purple-800 via-pink-700 to-purple-800 hover:from-purple-900 hover:to-pink-800 text-white'
                            }`}
                          >
                            {isItemAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>¡Añadido con Descuento!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Agregar por {formatPrice(promo.promoPrice)}</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* CHECKOUT STEP FORM */
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-pink-500 shrink-0" />
                <p className="text-xs text-purple-950 leading-tight">
                  Ingresa tus datos de entrega para generar tu orden oficial lista para enviar a WhatsApp con todos tus beneficios y regalos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  placeholder="Ej: Laura Gómez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp o Teléfono de contacto *
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  required
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  placeholder="Ej: +57 312 345 6789"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ciudad de Entrega
                  </label>
                  <input
                    type="text"
                    autoComplete="address-level2"
                    enterKeyHint="next"
                    value={customerInfo.city}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                    placeholder="Pereira, Armenia, Bogotá..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    autoComplete="street-address"
                    enterKeyHint="next"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="Calle, Barrio, Casa..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Indicaciones adicionales o dedicatoria
                </label>
                <textarea
                  value={customerInfo.notes}
                  autoComplete="off"
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Ej: Empacar para regalo, nombre que va en la dedicatoria, fecha especial..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Order Benefits Recap in Checkout Form */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 space-y-1.5 text-xs text-slate-700">
                <div className="font-extrabold text-purple-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Beneficios aplicados a tu pedido:</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Flete Nacional:</span>
                  <span className={isTier1Unlocked ? 'font-black text-emerald-600' : 'text-slate-600'}>
                    {isTier1Unlocked ? '¡ENVÍO GRATIS! ($0)' : 'A coordinar'}
                  </span>
                </div>
                {isTier2Unlocked && (
                  <div className="flex items-center justify-between text-[11px] text-pink-700 font-bold">
                    <span>Regalo Nivel 2:</span>
                    <span>Llavero Personalizado ($0)</span>
                  </div>
                )}
                {isTier3Unlocked && (
                  <div className="flex items-center justify-between text-[11px] text-amber-700 font-bold">
                    <span>Regalo VIP Nivel 3:</span>
                    <span>Caja Regalo Decorada ($0)</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">🔒 Métodos de pago al confirmar por WhatsApp:</p>
                <p>Transferencias por Nequi, Daviplata, Bancolombia, PSE o Tarjetas.</p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER TOTALS & CTA */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-purple-100 bg-white space-y-3 shadow-lg">
            {/* Totals Breakdown */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)} items):</span>
                <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>Envío a Toda Colombia:</span>
                {isTier1Unlocked ? (
                  <span className="text-emerald-600 font-black flex items-center gap-1">
                    <span>¡GRATIS!</span>
                    <span className="line-through text-slate-400 font-normal text-[10px]">$15.000</span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">
                    A coordinar (¡Gratis desde $150.000!)
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="font-heading font-extrabold text-base sm:text-lg text-slate-900 block">
                    Total a Pagar:
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">IVA y personalización incluidos</span>
                </div>
                <div className="text-right">
                  <span className="font-heading font-black text-2xl sm:text-3xl text-purple-950">
                    {formatPrice(subtotal)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">COP</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-800 via-pink-600 to-purple-800 hover:from-purple-900 hover:via-pink-700 hover:to-purple-900 text-white font-black text-sm sm:text-base shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Continuar al Pedido</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCheckoutWhatsApp}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-800 via-pink-600 to-purple-800 hover:from-purple-900 hover:via-pink-700 hover:to-purple-900 text-white font-black text-sm sm:text-base shadow-xl shadow-purple-900/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-5 h-5 text-yellow-300" />
                  <span>Enviar Pedido a WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-purple-900 text-center transition-colors"
                >
                  ← Volver a modificar productos
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
