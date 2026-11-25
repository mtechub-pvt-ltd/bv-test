import "dotenv/config";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is missing in environment variables!");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function setupPremiumPrices() {
  console.log("Connecting to Stripe API...");

  try {
    // 1. Search for existing product or create VIP Premium product
    let product;
    const existingProducts = await stripe.products.list({ limit: 20 });
    product = existingProducts.data.find(
      (p) => p.name.toLowerCase().includes("vip premium") || p.name.toLowerCase().includes("premium")
    );

    if (!product) {
      product = await stripe.products.create({
        name: "VIP Premium",
        description: "Wotcha-Gotcha VIP Premium Subscription",
      });
      console.log("✓ Created new Stripe Product:", product.id, product.name);
    } else {
      console.log("✓ Found existing Stripe Product:", product.id, `"${product.name}"`);
    }

    const monthlyLookupKey = process.env.PREMIUM_MONTHLY_KEY || "premium_sub_key";
    const annualLookupKey = process.env.PREMIUM_ANNUAL_KEY || "annual-premium-plan";

    // 2. Create Monthly Price ($15.00 / mo)
    try {
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 1500, // $15.00 in cents
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: monthlyLookupKey,
        transfer_lookup_key: true,
      });
      console.log("✓ Created Monthly Price ($15.00/mo):", monthlyPrice.id, "| lookup_key:", monthlyPrice.lookup_key);
    } catch (err) {
      console.warn("Monthly price creation info:", err.message);
    }

    // 3. Create Annual Price ($150.00 / yr)
    try {
      const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 15000, // $150.00 in cents
        currency: "usd",
        recurring: { interval: "year" },
        lookup_key: annualLookupKey,
        transfer_lookup_key: true,
      });
      console.log("✓ Created Annual Price ($150.00/yr):", annualPrice.id, "| lookup_key:", annualPrice.lookup_key);
    } catch (err) {
      console.warn("Annual price creation info:", err.message);
    }

    console.log("🎉 Successfully created $15.00/mo & $150.00/yr Prices in Stripe!");
  } catch (err) {
    console.error("❌ Error setting up Stripe prices:", err);
  }
}

setupPremiumPrices();
