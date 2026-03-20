/**
 * ─────────────────────────────────────────────────────────
 * PATCH: replace the entire <script data-cfasync="false">
 *        block that currently starts with "// CONFIG"
 *        with this file's contents.
 *
 * What changed:
 *   • Removed 5 hardcoded constants (SB_URL, SB_KEY,
 *     PAYSTACK_PUBLIC_KEY, ADMIN_EMAIL, COMMISSION_AMOUNT)
 *   • Added fetchConfig() which calls /api/config
 *   • init() now awaits fetchConfig() before touching Supabase
 * ─────────────────────────────────────────────────────────
 */

// ====================================================
//  CONFIG  — populated at runtime from /api/config
// ====================================================
let SB_URL            = '';
let SB_KEY            = '';
let ADMIN_EMAIL       = '';
let PAYSTACK_PUBLIC_KEY = '';
const COMMISSION_AMOUNT = 500000;   // ₦5,000 in kobo — not a secret
const PLATFORM_FEE_PCT  = 0.03;    // 3%  — not a secret

// db is declared here; initialised in fetchConfig() once keys arrive
let db;

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    const cfg = await res.json();

    SB_URL              = cfg.supabaseUrl;
    SB_KEY              = cfg.supabaseAnonKey;
    PAYSTACK_PUBLIC_KEY = cfg.paystackPublicKey;
    ADMIN_EMAIL         = cfg.adminEmail;

    // Initialise Supabase client now that we have the real keys
    db = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
        storage:            window.localStorage
      }
    });
  } catch (err) {
    console.error('Could not load app config:', err);
    // Show a friendly error so the page doesn't silently break
    document.body.innerHTML = `
      <div style="font-family:sans-serif;text-align:center;padding:4rem 1rem;color:#4a4030">
        <h2>⚠️ App failed to start</h2>
        <p>Could not load configuration. Please try refreshing the page.</p>
        <button onclick="location.reload()"
          style="margin-top:1rem;padding:.7rem 1.6rem;background:#19a847;color:#fff;
                 border:none;border-radius:8px;font-size:1rem;cursor:pointer">
          Retry
        </button>
      </div>`;
    throw err; // stop init() from continuing
  }
}

// ====================================================
//  STATE
// ====================================================
let currentUser = null, currentRole = 'buyer', currentProd = null;
let cart = JSON.parse(localStorage.getItem('bs_cart') || '[]');
let products = [], filteredProducts = [], activeFilters = {};
let carouselIndex = 0, carouselTimer = null;
let selectedRating = 0, checkoutPaymentMethod = 'paystack';
let deferredInstallPrompt = null, salesChart = null;
let carouselStartX = 0;

// ====================================================
//  INIT  — fetchConfig() runs FIRST
// ====================================================
(async function init() {
  await fetchConfig();          // ← keys + db client ready after this line

  await checkSession();
  updateCartCount();
  handleDeepLink();
  checkBroadcastForUser();

  // Real-time order updates for sellers
  db.channel('orders-rt').on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'orders'
  }, payload => {
    if (currentRole === 'seller' && payload.new?.seller_id === currentUser?.id) {
      toast('New Order! 🛍️', 'Check your orders panel', 'success', 6000);
      loadSellerOrders();
      loadSellerStats();
    }
  }).subscribe();

  // Real-time low stock alerts
  db.channel('stock-rt').on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'products'
  }, payload => {
    const p = payload.new;
    if (
      currentRole === 'seller' &&
      p?.seller_id === currentUser?.id &&
      p?.stock_quantity !== undefined &&
      p?.low_stock_alert &&
      p.stock_quantity <= p.low_stock_alert &&
      p.stock_quantity > 0
    ) {
      toast(`⚠️ Low Stock: ${p.name}`, `Only ${p.stock_quantity} left`, 'warn', 7000);
    }
  }).subscribe();
})();
