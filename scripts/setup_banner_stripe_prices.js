import "dotenv/config";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is missing in environment variables!");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const BANNER_TIER_CONFIGS = [
  {
    tier: "premium",
    name: "Banner Ad - Top Tier (Premium)",
    description: "Top banner placement above Video-Mania on Home feed ($50/month)",
    lookupKeys: ["banner-top-subscription-key", "banner_top_subscription_key"],
    amountCents: 5000, // $50.00
    interval: "month",
  },
  {
    tier: "middle",
    name: "Banner Ad - Middle Tier",
    description: "Middle banner placement across Home mid-scroll and standard modules ($25/month)",
    lookupKeys: ["banner-middle-subscription-key", "banner_middle_subscription_key"],
    amountCents: 2500, // $25.00
    interval: "month",
  },
  {
    tier: "lower",
    name: "Banner Ad - Lower Tier",
    description: "Lower banner placement across Home and specialized modules ($12.50/month)",
    lookupKeys: ["banner-lower-subscription-key", "banner_lower_subscription_key"],
    amountCents: 1250, // $12.50
    interval: "month",
  },
];

async function setupBannerStripePrices() {
  console.log("🚀 Setting up Stripe Banner Subscription Products & Prices...");

  const existingProducts = await stripe.products.list({ limit: 100 });
  const results = [];

  for (const config of BANNER_TIER_CONFIGS) {
    let product = existingProducts.data.find(
      (p) => p.name.toLowerCase().trim() === config.name.toLowerCase().trim()
    );

    if (!product) {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
      });
      console.log(`✓ Created new Product: "${product.name}" (${product.id})`);
      existingProducts.data.push(product);
    } else {
      console.log(`✓ Found existing Product: "${product.name}" (${product.id})`);
    }

    for (const lookupKey of config.lookupKeys) {
      const existingPrices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        limit: 1,
      });

      let price;
      if (existingPrices.data.length > 0) {
        price = existingPrices.data[0];
        console.log(`  ✓ Found existing Price for lookup_key "${lookupKey}": ${price.id} ($${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval})`);
      } else {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: config.amountCents,
          currency: "usd",
          recurring: { interval: config.interval },
          lookup_key: lookupKey,
          transfer_lookup_key: true,
        });
        console.log(`  ★ Created Price ${price.id} with lookup_key "${lookupKey}" for $${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval}`);
      }

      results.push({
        tier: config.tier,
        lookupKey: lookupKey,
        priceId: price.id,
        amount: `$${(price.unit_amount / 100).toFixed(2)}`,
        interval: price.recurring?.interval,
        productId: product.id,
      });
    }
  }

  console.log("\n=======================================================");
  console.log("🎉 All Banner Subscription Prices ready on Stripe!");
  console.log("=======================================================");
  console.table(results);

  // Verification step
  console.log("\n🔍 Verifying lookup keys directly via Stripe API...");
  for (const row of results) {
    const fetched = await stripe.prices.list({ lookup_keys: [row.lookupKey], limit: 1 });
    if (fetched.data.length > 0) {
      const p = fetched.data[0];
      console.log(`✓ Verified "${row.lookupKey}" -> ${p.id} = $${(p.unit_amount / 100).toFixed(2)}/${p.recurring?.interval}`);
    } else {
      console.error(`❌ Verification failed for lookup key "${row.lookupKey}"`);
    }
  }
}

setupBannerStripePrices().catch((err) => {
  console.error("❌ Error setting up Banner Stripe prices:", err);
  process.exit(1);
});
