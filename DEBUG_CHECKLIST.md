# Debug Checklist for Payment Issues

## Step 1: Verify Stripe Key is Loaded

After restarting your app with `npx expo start --clear`, check the Metro bundler logs for:

```
🔑 STRIPE KEY: pk_test_51STj0VAhfIph...
```

**If you see `NOT SET`:**
- The .env file isn't being read
- Try stopping Metro completely and running `npx expo start --clear` again
- Make sure the key in `.env` starts with `EXPO_PUBLIC_`

## Step 2: Check AddPaymentMethodScreen Logs

When you navigate to the Add Payment Method screen, you should see:

```
💳 AddPaymentMethodScreen mounted
💳 createPaymentMethod available: true
```

**If `createPaymentMethod available: false`:**
- Stripe isn't initialized properly
- The publishable key is invalid or empty
- Check Step 1 again

## Step 3: Test Card Input

When you start typing in the card field, you should see logs like:

```
💳 Card details changed: {
  complete: false,
  validNumber: 'Valid',
  validExpiryDate: 'Incomplete',
  validCVC: 'Incomplete'
}
```

As you fill in all fields, eventually you should see:

```
💳 Card details changed: {
  complete: true,
  validNumber: 'Valid',
  validExpiryDate: 'Valid',
  validCVC: 'Valid'
}
```

**If you don't see these logs:**
- The CardField isn't responding to input
- Stripe key is invalid
- Try a different test card number

## Step 4: Button Should Activate

Once `complete: true` appears in the logs, the "Add Card" button should:
- Change from gray/disabled to blue/active
- Be clickable

**If button stays disabled:**
- Check that `complete: true` appeared in logs
- The button is controlled by `cardComplete` state
- Try reloading the app

## Step 5: Test Adding Card

Use test card: `4242 4242 4242 4242`
- Expiry: `12/25` (any future date)
- CVC: `123` (any 3 digits)

Click "Add Card" and watch for logs:

```
💳 Saving payment method to backend: pm_xxxxx
💳 Payment method saved successfully: {...}
```

**If you see errors:**
- Check what the error message says
- Look for backend errors in your backend terminal
- The error might be from Stripe or from your backend

## Step 6: Check for last4 Error

The last4 error should NOT appear anymore because:
1. We made `last4` nullable in the database
2. We added null checks in all UI components
3. We filter out invalid payment methods

**If you still see the error:**
- The old JavaScript bundle is cached
- You MUST do: `npx expo start --clear` and reload
- Close the app completely and reopen
- Check that the code changes were actually applied

## Common Issues

### "Button not clickable"
- Fill in ALL three fields (card, expiry, CVC)
- Make sure Stripe key is loaded (Step 1)
- Check logs show `complete: true` (Step 3)

### "last4 error when typing"
- This shouldn't happen on the Add Payment screen
- If it does, it means another component is trying to render payment methods
- Check if PaymentMethodsScreen is rendering in the background

### "Stripe error: Invalid API key"
- Your publishable key is wrong
- Make sure it starts with `pk_test_`
- Copy it again from Stripe dashboard

### "Network error when adding card"
- Backend isn't running
- Backend doesn't have the Stripe secret key
- Check backend logs for errors

## Quick Test Script

1. ✅ Restart backend: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
2. ✅ Clear and restart mobile: `npx expo start --clear`
3. ✅ Check logs for: `🔑 STRIPE KEY: pk_test_...`
4. ✅ Navigate to Add Payment Method
5. ✅ Check logs for: `💳 createPaymentMethod available: true`
6. ✅ Enter card: `4242 4242 4242 4242`
7. ✅ Check logs show: `complete: true`
8. ✅ Button should be blue/active
9. ✅ Click button
10. ✅ Should see success message

If any step fails, that's where the problem is!
