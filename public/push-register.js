/**
 * Push Notification Registration Script
 * Add this to your website/app to register phone numbers with push tokens
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. Call registerPhoneForPush(phoneNumber, pushToken, deviceType)
 */

async function registerPhoneForPush(phoneNumber, pushToken, deviceType = 'web') {
  try {
    const response = await fetch('/api/push/register-phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        push_token: pushToken,
        deviceType: deviceType,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Phone number registered for push notifications:', data);
      return { success: true, data };
    } else {
      console.error('Registration failed:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error registering phone for push:', error);
    return { success: false, error: error.message };
  }
}

// Example: Auto-register when user logs in (if you have OneSignal)
if (typeof OneSignal !== 'undefined') {
  OneSignal.push(function() {
    OneSignal.getUserId(function(userId) {
      if (userId) {
        // Get user's phone number from your auth system
        const userPhone = getUserPhoneNumber(); // Implement this function
        if (userPhone) {
          registerPhoneForPush(userPhone, userId, 'web');
        }
      }
    });
  });
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerPhoneForPush };
}

