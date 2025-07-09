/**
 * PayPro Hosted Checkout Integration - Frontend Example
 * 
 * This example shows how to integrate with the updated PayPro hosted payment flow.
 * Instead of showing a local payment form, users are redirected to PayPro's secure checkout.
 */

// Payment initiation function
async function initiatePayment(orderId) {
    try {
        console.log('Initiating PayPro hosted payment for order:', orderId);
        
        // Call backend to create PayPro payment token
        const response = await fetch('/api/v1/payments/initiate/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken() // If CSRF protection is enabled
            },
            body: JSON.stringify({
                order_id: orderId,
                language: 'en' // Optional: payment page language
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.payment_url) {
            console.log('Payment token created successfully');
            console.log('Token:', data.token);
            console.log('Redirecting to PayPro hosted checkout...');
            
            // Store order info in session storage for later reference
            sessionStorage.setItem('currentOrder', JSON.stringify({
                orderId: data.order_id,
                amount: data.amount,
                currency: data.currency,
                token: data.token
            }));
            
            // Redirect to PayPro hosted checkout page
            window.location.href = data.payment_url;
            
        } else {
            console.error('Payment initiation failed:', data.error_message);
            showErrorMessage(data.error_message || 'Payment initiation failed');
            
            // Show validation errors if any
            if (data.error_details && data.error_details.length > 0) {
                data.error_details.forEach(error => {
                    console.error('Validation error:', error);
                });
            }
        }
        
    } catch (error) {
        console.error('Error initiating payment:', error);
        showErrorMessage('Unable to initiate payment. Please try again.');
    }
}

// Function to check payment status (useful for polling or verification)
async function checkPaymentStatus(token, orderId) {
    try {
        const response = await fetch(`/api/v1/payments/status/?token=${token}&order_id=${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Payment status:', data.payment_status);
            console.log('Order info:', data.order);
            
            return {
                status: data.payment_status,
                order: data.order,
                transactionId: data.transaction_id
            };
        } else {
            console.error('Failed to check payment status:', data.error_message);
            return null;
        }
        
    } catch (error) {
        console.error('Error checking payment status:', error);
        return null;
    }
}

// Payment success page handler
function handlePaymentSuccess() {
    // This function runs on the payment success page
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const status = urlParams.get('status');
    
    console.log('Payment success page loaded');
    console.log('Order ID:', orderId);
    console.log('Status:', status);
    
    // Get order info from session storage
    const orderInfo = JSON.parse(sessionStorage.getItem('currentOrder') || '{}');
    
    if (orderId && status === 'success') {
        showSuccessMessage(`Payment completed successfully! Order #${orderId}`);
        
        // Optional: Check final payment status
        if (orderInfo.token) {
            checkPaymentStatus(orderInfo.token, orderId).then(statusData => {
                if (statusData && statusData.status === 'completed') {
                    console.log('Payment confirmed as completed');
                    // Update UI to show order details
                    displayOrderSummary(statusData.order);
                }
            });
        }
        
        // Clear session storage
        sessionStorage.removeItem('currentOrder');
        
        // Redirect to order confirmation page after delay
        setTimeout(() => {
            window.location.href = `/orders/${orderId}`;
        }, 3000);
        
    } else if (status === 'already_paid') {
        showInfoMessage('This order has already been paid for.');
        setTimeout(() => {
            window.location.href = `/orders/${orderId}`;
        }, 2000);
        
    } else {
        showErrorMessage('Payment verification failed. Please contact support.');
    }
}

// Payment cancel page handler
function handlePaymentCancel() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    
    console.log('Payment cancelled by user');
    console.log('Order ID:', orderId);
    
    showInfoMessage('Payment was cancelled. You can try again or choose a different payment method.');
    
    // Clear session storage
    sessionStorage.removeItem('currentOrder');
    
    // Redirect back to order page
    if (orderId) {
        setTimeout(() => {
            window.location.href = `/orders/${orderId}`;
        }, 3000);
    } else {
        setTimeout(() => {
            window.location.href = '/orders';
        }, 3000);
    }
}

// Payment failed page handler
function handlePaymentFailed() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const errorCode = urlParams.get('error');
    
    console.log('Payment failed');
    console.log('Order ID:', orderId);
    console.log('Error code:', errorCode);
    
    let errorMessage = 'Payment failed. Please try again.';
    
    // Customize error message based on error code
    switch (errorCode) {
        case 'insufficient_funds':
            errorMessage = 'Payment failed due to insufficient funds. Please check your account or use a different card.';
            break;
        case 'card_declined':
            errorMessage = 'Your card was declined. Please try a different payment method.';
            break;
        case 'expired_card':
            errorMessage = 'Your card has expired. Please use a valid card.';
            break;
        case 'processing_error':
            errorMessage = 'There was an error processing your payment. Please try again.';
            break;
        default:
            errorMessage = `Payment failed (${errorCode}). Please try again or contact support.`;
    }
    
    showErrorMessage(errorMessage);
    
    // Clear session storage
    sessionStorage.removeItem('currentOrder');
    
    // Redirect back to order page to retry
    if (orderId) {
        setTimeout(() => {
            window.location.href = `/orders/${orderId}`;
        }, 5000);
    } else {
        setTimeout(() => {
            window.location.href = '/orders';
        }, 5000);
    }
}

// Utility functions
function getCsrfToken() {
    // Get CSRF token from cookie or meta tag
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    
    return cookieValue || document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

function showSuccessMessage(message) {
    // Implement your success message display logic
    console.log('SUCCESS:', message);
    // Example: show toast, update DOM, etc.
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

function showErrorMessage(message) {
    // Implement your error message display logic
    console.error('ERROR:', message);
    // Example: show error toast, update DOM, etc.
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showInfoMessage(message) {
    // Implement your info message display logic
    console.log('INFO:', message);
    const infoDiv = document.getElementById('info-message');
    if (infoDiv) {
        infoDiv.textContent = message;
        infoDiv.style.display = 'block';
    }
}

function displayOrderSummary(order) {
    // Display order summary on success page
    if (order) {
        console.log('Order summary:', order);
        // Update DOM with order details
        const summaryDiv = document.getElementById('order-summary');
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <h3>Order #${order.order_number}</h3>
                <p>Amount: ${order.total_amount} ${order.currency || 'EUR'}</p>
                <p>Status: ${order.payment_status}</p>
                <p>Order Status: ${order.order_status}</p>
            `;
        }
    }
}

// Example usage:
// 
// On order checkout page:
// document.getElementById('pay-button').addEventListener('click', () => {
//     initiatePayment('order-uuid-here');
// });
//
// On payment success page:
// document.addEventListener('DOMContentLoaded', handlePaymentSuccess);
//
// On payment cancel page:
// document.addEventListener('DOMContentLoaded', handlePaymentCancel);
//
// On payment failed page:
// document.addEventListener('DOMContentLoaded', handlePaymentFailed);

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initiatePayment,
        checkPaymentStatus,
        handlePaymentSuccess,
        handlePaymentCancel,
        handlePaymentFailed
    };
}
