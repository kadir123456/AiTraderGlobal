# LemonSqueezy Payment Setup Guide

This guide explains how to set up LemonSqueezy for payment processing in your EMA Navigator AI trading platform.

## Why LemonSqueezy?

- **Developer-friendly**: Simple API and easy integration
- **Merchant of Record**: Handles all taxes, VAT, and compliance automatically
- **Global payments**: Supports credit cards, PayPal, and local payment methods worldwide
- **Pricing**: 5% + $0.50 per transaction (competitive for small businesses)
- **No monthly fees**: Only pay when you make sales

## Step 1: Create LemonSqueezy Account

1. Go to [LemonSqueezy.com](https://lemonsqueezy.com)
2. Click "Sign Up" and create your account
3. Complete onboarding and verify your email

## Step 2: Create Your Store

1. In LemonSqueezy dashboard, click "Create Store"
2. Enter store details:
   - **Store Name**: "EMA Navigator AI" (or your preferred name)
   - **Store URL**: `ema-navigator` (will be: ema-navigator.lemonsqueezy.com)
   - **Currency**: USD (or your preferred currency)
3. Click "Create Store"

## Step 3: Create Products

You need to create 3 products for the 3 pricing tiers:

### Product 1: Free Plan
1. Go to Products → New Product
2. Settings:
   - **Name**: "EMA Navigator - Free"
   - **Description**: "Get started with basic trading features"
   - **Price**: $0 (Free)
   - **Recurring**: No
3. Click "Create Product"

### Product 2: Pro Plan
1. Go to Products → New Product
2. Settings:
   - **Name**: "EMA Navigator - Pro"
   - **Description**: "Unlock advanced trading features"
   - **Price**: $29/month
   - **Recurring**: Yes (Monthly)
3. Click "Create Product"
4. **Save the Variant ID** (you'll need this later)

### Product 3: Enterprise Plan
1. Go to Products → New Product
2. Settings:
   - **Name**: "EMA Navigator - Enterprise"
   - **Description**: "Complete trading solution for firms"
   - **Price**: $299/month
   - **Recurring**: Yes (Monthly)
3. Click "Create Product"
4. **Save the Variant ID** (you'll need this later)

## Step 4: Get API Credentials

### Store ID
1. Go to Settings → General
2. Copy your **Store ID**

### Variant IDs
1. Go to Products
2. Click on each product
3. Under "Variants", copy the **Variant ID** for each plan

### API Key
1. Go to Settings → API
2. Click "Create API Key"
3. Name it "Production API Key"
4. Copy the API key (you won't see it again!)

### Webhook Secret
1. Go to Settings → Webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-backend.onrender.com/api/payments/webhook`
4. Select events to listen to:
   - `order_created`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_resumed`
   - `subscription_expired`
5. Copy the **Signing Secret**

## Step 5: Configure Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_LEMONSQUEEZY_STORE_ID=your-store-id
VITE_LEMONSQUEEZY_VARIANT_ID_FREE=variant-id-for-free
VITE_LEMONSQUEEZY_VARIANT_ID_PRO=variant-id-for-pro
VITE_LEMONSQUEEZY_VARIANT_ID_ENTERPRISE=variant-id-for-enterprise
```

### Backend (backend/.env)
```env
LEMONSQUEEZY_API_KEY=your-api-key
LEMONSQUEEZY_WEBHOOK_SECRET=your-webhook-signing-secret
FRONTEND_URL=https://your-frontend.onrender.com
```

## Step 6: Test in Development

1. Enable **Test Mode** in LemonSqueezy:
   - Settings → General → Enable Test Mode

2. Use test card for payments:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

3. Test checkout flow:
   - Click "Go Pro" button on pricing page
   - Complete checkout with test card
   - Verify webhook is received in backend logs

## Step 7: Go Live

1. **Complete Store Setup**:
   - Add your business information
   - Connect payout method (Stripe or PayPal)
   - Verify tax settings

2. **Disable Test Mode**:
   - Settings → General → Disable Test Mode

3. **Update Webhook URL**:
   - Change webhook URL to production backend URL
   - Verify webhook signing secret is correct

4. **Test Real Payment**:
   - Make a real $1 test purchase
   - Verify webhook processing
   - Issue refund through LemonSqueezy dashboard

## Webhook Events

Your backend handles these events:

### `order_created`
- Triggered when a customer completes a purchase
- Update user's subscription tier in database
- Send welcome email

### `subscription_created`
- Triggered when a recurring subscription starts
- Activate Pro or Enterprise features
- Set subscription expiry date

### `subscription_cancelled`
- Triggered when customer cancels subscription
- Downgrade to Free plan at end of billing period
- Send cancellation email

### `subscription_expired`
- Triggered when subscription period ends
- Immediately downgrade to Free plan
- Disable premium features

## Testing Webhooks Locally

Use ngrok to test webhooks on localhost:

```bash
# Install ngrok
npm install -g ngrok

# Start your backend
python backend/main.py

# Expose backend to internet
ngrok http 8000

# Copy ngrok URL and add to LemonSqueezy webhook settings
# https://xxxxx.ngrok.io/api/payments/webhook
```

## Pricing Recommendations

Based on your target market:

- **Free**: $0/month - 1 exchange, demo mode
- **Pro**: $29/month - 5 exchanges, auto-trading
- **Enterprise**: $299/month - Unlimited, custom strategies

You can adjust prices in LemonSqueezy dashboard anytime.

## Customer Portal

LemonSqueezy provides a customer portal where users can:
- View invoices
- Update payment method
- Cancel subscription
- Download receipts

Portal URL format:
```
https://ema-navigator.lemonsqueezy.com/billing
```

## Support & Documentation

- [LemonSqueezy Docs](https://docs.lemonsqueezy.com/)
- [API Reference](https://docs.lemonsqueezy.com/api)
- [Webhook Events](https://docs.lemonsqueezy.com/api/webhooks)
- [Support](https://lemonsqueezy.com/support)

## Common Issues

### Checkout not opening
- Verify Store ID is correct
- Check Variant IDs match your products
- Ensure LemonSqueezy script is loaded (check browser console)

### Webhook not received
- Verify webhook URL is accessible (test with curl)
- Check webhook signing secret matches
- Look for failed webhook deliveries in LemonSqueezy dashboard

### Payment fails
- Verify Test Mode is enabled for testing
- Check card details are correct
- Ensure store is properly configured

## Next Steps

After completing LemonSqueezy setup:

1. ✅ Test all three pricing tiers
2. ✅ Verify webhook processing
3. ✅ Test subscription cancellation
4. ✅ Set up email notifications
5. ✅ Add analytics tracking
6. ✅ Configure refund policy

---

**Questions?** Check LemonSqueezy support or their Discord community.
