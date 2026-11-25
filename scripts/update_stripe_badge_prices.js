import "dotenv/config";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is missing in environment variables!");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const BADGE_PRICE_CONFIGS = [
  // 1. Basic Blue (without checkmark) -> $4.99/month & $49.99/year
  {
    tier: "blue_basic",
    productName: "Blue Badge Basic",
    lookupKey: "blue_badge_monthly_key",
    amount: 499, // $4.99
    interval: "month",
  },
  {
    tier: "blue_basic",
    productName: "Blue Badge Basic",
    lookupKey: "blue_badge_annual_key",
    amount: 4999, // $49.99
    interval: "year",
  },
  // 2. Blue Premium (with Checkmark) -> $9.99/month & $99.99/year
  {
    tier: "blue_premium",
    productName: "Blue Badge Premium",
    lookupKey: "blue_premium_badge_monthly_key",
    amount: 999, // $9.99
    interval: "month",
  },
  {
    tier: "blue_premium",
    productName: "Blue Badge Premium",
    lookupKey: "blue_premium_badge_annual_key",
    amount: 9999, // $99.99
    interval: "year",
  },
  // 3. Basic Gold (without checkmark) -> $49.99/month & $499.99/year
  {
    tier: "gold_basic",
    productName: "Gold Badge Basic",
    lookupKey: "gold_badge_basic_monthly_key",
    amount: 4999, // $49.99
    interval: "month",
  },
  {
    tier: "gold_basic",
    productName: "Gold Badge Basic",
    lookupKey: "gold_badge_basic_annual_key",
    amount: 49999, // $499.99
    interval: "year",
  },
  // 4. Gold Premium (without checkmark [tier 4]) -> $99.99/month & $999.99/year
  {
    tier: "gold_premium",
    productName: "Gold Badge Premium",
    lookupKey: "gold_badge_premium_monthly_key",
    amount: 9999, // $99.99
    interval: "month",
  },
  {
    tier: "gold_premium",
    productName: "Gold Badge Premium",
    lookupKey: "gold_badge_premium_annual_key",
    amount: 99999, // $999.99
    interval: "year",
  },
];

async function updateStripeBadgePrices() {
  console.log("🚀 Updating Stripe Badge Prices live...");

  const existingProducts = await stripe.products.list({ limit: 100 });
  const productMap = {};

  for (const config of BADGE_PRICE_CONFIGS) {
    let product = existingProducts.data.find(
      (p) => p.name.toLowerCase().trim() === config.productName.toLowerCase().trim()
    );

    if (!product) {
      // Find by partial match or create
      product = existingProducts.data.find(
        (p) => p.name.toLowerCase().includes(config.productName.toLowerCase())
      );
    }

    if (!product) {
      product = await stripe.products.create({
        name: config.productName,
        description: `Wotcha-Gotcha ${config.productName} Subscription`,
      });
      console.log(`✓ Created new Product: ${product.name} (${product.id})`);
      existingProducts.data.push(product);
    }

    productMap[config.productName] = product.id;
  }

  const results = [];

  for (const config of BADGE_PRICE_CONFIGS) {
    const productId = productMap[config.productName];

    console.log(`\nCreating Stripe price for ${config.lookupKey} ($${(config.amount / 100).toFixed(2)}/${config.interval})...`);

    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: config.amount,
      currency: "usd",
      recurring: { interval: config.interval },
      lookup_key: config.lookupKey,
      transfer_lookup_key: true,
    });

    console.log(`✓ Created Price ${newPrice.id} with lookup_key "${newPrice.lookup_key}" for $${(newPrice.unit_amount / 100).toFixed(2)}/${newPrice.recurring.interval}`);
    results.push({
      lookupKey: newPrice.lookup_key,
      priceId: newPrice.id,
      amountUSD: `$${(newPrice.unit_amount / 100).toFixed(2)}`,
      interval: newPrice.recurring.interval,
      productName: config.productName,
    });
  }

  console.log("\n=======================================================");
  console.log("🎉 All 8 Badge Prices successfully created & updated on Stripe!");
  console.log("=======================================================");
  console.table(results);

  // Verification step by looking up each key
  console.log("\n🔍 Verifying lookup keys directly via Stripe API...");
  for (const config of BADGE_PRICE_CONFIGS) {
    const fetched = await stripe.prices.list({ lookup_keys: [config.lookupKey], limit: 1 });
    if (fetched.data.length > 0) {
      const p = fetched.data[0];
      console.log(`✓ Lookup key "${config.lookupKey}" -> ${p.id} = $${(p.unit_amount / 100).toFixed(2)} / ${p.recurring.interval}`);
    } else {
      console.error(`❌ Lookup key "${config.lookupKey}" not found!`);
    }
  }

  process.exit(0);
}

updateStripeBadgePrices().catch((err) => {
  console.error("❌ Error updating Stripe badge prices:", err);
  process.exit(1);
});
