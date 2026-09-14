const STORAGE_KEY = 'picknpay.orderTicket';
const MAX_ORDER_NO = 99;

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const emptyState = () => ({
  date: todayKey(),
  lastNo: 0,
  bySaleId: {},
});

const loadState = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || raw.date !== todayKey()) {
      return emptyState();
    }
    return {
      date: raw.date,
      lastNo: Number(raw.lastNo) || 0,
      bySaleId: raw.bySaleId && typeof raw.bySaleId === 'object' ? raw.bySaleId : {},
    };
  } catch {
    return emptyState();
  }
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getStoredOrderNo = (saleId) => {
  if (saleId == null) return null;
  const value = loadState().bySaleId[String(saleId)];
  return value ? Number(value) : null;
};

export const assignOrderNo = (saleId) => {
  const state = loadState();
  const key = saleId == null ? null : String(saleId);
  if (key && state.bySaleId[key]) {
    return Number(state.bySaleId[key]);
  }
  const next = state.lastNo >= MAX_ORDER_NO ? 1 : state.lastNo + 1;
  state.lastNo = next;
  if (key) {
    state.bySaleId[key] = next;
  }
  saveState(state);
  return next;
};

export const withOrderNo = (sale) => {
  if (!sale) return sale;
  const displayOrderNo = sale.displayOrderNo || getStoredOrderNo(sale.id) || assignOrderNo(sale.id);
  return { ...sale, displayOrderNo };
};

export const withExistingOrderNo = (sale) => {
  if (!sale) return sale;
  const displayOrderNo = sale.displayOrderNo || getStoredOrderNo(sale.id);
  return displayOrderNo ? { ...sale, displayOrderNo } : sale;
};
