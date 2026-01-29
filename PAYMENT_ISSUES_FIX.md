# Payment Issues - Complete Fix Guide

## Issues Summary
1. ❌ Add Card button not clickable/active
2. ❌ CardField shows all inputs in one slidable field
3. ❌ last4 error still occurring

## Root Causes

### Issue 1 & 2: Stripe Not Initialized
The Stripe CardField isn't working because:
- The `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` was removed from `mobile/.env`
- Without a valid key, the CardField doesn't function properly
- The button stays disabled because `cardComplete` never becomes true

### Issue 3: App Not Reloaded
The code fixes for the last4 error were applied, but the mobile app hasn't picked them up because:
- React Native caches the JavaScript bundle
- Environment variables require a full restart with cache clear

## Complete Fix Steps

### Step 1: Add Your Actual Stripe Keys

**YOU MUST REPLACE THE PLACEHOLDER KEYS WITH YOUR REAL STRIPE TEST KEYS!**

1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure you're in TEST mode
3. Copy your keys

Edit `mobile/.env` and replace the X's with your actual key:
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
```

Edit `backend/.env` and replace both keys:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
```

### Step 2: Stop Everything

1. Stop backend server (Ctrl+C in backend terminal)
2. Stop Metro bundler (Ctrl+C in mobile terminal)
3. Close the mobile app completely

### Step 3: Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Clear Cache and Restart Mobile

```bash
cd mobile
# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo
# Restart with clear cache
npx expo start --clear
```

### Step 5: Reload App

- Press `r` in the Metro terminal, OR
- Shake your device and select "Reload", OR
- Close and reopen the app

### Step 6: Verify

Check the logs when the app starts. You should see:
```
🔑 STRIPE KEY: pk_test_51QOiLwP3iJb...
```

If you see `🔑 STRIPE KEY: NOT SET`, the environment variable isn't loaded.

## About the CardField

The Stripe `CardField` component is DESIGNED to show all inputs in one slidable field. This is Stripe's standard behavior and is actually good UX because:
- It's mobile-optimized
- Reduces form complexity
- Follows Stripe's security best practices
- Users can swipe between card number, expiry, and CVC

If you absolutely need separate fields, we would need to:
1. Use Stripe Elements Web (not available in React Native)
2. Build custom inputs and use Stripe.js (complex and less secure)
3. Use a different payment provider

**Recommendation:** Keep the CardField as-is. It's the standard Stripe mobile experience.

## Testing

Once everything is restarted with valid keys:

1. Navigate to Payment Methods
2. Click "Add Payment Method"
3. The CardField should now be interactive
4. Enter test card: `4242 4242 4242 4242`
5. Swipe to enter expiry: any future date like `12/25`
6. Swipe to enter CVC: any 3 digits like `123`
7. The "Add Card" button should become active (blue)
8. Click it to add the card
9. No more last4 errors!

## Troubleshooting

### Button still disabled?
- Make sure you entered ALL card details (number, expiry, CVC)
- Check that the Stripe key is loaded (see logs)
- Try a different test card number

### CardField not responding?
- Verify the Stripe key starts with `pk_test_`
- Make sure you cleared cache and restarted
- Check for errors in Metro bundler logs

### last4 error still happening?
- You MUST do a full reload with cache clear
- The old JavaScript bundle is still cached
- Try: `npx expo start --clear` and reload app

### Environment variable not loading?
- Make sure the key in `.env` starts with `EXPO_PUBLIC_`
- No spaces around the `=` sign
- Restart Metro bundler after changing `.env`
- For Expo, you may need to restart the dev server

## Important Notes

⚠️ **The placeholder key I added will NOT work!** You must replace it with your actual Stripe test key.

⚠️ **Never commit real keys to git!** The `.env` files are gitignored for security.

⚠️ **Use TEST mode keys only!** Never use live keys in development.
