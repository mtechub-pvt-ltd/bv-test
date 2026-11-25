-- Add badge_subscription_key column for Stripe badge plan tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS badge_subscription_key VARCHAR(255);
