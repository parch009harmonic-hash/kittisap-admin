"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { AppLocale } from "../../../lib/i18n/locale";
import {
  getPublicCart,
  removePublicCartItem,
  savePublicCart,
  sumPublicCart,
  type PublicCartItem,
  updatePublicCartItemQty,
} from "../../../lib/storefront/cart";

type CheckoutClientProps = {
  initialOrderNo: string;
  initialPromptpayUrl: string;
  initialSelectedIds?: string[];
  locale?: AppLocale;
  useLocalePrefix?: boolean;
};

type ProfilePayload = {
  ok?: boolean;
  data?: {
    full_name?: string;
    phone?: string;
    address?: string;
  } | null;
};

type CreateOrderPayload = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    order_no?: string;
    promptpay_url?: string;
    final_amount?: number;
  };
};

type CouponPayload = {
  ok?: boolean;
  error?: string;
  data?: {
    code: string;
    discount_amount: number;
    final_amount: number;
    discount_type: "percent" | "fixed";
  };
};

type OrderDetailPayload = {
  ok?: boolean;
  error?: string;
  data?: {
    order_no?: string;
    grand_total?: number;
    status?: string;
    payment_status?: string;
    customer_full_name?: string;
    customer_phone?: string;
    shipping_address?: string;
    items?: Array<{
      product_id: string;
      title: string;
      price: number;
      qty: number;
      line_total: number;
    }>;
  };
};

function t(locale: AppLocale) {
  if (locale === "th") {
    return {
      title: "Checkout",
      subtitle: "ชำระเงินผ่าน PromptPay และอัปโหลดสลิป",
      cart: "ตะกร้า",
      checkout: "ชำระเงิน",
      paid: "ชำระแล้ว",
      shipping: "ข้อมูลจัดส่ง",
      selectedItems: "รายการที่เลือก",
      selectAll: "เลือกทั้งหมด",
      selectedCount: "รายการที่เลือก",
      summary: "สรุปคำสั่งซื้อ",
      coupon: "คูปองส่วนลด",
      promptpay: "ชำระผ่าน PromptPay",
      fullName: "ชื่อ-นามสกุล",
      address: "ที่อยู่จัดส่ง",
      phone: "เบอร์โทร",
      note: "หมายเหตุ",
      couponCode: "โค้ดคูปอง",
      applyCoupon: "ใช้คูปอง",
      couponApplied: "ใช้คูปองสำเร็จ",
      createOrder: "สร้างคำสั่งซื้อ",
      creating: "กำลังสร้างคำสั่งซื้อ...",
      orderNo: "เลขออเดอร์",
      amount: "ยอดชำระ",
      copyAmount: "คัดลอกยอด",
      copying: "กำลังคัดลอก...",
      dropSlip: "ลากไฟล์สลิปมาวาง หรือกดเพื่อเลือกไฟล์",
      slipHint: "รองรับ PNG/JPG/WEBP/PDF ไม่เกิน 10MB",
      confirmPayment: "ยืนยันการชำระเงิน",
      uploading: "กำลังอัปโหลด...",
      cancelBill: "ยกเลิกบิล",
      cancellingBill: "กำลังยกเลิก...",
      out: "หมดสต็อก",
      stock: "คงเหลือ",
      item: "รายการ",
      subtotal: "ยอดรวมสินค้า",
      payable: "ยอดที่ต้องชำระ",
      noSelected: "ยังไม่ได้เลือกรายการจากตะกร้า",
      selectFromCart: "กลับไปเลือกสินค้า",
      cartItems: "รายการในตะกร้า",
      remove: "ลบ",
      back: "ย้อนกลับ",
      viewCart: "ดูตะกร้า",
      successOrder: "สร้างคำสั่งซื้อแล้ว",
      successCopy: "คัดลอกยอดสำเร็จ",
      successSlip: "อัปโหลดสลิปสำเร็จ รอแอดมินตรวจสอบ",
      successCoupon: "ใช้คูปองสำเร็จ",
      successCancel: "ยกเลิกบิลเรียบร้อย",
      confirmCancel: "ยืนยันยกเลิกบิลนี้ใช่หรือไม่",
      confirmAction: "ยืนยัน",
      cancelAction: "ยกเลิก",
      waitingApprovalTitle: "ส่งหลักฐานชำระเงินแล้ว",
      waitingApprovalDesc: "คำสั่งซื้อของคุณอยู่ในสถานะ รออนุมัติ กรุณารอแอดมินตรวจสอบ",
      viewHistory: "ดูประวัติคำสั่งซื้อ",
      qrPlaceholder: "สร้างคำสั่งซื้อเพื่อแสดง QR PromptPay",
      errorCopyAmount: "ไม่สามารถคัดลอกยอดได้",
      errorCouponValidation: "ตรวจสอบคูปองไม่สำเร็จ",
      errorCreateOrder: "สร้างคำสั่งซื้อไม่สำเร็จ",
      errorCreateOrderFirst: "กรุณาสร้างคำสั่งซื้อก่อน",
      errorUploadSlipRequired: "กรุณาอัปโหลดสลิปชำระเงิน",
      errorUploadSlip: "อัปโหลดสลิปไม่สำเร็จ",
      errorCancelBill: "ยกเลิกบิลไม่สำเร็จ",
      shippingRequiredTitle: "กรอกข้อมูลจัดส่งก่อนชำระเงิน",
      shippingRequiredDesc: "ระบบต้องมี ชื่อ, ที่อยู่ และเบอร์โทร ก่อนสร้างออเดอร์หรือยืนยันชำระเงิน",
      shippingRequiredMissing: "ข้อมูลที่ยังขาด",
      useProfileInfo: "ใช้ข้อมูลจากบัญชี",
      editShippingNow: "กรอกข้อมูลตอนนี้",
      closePopup: "ปิด",
      errorShippingRequired: "กรุณากรอกข้อมูลจัดส่งให้ครบก่อนชำระเงิน",
    };
  }

  if (locale === "lo") {
    return {
      title: "ຊຳລະເງິນ",
      subtitle: "ຊຳລະຜ່ານ PromptPay ແລະ ອັບໂຫຼດສະລິບ",
      cart: "ກະຕ່າ",
      checkout: "ຊຳລະເງິນ",
      paid: "ຊຳລະແລ້ວ",
      shipping: "ຂໍ້ມູນຈັດສົ່ງ",
      selectedItems: "ລາຍການທີ່ເລືອກ",
      selectAll: "ເລືອກທັງໝົດ",
      selectedCount: "ຈຳນວນທີ່ເລືອກ",
      summary: "ສະຫຼຸບຄຳສັ່ງຊື້",
      coupon: "ຄູປອງສ່ວນຫຼຸດ",
      promptpay: "ຈ່າຍຜ່ານ PromptPay",
      fullName: "ຊື່-ນາມສະກຸນ",
      address: "ທີ່ຢູ່ຈັດສົ່ງ",
      phone: "ເບີໂທ",
      note: "ໝາຍເຫດ",
      couponCode: "ລະຫັດຄູປອງ",
      applyCoupon: "ໃຊ້ຄູປອງ",
      couponApplied: "ໃຊ້ຄູປອງສຳເລັດ",
      createOrder: "ສ້າງຄຳສັ່ງຊື້",
      creating: "ກຳລັງສ້າງຄຳສັ່ງ...",
      orderNo: "ເລກອໍເດີ",
      amount: "ຍອດຊຳລະ",
      copyAmount: "ຄັດລອກຍອດ",
      copying: "ກຳລັງຄັດລອກ...",
      dropSlip: "ລາກສະລິບມາວາງ ຫຼື ກົດເພື່ອເລືອກໄຟລ໌",
      slipHint: "ຮອງຮັບ PNG/JPG/WEBP/PDF ບໍ່ເກີນ 10MB",
      confirmPayment: "ຢືນຢັນການຊຳລະ",
      uploading: "ກຳລັງອັບໂຫຼດ...",
      cancelBill: "ຍົກເລີກບິນ",
      cancellingBill: "ກຳລັງຍົກເລີກ...",
      out: "ສິນຄ້າໝົດ",
      stock: "ຄົງເຫຼືອ",
      item: "ລາຍການ",
      subtotal: "ຍອດລວມ",
      payable: "ຍອດທີ່ຕ້ອງຈ່າຍ",
      noSelected: "ຍັງບໍ່ມີລາຍການທີ່ເລືອກ",
      selectFromCart: "ກັບໄປເລືອກສິນຄ້າ",
      cartItems: "ລາຍການໃນກະຕ່າ",
      remove: "ລຶບ",
      back: "ກັບຄືນ",
      viewCart: "ເບິ່ງກະຕ່າ",
      successOrder: "ສ້າງຄຳສັ່ງສຳເລັດ",
      successCopy: "ຄັດລອກຍອດສຳເລັດ",
      successSlip: "ອັບໂຫຼດສະລິບສຳເລັດ ລໍຖ້າກວດສອບ",
      successCoupon: "ໃຊ້ຄູປອງສຳເລັດ",
      successCancel: "ຍົກເລີກບິນສຳເລັດ",
      confirmCancel: "ຢືນຢັນຍົກເລີກບິນນີ້ບໍ?",
      confirmAction: "ຢືນຢັນ",
      cancelAction: "ຍົກເລີກ",
      waitingApprovalTitle: "ສົ່ງຫຼັກຖານການຊຳລະແລ້ວ",
      waitingApprovalDesc: "ຄຳສັ່ງຂອງທ່ານຢູ່ໃນສະຖານະ ລໍຖ້າອະນຸມັດ ກະລຸນາລໍຖ້າການກວດສອບ",
      viewHistory: "ເບິ່ງປະຫວັດຄຳສັ່ງຊື້",
      qrPlaceholder: "ສ້າງຄຳສັ່ງກ່ອນເພື່ອໃຫ້ສະແດງ QR PromptPay",
      errorCopyAmount: "ບໍ່ສາມາດຄັດລອກຍອດໄດ້",
      errorCouponValidation: "ກວດສອບຄູປອງບໍ່ສຳເລັດ",
      errorCreateOrder: "ສ້າງຄຳສັ່ງບໍ່ສຳເລັດ",
      errorCreateOrderFirst: "ກະລຸນາສ້າງຄຳສັ່ງກ່ອນ",
      errorUploadSlipRequired: "ກະລຸນາອັບໂຫຼດສະລິບການຊຳລະ",
      errorUploadSlip: "ອັບໂຫຼດສະລິບບໍ່ສຳເລັດ",
      errorCancelBill: "ຍົກເລີກບິນບໍ່ສຳເລັດ",
      shippingRequiredTitle: "ກະລຸນາກອກຂໍ້ມູນຈັດສົ່ງກ່ອນຊຳລະ",
      shippingRequiredDesc: "ຕ້ອງມີ ຊື່, ທີ່ຢູ່ ແລະ ເບີໂທ ກ່ອນສ້າງຄຳສັ່ງ ຫຼື ຢືນຢັນການຊຳລະ",
      shippingRequiredMissing: "ຂໍ້ມູນທີ່ຍັງຂາດ",
      useProfileInfo: "ໃຊ້ຂໍ້ມູນຈາກບັນຊີ",
      editShippingNow: "ກອກຂໍ້ມູນຕອນນີ້",
      closePopup: "ປິດ",
      errorShippingRequired: "ກະລຸນາກອກຂໍ້ມູນຈັດສົ່ງໃຫ້ຄົບກ່ອນຊຳລະ",
    };
  }

  return {
    title: "Checkout",
    subtitle: "Pay via PromptPay and upload payment slip.",
    cart: "Cart",
    checkout: "Checkout",
    paid: "Paid",
    shipping: "Shipping info",
    selectedItems: "Selected items",
    selectAll: "Select all",
    selectedCount: "Selected",
    summary: "Order summary",
    coupon: "Coupon apply",
    promptpay: "PromptPay payment",
    fullName: "Full name",
    address: "Shipping address",
    phone: "Phone",
    note: "Note",
    couponCode: "Coupon code",
    applyCoupon: "Apply coupon",
    couponApplied: "Coupon applied",
    createOrder: "Create order",
    creating: "Creating order...",
    orderNo: "Order no",
    amount: "Amount",
    copyAmount: "Copy amount",
    copying: "Copying...",
    dropSlip: "Drop payment slip here or tap to upload",
    slipHint: "PNG/JPG/WEBP/PDF up to 10MB",
    confirmPayment: "Confirm payment",
    uploading: "Uploading...",
    cancelBill: "Cancel bill",
    cancellingBill: "Cancelling...",
    out: "Out of stock",
    stock: "Stock",
    item: "items",
    subtotal: "Subtotal",
    payable: "Payable",
    noSelected: "No selected items from cart.",
    selectFromCart: "Back to products",
    cartItems: "Cart items",
    remove: "Remove",
    back: "Back",
    viewCart: "View cart",
    successOrder: "Order created.",
    successCopy: "Amount copied.",
    successSlip: "Slip uploaded. Waiting for review.",
    successCoupon: "Coupon applied.",
    successCancel: "Bill cancelled.",
    confirmCancel: "Do you want to cancel this bill?",
    confirmAction: "Confirm",
    cancelAction: "Cancel",
    waitingApprovalTitle: "Payment slip submitted",
    waitingApprovalDesc: "Your order is now waiting for approval. Please wait for admin verification.",
    viewHistory: "View order history",
    qrPlaceholder: "Create order to show PromptPay QR",
    errorCopyAmount: "Unable to copy amount",
    errorCouponValidation: "Coupon validation failed",
    errorCreateOrder: "Failed to create order",
    errorCreateOrderFirst: "Create order first",
    errorUploadSlipRequired: "Please upload payment slip",
    errorUploadSlip: "Slip upload failed",
    errorCancelBill: "Failed to cancel bill",
    shippingRequiredTitle: "Shipping information is required",
    shippingRequiredDesc: "Name, shipping address, and phone are required before creating order or confirming payment.",
    shippingRequiredMissing: "Missing fields",
    useProfileInfo: "Use profile info",
    editShippingNow: "Fill shipping now",
    closePopup: "Close",
    errorShippingRequired: "Please complete shipping information before payment.",
  };
}

function route(locale: AppLocale, path: string, useLocalePrefix: boolean) {
  if (!useLocalePrefix && locale === "th") return path;
  return `/${locale}${path}`;
}

function buildQrImageUrl(promptpayUrl: string) {
  const encoded = encodeURIComponent(promptpayUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encoded}`;
}

function parsePromptpayAmount(promptpayUrl: string) {
  try {
    const parsed = new URL(promptpayUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(parts[parts.length - 1] ?? "").replace(/,/g, "");
    const amount = Number(last);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return amount;
  } catch {
    return null;
  }
}

function humanFileSize(size: number) {
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

async function loadProfile() {
  const response = await fetch("/api/customer/profile", { cache: "no-store" });
  if (!response.ok) {
    return;
  }
  const payload = (await response.json()) as ProfilePayload;
  return {
    fullName: payload.data?.full_name?.trim() ?? "",
    phone: payload.data?.phone?.trim() ?? "",
    address: payload.data?.address?.trim() ?? "",
  };
}

export function CheckoutClient({
  initialOrderNo,
  initialPromptpayUrl,
  initialSelectedIds = [],
  locale = "th",
  useLocalePrefix = false,
}: CheckoutClientProps) {
  const text = t(locale);
  const [cartItems, setCartItems] = useState<PublicCartItem[]>(() => getPublicCart());
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const cart = getPublicCart();
    const cartIds = cart.map((item) => item.productId);
    const normalized = Array.from(new Set(initialSelectedIds.map((id) => id.trim()).filter(Boolean)));
    if (normalized.length > 0) {
      const allowed = new Set(cartIds);
      return normalized.filter((id) => allowed.has(id));
    }
    return cartIds;
  });

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [promptpayUrl, setPromptpayUrl] = useState(initialPromptpayUrl);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copying, setCopying] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [paidSubmitted, setPaidSubmitted] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [createdItems, setCreatedItems] = useState<PublicCartItem[]>([]);
  const [orderItemsFromApi, setOrderItemsFromApi] = useState<PublicCartItem[]>([]);
  const [lastProductsPath, setLastProductsPath] = useState<string>("");
  const [profileShipping, setProfileShipping] = useState<{ fullName: string; address: string; phone: string }>({
    fullName: "",
    address: "",
    phone: "",
  });
  const [shippingGuardOpen, setShippingGuardOpen] = useState(false);
  const [shippingGuardMounted, setShippingGuardMounted] = useState(false);
  const [shippingGuardVisible, setShippingGuardVisible] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelConfirmMounted, setCancelConfirmMounted] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const selectedItems = useMemo(() => {
    const lookup = new Set(selectedIds);
    return cartItems.filter((item) => lookup.has(item.productId));
  }, [cartItems, selectedIds]);
  const summaryItems = orderNo ? (createdItems.length > 0 ? createdItems : orderItemsFromApi) : selectedItems;
  const summarySubtotal = useMemo(() => sumPublicCart(summaryItems), [summaryItems]);

  const subtotal = useMemo(() => sumPublicCart(selectedItems), [selectedItems]);
  const effectiveDiscount = useMemo(() => Math.min(couponDiscount, subtotal), [couponDiscount, subtotal]);
  const previewPayable = useMemo(() => Math.max(0, subtotal - effectiveDiscount), [subtotal, effectiveDiscount]);
  const qrImageUrl = useMemo(() => (promptpayUrl ? buildQrImageUrl(promptpayUrl) : ""), [promptpayUrl]);
  const payableAmount = useMemo(() => parsePromptpayAmount(promptpayUrl) ?? previewPayable, [promptpayUrl, previewPayable]);

  const hasShippingInfo = fullName.trim().length > 0 && address.trim().length > 0 && phone.trim().length > 0;
  const canCreateOrder = !orderNo && selectedItems.length > 0 && hasShippingInfo;
  const canSelectItems = !orderNo;
  const allSelected = cartItems.length > 0 && selectedIds.length === cartItems.length;
  const missingShippingFields = useMemo(() => {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push(text.fullName);
    if (!address.trim()) missing.push(text.address);
    if (!phone.trim()) missing.push(text.phone);
    return missing;
  }, [address, fullName, phone, text.address, text.fullName, text.phone]);
  const profileHasAllShipping =
    profileShipping.fullName.trim().length > 0
    && profileShipping.address.trim().length > 0
    && profileShipping.phone.trim().length > 0;

  useEffect(() => {
    void loadProfile().then((profile) => {
      if (!profile) return;
      setProfileShipping(profile);
      setFullName((prev) => prev || profile.fullName);
      setPhone((prev) => prev || profile.phone);
      setAddress((prev) => prev || profile.address);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (hasShippingInfo && shippingGuardOpen) {
      setShippingGuardOpen(false);
      setError(null);
    }
  }, [hasShippingInfo, shippingGuardOpen]);

  useEffect(() => {
    if (shippingGuardOpen) {
      setShippingGuardMounted(true);
      const frame = window.requestAnimationFrame(() => setShippingGuardVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    if (!shippingGuardMounted) return;
    setShippingGuardVisible(false);
    const timer = window.setTimeout(() => setShippingGuardMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [shippingGuardMounted, shippingGuardOpen]);

  useEffect(() => {
    if (cancelConfirmOpen) {
      setCancelConfirmMounted(true);
      const frame = window.requestAnimationFrame(() => setCancelConfirmVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    if (!cancelConfirmMounted) return;
    setCancelConfirmVisible(false);
    const timer = window.setTimeout(() => setCancelConfirmMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [cancelConfirmMounted, cancelConfirmOpen]);

  useEffect(() => {
    if (!orderNo || createdItems.length > 0) return;
    let active = true;

    async function loadOrderDetail() {
      try {
        const response = await fetch(`/api/customer/orders/${encodeURIComponent(orderNo)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as OrderDetailPayload | null;
        if (!active || !response.ok || !payload?.ok) return;
        const items = (payload.data?.items ?? []).map((item) => ({
          productId: item.product_id,
          slug: "",
          title: item.title || "-",
          price: Number(item.price ?? 0),
          stock: 0,
          coverUrl: null,
          qty: Number(item.qty ?? 0),
        }));
        setOrderItemsFromApi(items);
        const loadedOrderStatus = String(payload.data?.status ?? "");
        const loadedPaymentStatus = String(payload.data?.payment_status ?? "");
        const loadedFullName = String(payload.data?.customer_full_name ?? "").trim();
        const loadedPhone = String(payload.data?.customer_phone ?? "").trim();
        const loadedAddress = String(payload.data?.shipping_address ?? "").trim();
        setOrderStatus(loadedOrderStatus);
        setPaymentStatus(loadedPaymentStatus);
        setFullName((prev) => prev || loadedFullName);
        setPhone((prev) => prev || loadedPhone);
        setAddress((prev) => prev || loadedAddress);
        if (loadedOrderStatus === "pending_review" || loadedPaymentStatus === "pending_verify" || loadedPaymentStatus === "paid") {
          setPaidSubmitted(true);
        }
      } catch {
        if (!active) return;
      }
    }

    void loadOrderDetail();
    return () => {
      active = false;
    };
  }, [orderNo, createdItems.length]);

  function ensureShippingInfo() {
    if (hasShippingInfo) return true;
    setShippingGuardOpen(true);
    setError(text.errorShippingRequired);
    return false;
  }

  function applyProfileShipping() {
    setFullName((prev) => prev || profileShipping.fullName);
    setAddress((prev) => prev || profileShipping.address);
    setPhone((prev) => prev || profileShipping.phone);
    const readyAfterFill =
      (fullName.trim() || profileShipping.fullName.trim()).length > 0
      && (address.trim() || profileShipping.address.trim()).length > 0
      && (phone.trim() || profileShipping.phone.trim()).length > 0;
    if (readyAfterFill) {
      setShippingGuardOpen(false);
      setError(null);
    }
  }

  async function onApplyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!couponInput.trim() || subtotal <= 0 || applyingCoupon) return;

    setApplyingCoupon(true);
    setError(null);

    try {
      const response = await fetch("/api/public/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });

      const payload = (await response.json()) as CouponPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? text.errorCouponValidation);
      }

      setCouponCode(payload.data.code);
      setCouponDiscount(payload.data.discount_amount);
      setToast(text.successCoupon);
    } catch (caught) {
      setCouponCode("");
      setCouponDiscount(0);
      setError(caught instanceof Error ? caught.message : text.errorCouponValidation);
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function onCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || selectedItems.length === 0) return;
    if (!ensureShippingInfo()) return;
    if (!canCreateOrder) return;

    setCreating(true);
    setError(null);

    try {
      const composedNote = [address.trim() ? `Address: ${address.trim()}` : "", note.trim()]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/public/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((item) => ({ product_id: item.productId, qty: item.qty })),
          customer: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            note: composedNote || undefined,
          },
          coupon: couponCode || undefined,
        }),
      });

      const payload = (await response.json()) as CreateOrderPayload;
      if (!response.ok || !payload.ok || !payload.data?.order_no || !payload.data?.promptpay_url) {
        throw new Error(payload.error ?? text.errorCreateOrder);
      }

      setOrderNo(payload.data.order_no);
      setPromptpayUrl(payload.data.promptpay_url);
      setCreatedItems(selectedItems);
      setToast(text.successOrder);

      const selectedLookup = new Set(selectedItems.map((item) => item.productId));
      const remaining = cartItems.filter((item) => !selectedLookup.has(item.productId));
      savePublicCart(remaining);
      setCartItems(remaining);
      setSelectedIds((prev) => prev.filter((id) => !selectedLookup.has(id)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.errorCreateOrder);
    } finally {
      setCreating(false);
    }
  }

  async function onCopyAmount() {
    if (!payableAmount || copying) return;
    setCopying(true);
    setError(null);

    try {
      await navigator.clipboard.writeText(String(payableAmount));
      setToast(text.successCopy);
    } catch {
      setError(text.errorCopyAmount);
    } finally {
      setCopying(false);
    }
  }

  async function onSubmitSlip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    if (!ensureShippingInfo()) return;

    setUploading(true);
    setError(null);

    try {
      if (!orderNo.trim()) throw new Error(text.errorCreateOrderFirst);
      if (!file) throw new Error(text.errorUploadSlipRequired);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/public/orders/${encodeURIComponent(orderNo.trim())}/slip`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? text.errorUploadSlip);
      }

      setFile(null);
      setPaidSubmitted(true);
      setOrderStatus("pending_review");
      setPaymentStatus("pending_verify");
      setToast(text.successSlip);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.errorUploadSlip);
    } finally {
      setUploading(false);
    }
  }

  function onCancelBill() {
    if (!orderNo || cancelling) return;
    setCancelConfirmOpen(true);
  }

  async function confirmCancelBill() {
    if (!orderNo || cancelling) return;
    setCancelConfirmOpen(false);

    setCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/orders/${encodeURIComponent(orderNo)}/cancel`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? text.errorCancelBill);
      }

      setToast(text.successCancel);
      window.location.href = cartPath;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.errorCancelBill);
    } finally {
      setCancelling(false);
    }
  }

  const cartPath = route(locale, "/cart", useLocalePrefix);
  const productsPath = route(locale, "/products", useLocalePrefix);
  const accountPath = route(locale, "/account", useLocalePrefix);
  const backToProductsPath = lastProductsPath || productsPath;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const remembered = window.localStorage.getItem("kittisap_last_products_path") ?? "";
    if (!remembered) return;
    if (!remembered.includes("/products")) return;
    setLastProductsPath(remembered);
  }, []);

  function toggleItem(productId: string) {
    if (!canSelectItems) return;
    setSelectedIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  }

  function toggleAll() {
    if (!canSelectItems) return;
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(cartItems.map((item) => item.productId));
  }

  function increaseQty(productId: string) {
    const current = cartItems.find((item) => item.productId === productId);
    if (!current) return;
    const next = updatePublicCartItemQty(productId, current.qty + 1);
    setCartItems([...next]);
  }

  function decreaseQty(productId: string) {
    const current = cartItems.find((item) => item.productId === productId);
    if (!current) return;
    const nextQty = Math.max(1, current.qty - 1);
    const next = updatePublicCartItemQty(productId, nextQty);
    setCartItems([...next]);
  }

  function removeItem(productId: string) {
    const next = removePublicCartItem(productId);
    setCartItems([...next]);
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      {toast ? (
        <div className="fixed right-3 top-20 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      {shippingGuardMounted ? (
        <div
          className={`fixed inset-0 z-[70] grid place-items-center p-4 backdrop-blur-[2px] transition-opacity duration-200 ${
            shippingGuardVisible ? "bg-slate-900/50 opacity-100" : "bg-slate-900/0 opacity-0"
          }`}
        >
          <div
            className={`w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)] transition-all duration-200 ${
              shippingGuardVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            }`}
          >
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-white p-3.5">
              <p className="text-sm font-bold text-amber-800">{text.shippingRequiredTitle}</p>
              <p className="mt-1 text-sm text-slate-700">{text.shippingRequiredDesc}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{text.shippingRequiredMissing}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{missingShippingFields.join(", ") || "-"}</p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={applyProfileShipping}
                disabled={!profileHasAllShipping}
                className="app-press h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text.useProfileInfo}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShippingGuardOpen(false);
                  setError(text.errorShippingRequired);
                }}
                className="app-press h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {text.editShippingNow}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShippingGuardOpen(false);
                setError(text.errorShippingRequired);
              }}
              className="mt-2 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              {text.closePopup}
            </button>
          </div>
        </div>
      ) : null}

      {cancelConfirmMounted ? (
        <div
          className={`fixed inset-0 z-[72] grid place-items-center p-4 backdrop-blur-[2px] transition-opacity duration-200 ${
            cancelConfirmVisible ? "bg-slate-900/50 opacity-100" : "bg-slate-900/0 opacity-0"
          }`}
        >
          <div
            className={`w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)] transition-all duration-200 ${
              cancelConfirmVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            }`}
          >
            <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 p-3.5">
              <p className="text-base font-bold text-rose-700">{text.cancelBill}</p>
              <p className="mt-1 text-sm text-slate-700">{text.confirmCancel}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                className="app-press h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {text.cancelAction}
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelBill()}
                disabled={cancelling}
                className="app-press h-11 rounded-xl border border-rose-300 bg-rose-50 px-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelling ? text.cancellingBill : text.confirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-3 py-4 pb-24 md:px-4 md:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{text.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{text.subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                  return;
                }
                window.location.href = cartPath;
              }}
              className="app-press inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {text.back}
            </button>
            <Link href={cartPath} className="app-press inline-flex rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              {text.viewCart}
            </Link>
            <Link href={backToProductsPath} className="app-press inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {text.selectFromCart}
            </Link>
          </div>
        </header>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs md:mt-4 md:max-w-xl md:text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center font-semibold text-amber-700">1. {text.cart}</div>
          <div className={`rounded-lg border px-3 py-2 text-center font-semibold ${orderNo ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600"}`}>
            2. {text.checkout}
          </div>
          <div className={`rounded-lg border px-3 py-2 text-center font-semibold ${paidSubmitted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
            3. {text.paid}
          </div>
        </div>

        {selectedItems.length === 0 && !orderNo ? (
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-sm text-slate-700">{text.noSelected}</p>
            <Link href={cartPath} className="mt-3 inline-flex rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              {text.selectFromCart}
            </Link>
          </section>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
            <section className="space-y-4">
              {!orderNo ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.selectedItems}</h2>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-amber-500" />
                      {text.selectAll}
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {text.selectedCount}: {selectedIds.length}/{cartItems.length}
                  </p>
                  <div className="mt-3 space-y-2">
                    {cartItems.map((item) => (
                      <label key={item.productId} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.productId)}
                          onChange={() => toggleItem(item.productId)}
                          className="h-4 w-4 accent-amber-500"
                        />
                        <span className="line-clamp-1 flex-1 text-sm text-slate-700">{item.title}</span>
                        <span className="text-xs font-semibold text-amber-600">x{item.qty}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ) : null}

              {!orderNo ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.shipping}</h2>
                  <form className="mt-3 space-y-3" onSubmit={onCreateOrder}>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder={text.fullName}
                      autoComplete="name"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-amber-500"
                    />
                    <textarea
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder={text.address}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500"
                    />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder={text.phone}
                      autoComplete="tel"
                      inputMode="tel"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base outline-none focus:border-amber-500"
                    />
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={text.note}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={selectedItems.length === 0 || creating}
                      className="app-press h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? text.creating : text.createOrder}
                    </button>
                  </form>
                </article>
              ) : null}

              {!orderNo ? (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.coupon}</h2>
                  <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={onApplyCoupon}>
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder={text.couponCode}
                      className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="app-press h-11 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-700 disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : text.applyCoupon}
                    </button>
                  </form>
                  {couponCode ? <p className="mt-2 text-xs text-emerald-700">{text.couponApplied}: {couponCode}</p> : null}
                </article>
              ) : null}

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.promptpay}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {text.orderNo}: <span className="font-semibold text-slate-900">{orderNo || "-"}</span>
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {!paidSubmitted && qrImageUrl ? (
                    <div className="relative mx-auto h-60 w-60 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 md:h-72 md:w-72">
                      <Image src={qrImageUrl} alt="PromptPay QR" fill sizes="(max-width: 768px) 240px, 288px" className="object-contain" />
                    </div>
                  ) : !paidSubmitted ? (
                    <div className="grid h-44 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                      {text.qrPlaceholder}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      <p className="text-sm font-bold">{text.waitingApprovalTitle}</p>
                      <p className="mt-1 text-sm">{text.waitingApprovalDesc}</p>
                      <p className="mt-2 text-xs text-emerald-700">
                        {text.orderNo}: {orderNo} | status: {orderStatus || "pending_review"} / {paymentStatus || "pending_verify"}
                      </p>
                      <Link
                        href={accountPath}
                        className="mt-3 inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700"
                      >
                        {text.viewHistory}
                      </Link>
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{text.amount}</p>
                    <p className="mt-1 text-3xl font-extrabold text-amber-600">THB {payableAmount.toLocaleString()}</p>
                  </div>

                  {!paidSubmitted ? (
                    <button
                      type="button"
                      onClick={() => void onCopyAmount()}
                      disabled={copying || payableAmount <= 0}
                      className="app-press mt-3 h-11 w-full rounded-lg border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-700 disabled:opacity-50"
                    >
                      {copying ? text.copying : text.copyAmount}
                    </button>
                  ) : null}

                  {!paidSubmitted ? (
                  <form className="mt-4 space-y-3" onSubmit={onSubmitSlip}>
                    <label
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOver(false);
                        const dropped = event.dataTransfer.files?.[0] ?? null;
                        setFile(dropped);
                      }}
                      className={`tap-ripple block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
                        dragOver ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <p className="text-sm font-medium text-slate-700">{text.dropSlip}</p>
                      <p className="mt-1 text-xs text-slate-500">{text.slipHint}</p>
                      {file ? <p className="mt-2 text-xs font-semibold text-amber-700">{file.name} ({humanFileSize(file.size)})</p> : null}
                    </label>

                    <button
                      type="submit"
                      disabled={uploading || !orderNo}
                      className="app-press h-12 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-base font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(245,158,11,0.35)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? text.uploading : text.confirmPayment}
                    </button>

                    <button
                      type="button"
                      onClick={onCancelBill}
                      disabled={!orderNo || uploading || cancelling}
                      className="app-press h-11 w-full rounded-lg border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancelling ? text.cancellingBill : text.cancelBill}
                    </button>
                  </form>
                  ) : null}
                </div>
              </article>

              {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </section>

            <aside>
              <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.cartItems}</h2>
                {cartItems.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">{text.noSelected}</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {cartItems.map((item) => (
                      <div key={`cart-manage-${item.productId}`} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                            {item.coverUrl ? (
                              <Image
                                src={item.coverUrl}
                                alt={item.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-[10px] text-slate-400">N/A</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[13px] font-semibold text-slate-800">{item.title}</p>
                            <p className="text-xs font-semibold text-amber-700">THB {(item.price * item.qty).toLocaleString()}</p>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => decreaseQty(item.productId)}
                              disabled={item.qty <= 1}
                              className="app-press h-6 w-6 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="min-w-6 text-center text-xs font-semibold text-slate-700">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => increaseQty(item.productId)}
                              disabled={item.qty >= item.stock}
                              className="app-press h-6 w-6 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-700 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="app-press rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-50"
                          >
                            {text.remove}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-24 md:p-5">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">{text.summary}</h2>
                <div className="mt-3 space-y-2">
                  {summaryItems.map((item) => {
                    const outOfStock = item.stock <= 0;
                    return (
                      <div key={item.productId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <p className="line-clamp-1 font-medium text-slate-800">{item.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">x{item.qty} {outOfStock ? `(${text.out})` : `(${text.stock}: ${item.stock})`}</p>
                          <p className="font-semibold text-slate-800">THB {(item.price * item.qty).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{text.subtotal}</span>
                    <span>THB {summarySubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{text.coupon}</span>
                    <span>- THB {effectiveDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>{text.payable}</span>
                    <span className="text-amber-600">THB {payableAmount.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
