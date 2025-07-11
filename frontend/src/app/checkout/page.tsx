'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { RootState } from '@/store/store';
import { clearCart } from '@/store/cartSlice';
import { CheckoutData, CheckoutStep, CHECKOUT_STEPS, OrderSummary, ShippingMethod, Address, PaymentMethod, PAYMENT_METHODS } from '@/types/checkout';
import { saveAddress, saveGuestAddress, CreateAddressRequest, getUserAddresses, AddressResponse, deleteAddress } from '@/lib/api/address';
import { createOrder, CreateOrderRequest, createDirectOrder, CreateDirectOrderRequest } from '@/lib/api/orders';
import { createCart, addToCartAPI } from '@/services/cartService';
import { useI18n } from '@/hooks/useI18n';
import { CheckoutValidationBar } from '@/components/inventory/CartValidationAlert';
import styles from './checkout.module.css';

// Components
import CustomerInformation from '../../components/Checkout/CustomerInformation';
import ShippingStep from '../../components/Checkout/ShippingStep';
import PaymentStep from '../../components/Checkout/PaymentStep';
import ConfirmationStep from '../../components/Checkout/ConfirmationStep';
import OrderSummaryComponent from '../../components/Checkout/OrderSummary';
import CheckoutSteps from '../../components/Checkout/CheckoutSteps';

export default function CheckoutPage() {
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const { items: cartItems, cartId } = useSelector((state: RootState) => state.cart);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  // Check if this is a Buy Now flow
  const [isBuyNowFlow, setIsBuyNowFlow] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);const [userAddresses, setUserAddresses] = useState<AddressResponse[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [autoSaveInProgress, setAutoSaveInProgress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Ensure component is mounted on client before accessing search params
  useEffect(() => {
    setIsClientMounted(true);
  }, []);
  // Redirect to login if user is not authenticated (COMMENTED OUT FOR GUEST CHECKOUT)
  // useEffect(() => {
  //   if (isClientMounted && !isAuthenticated) {
  //     // Store current path to redirect back after login
  //     const currentPath = '/checkout' + (window.location.search || '');
  //     localStorage.setItem('redirectAfterLogin', currentPath);
  //     router.push('/auth/login');
  //   }
  // }, [isClientMounted, isAuthenticated, router]);// Initialize Buy Now flow if URL parameters are present
  useEffect(() => {
    if (!isClientMounted || !searchParams) return;
    
    const isBuyNow = searchParams.get('buyNow') === 'true';
    
    if (isBuyNow) {
      setIsBuyNowFlow(true);
      
      // Extract product information from URL parameters
      const productData = {
        id: parseInt(searchParams.get('productId') || '0'),
        name: searchParams.get('productName') || '',
        slug: searchParams.get('productSlug') || '',
        price: parseFloat(searchParams.get('price') || '0'),
        quantity: parseInt(searchParams.get('quantity') || '1'),
        variantId: searchParams.get('variantId') ? parseInt(searchParams.get('variantId')!) : undefined,
        image: searchParams.get('image') || '',
        color: searchParams.get('color') || undefined,
        colorCode: searchParams.get('colorCode') || undefined,        size: searchParams.get('size') || undefined,
      };
        setBuyNowProduct(productData);
    } else {
      // Not a Buy Now flow, check if cart is empty and redirect if needed
      if (cartItems.length === 0) {
        router.push('/cart');
      }
    }
  }, [isClientMounted, searchParams, cartItems, router]);

  // Checkout state
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState<CheckoutStep[]>(CHECKOUT_STEPS);  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationWarnings, setShowValidationWarnings] = useState(false);
    // Form data
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customer_info: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    },
    shipping_address: {
      street_address: '',
      apartment: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'AU', // Default to Australia
    },
    save_address: false,
    shipping_method: null,
    payment_method: null,    customer_notes: '',
  });
  // Single standard shipping method with fixed $10 cost
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([
    {
      id: 1,
      name: t('checkout.shipping.standardShipping'),
      description: t('checkout.shipping.standardDescription'),
      cost: 15.00,
      estimated_delivery_min_days: 7,
      estimated_delivery_max_days: 30,
      is_active: true,
    },
  ]);

  // Reset validation warnings when form data changes (user starts typing)
  useEffect(() => {
    if (showValidationWarnings) {
      setShowValidationWarnings(false);
    }
  }, [checkoutData.customer_info, checkoutData.shipping_address]);

  // Initialize form with user data once user is available
  useEffect(() => {
    if (isAuthenticated && user && isClientMounted) {
      setCheckoutData(prev => ({
        ...prev,
        customer_info: {
          ...prev.customer_info,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          phone: user.phone_number || '',
        }
      }));
    }
  }, [isAuthenticated, user, isClientMounted]);

  // Auto-select single shipping method and payment method
  useEffect(() => {
    if (isClientMounted) {
      setCheckoutData(prev => {
        const updates: Partial<CheckoutData> = {};
        
        // Auto-select shipping method (only one available)
        if (!prev.shipping_method && shippingMethods.length === 1) {
          updates.shipping_method = shippingMethods[0];
        }
        
        // Auto-select payment method (only one available)
        if (!prev.payment_method && PAYMENT_METHODS.length === 1) {
          updates.payment_method = PAYMENT_METHODS[0];
        }
          // Only update if there are changes
        if (Object.keys(updates).length > 0) {
          return { ...prev, ...updates };
        }
        
        return prev;
      });
    }  }, [isClientMounted, shippingMethods]);
  // Load user addresses on component mount
  const loadUserAddresses = async () => {
    if (!isAuthenticated || !user) return;
    
    setIsLoadingAddresses(true);    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const addressesResponse = await getUserAddresses(token);
        
        // Ensure addresses is an array
        const addresses = Array.isArray(addressesResponse) ? addressesResponse : [];
        setUserAddresses(addresses);        
        // Note: Removed auto-population of form with default shipping address
        // Users must explicitly select an address to use it
        
        // Optional: You can still auto-populate customer info (name, phone) if needed
        // but not the shipping address fields
        // const defaultShippingAddress = addresses.find(addr => 
        //   addr.address_type === 'shipping' && addr.is_default_shipping
        // );
        
        // if (defaultShippingAddress && !checkoutData.customer_info.first_name) {
        //   setCheckoutData(prev => ({
        //     ...prev,
        //     customer_info: {
        //       ...prev.customer_info,
        //       first_name: prev.customer_info.first_name || defaultShippingAddress.recipient_name.split(' ')[0] || '',
        //       last_name: prev.customer_info.last_name || defaultShippingAddress.recipient_name.split(' ').slice(1).join(' ') || '',
        //       phone: prev.customer_info.phone || defaultShippingAddress.phone_number || '',
        //     },
        //   }));
        // }
      }
    } catch (error) {
      console.error('Failed to load user addresses:', error);
      // Set empty array on error to prevent crashes
      setUserAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Load addresses when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && isClientMounted) {
      loadUserAddresses();
    }
  }, [isAuthenticated, user, isClientMounted]);
  // Calculate order summary
  const calculateOrderSummary = (): OrderSummary => {
    // Use Buy Now product if in Buy Now flow, otherwise use cart items
    const items = isBuyNowFlow && buyNowProduct ? [buyNowProduct] : cartItems;
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping_cost = checkoutData.shipping_method?.cost || 0;
    const discount_amount = 0; // Add discount logic later
    const total_amount = subtotal + shipping_cost - discount_amount;

    return {
      subtotal,
      shipping_cost,
      tax_amount: 0,
      discount_amount,
      total_amount,
      items: items.map((item, index) => ({
        id: index + 1, // Use index + 1 to create unique IDs for order items
        product_id: item.id, // The actual product ID
        variant_id: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        color: item.color,
        colorCode: item.colorCode,
        size: item.size,
        variant: item.variantId ? `${item.color || ''} ${item.size || ''}`.trim() : undefined,
      })),
    };
  };
  const orderSummary = calculateOrderSummary();
  // Function to validate a specific step
  const validateStep = useCallback((stepNumber: number): boolean => {
    const tempErrors: Record<string, string> = {};    switch (stepNumber) {      case 1: // Customer Information
        if (!checkoutData.customer_info.first_name) {
          tempErrors.first_name = t('checkout.validation.firstNameRequired');
        }
        if (!checkoutData.customer_info.last_name) {
          tempErrors.last_name = t('checkout.validation.lastNameRequired');
        }
        if (!checkoutData.customer_info.email) {
          tempErrors.email = t('checkout.validation.emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutData.customer_info.email)) {
          tempErrors.email = t('checkout.validation.emailInvalid');
        }
        if (!checkoutData.shipping_address.street_address) {
          tempErrors.street_address = t('checkout.validation.addressRequired');
        }
        if (!checkoutData.shipping_address.city) {
          tempErrors.city = t('checkout.validation.cityRequired');
        }
        if (!checkoutData.shipping_address.state) {
          tempErrors.state = t('checkout.validation.stateRequired');
        }
        if (!checkoutData.shipping_address.postal_code) {
          tempErrors.postal_code = t('checkout.validation.postalCodeRequired');
        }
        break;

      case 2: // Shipping
        if (!checkoutData.shipping_method) {
          tempErrors.shipping_method = t('checkout.validation.shippingMethodRequired');
        }
        break;

      case 3: // Payment
        if (!checkoutData.payment_method) {
          tempErrors.payment_method = t('checkout.validation.paymentMethodRequired');
        }
        break;
    }

    return Object.keys(tempErrors).length === 0;
  }, [checkoutData]);  // Function to check if all previous steps are completed
  const areAllPreviousStepsValid = useCallback((targetStep: number): boolean => {
    for (let i = 1; i < targetStep; i++) {
      if (!validateStep(i)) {
        return false;
      }
    }
    return true;
  }, [validateStep]);  // Function to update step states
  const updateSteps = useCallback((currentStepNumber: number) => {
    setSteps(prevSteps => {
      return prevSteps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStepNumber;
        const isCurrent = stepNumber === currentStepNumber;
        
        // Determine accessibility - step 1 is always accessible
        // Other steps are accessible only if all previous steps are valid
        let isAccessible = stepNumber === 1;
        if (stepNumber > 1) {
          isAccessible = areAllPreviousStepsValid(stepNumber);
        }
        
        return {
          ...step,
          completed: isCompleted,
          current: isCurrent,
          accessible: isAccessible,
        };
      });
    });
  }, [areAllPreviousStepsValid]);  // Step navigation
  const goToStep = (stepNumber: number) => {
    // Find the step to check if it's accessible
    const targetStep = steps.find(step => step.id === stepNumber);
    
    // Only allow navigation if:
    // 1. Going back to a previous step, OR
    // 2. Going to an accessible step
    if (stepNumber <= currentStep || (targetStep && targetStep.accessible)) {
      setCurrentStep(stepNumber);
      // updateSteps will be called by the useEffect when currentStep changes
    }
  };
  // Update step accessibility when form data changes
  useEffect(() => {
    if (isClientMounted) {
      updateSteps(currentStep);
    }
  }, [checkoutData.customer_info, checkoutData.shipping_address, checkoutData.shipping_method, checkoutData.payment_method, currentStep, isClientMounted, updateSteps]);  const nextStep = () => {
    if (currentStep < 4) {
      // Reset validation warnings when moving to next step
      setShowValidationWarnings(false);
      setCurrentStep(currentStep + 1);
      // updateSteps will be called by the useEffect when currentStep changes
    }
  };
  const previousStep = () => {
    if (currentStep > 1) {
      // Reset validation warnings when going back
      setShowValidationWarnings(false);
      setCurrentStep(currentStep - 1);
      // updateSteps will be called by the useEffect when currentStep changes
    }
  };// Form handlers
  const updateCheckoutData = (data: Partial<CheckoutData>) => {
    setCheckoutData(prev => ({ ...prev, ...data }));
  };  const validateCurrentStep = (): boolean => {
    const isValid = validateStep(currentStep);
    
    // If validation fails, update errors state
    if (!isValid) {
      const newErrors: Record<string, string> = {};

      switch (currentStep) {        case 1: // Customer Information
          if (!checkoutData.customer_info.first_name) {
            newErrors.first_name = t('checkout.validation.firstNameRequired');
          }
          if (!checkoutData.customer_info.last_name) {
            newErrors.last_name = t('checkout.validation.lastNameRequired');
          }
          if (!checkoutData.customer_info.email) {
            newErrors.email = t('checkout.validation.emailRequired');
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutData.customer_info.email)) {
            newErrors.email = t('checkout.validation.emailInvalid');
          }
          if (!checkoutData.shipping_address.street_address) {
            newErrors.street_address = t('checkout.validation.addressRequired');
          }
          if (!checkoutData.shipping_address.city) {
            newErrors.city = t('checkout.validation.cityRequired');
          }
          if (!checkoutData.shipping_address.state) {
            newErrors.state = t('checkout.validation.stateRequired');
          }
          if (!checkoutData.shipping_address.postal_code) {
            newErrors.postal_code = t('checkout.validation.postalCodeRequired');
          }
          break;

        case 2: // Shipping
          if (!checkoutData.shipping_method) {
            newErrors.shipping_method = t('checkout.validation.shippingMethodRequired');
          }
          break;

        case 3: // Payment
          if (!checkoutData.payment_method) {
            newErrors.payment_method = t('checkout.validation.paymentMethodRequired');
          }
          break;
      }

      setErrors(newErrors);
    }
    
    return isValid;
  };

  // Function to get validation warnings for the continue button
  const getValidationWarnings = (): string[] => {
    const warnings: string[] = [];

    switch (currentStep) {
      case 1: // Customer Information
        if (!checkoutData.customer_info.first_name) {
          warnings.push(t('checkout.validation.firstNameRequired'));
        }
        if (!checkoutData.customer_info.last_name) {
          warnings.push(t('checkout.validation.lastNameRequired'));
        }
        if (!checkoutData.customer_info.email) {
          warnings.push(t('checkout.validation.emailRequired'));
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutData.customer_info.email)) {
          warnings.push(t('checkout.validation.emailInvalid'));
        }
        if (!checkoutData.shipping_address.street_address) {
          warnings.push(t('checkout.validation.addressRequired'));
        }
        if (!checkoutData.shipping_address.city) {
          warnings.push(t('checkout.validation.cityRequired'));
        }
        if (!checkoutData.shipping_address.state) {
          warnings.push(t('checkout.validation.stateRequired'));
        }
        if (!checkoutData.shipping_address.postal_code) {
          warnings.push(t('checkout.validation.postalCodeRequired'));
        }
        break;

      case 2: // Shipping
        if (!checkoutData.shipping_method) {
          warnings.push(t('checkout.validation.shippingMethodRequired'));
        }
        break;

      case 3: // Payment
        if (!checkoutData.payment_method) {
          warnings.push(t('checkout.validation.paymentMethodRequired'));
        }
        break;
    }

    return warnings;
  };

    // Auto-save address when proceeding from step 1 to step 2
  const autoSaveAddress = async () => {
    if (!isAuthenticated || !user || autoSaveInProgress) return;
    
    // Check if address information is filled
    const addressFilled = checkoutData.shipping_address.street_address && 
                         checkoutData.shipping_address.city && 
                         checkoutData.shipping_address.postal_code &&
                         checkoutData.customer_info.first_name &&
                         checkoutData.customer_info.last_name;
    
    if (!addressFilled) return;
    
    setAutoSaveInProgress(true);
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Ensure userAddresses is an array before using find
        const addressesArray = Array.isArray(userAddresses) ? userAddresses : [];
        
        // Check if we already have this address
        const existingAddress = addressesArray.find(addr => 
          addr.street_address === checkoutData.shipping_address.street_address &&
          addr.city === checkoutData.shipping_address.city &&
          addr.postal_code === checkoutData.shipping_address.postal_code
        );
        
        if (!existingAddress) {
          const addressData: CreateAddressRequest = {
            address_type: 'shipping',
            recipient_name: `${checkoutData.customer_info.first_name} ${checkoutData.customer_info.last_name}`.trim(),
            street_address: checkoutData.shipping_address.street_address,
            address_line_2: checkoutData.shipping_address.apartment || undefined,
            city: checkoutData.shipping_address.city,
            state_province: checkoutData.shipping_address.state || '',
            postal_code: checkoutData.shipping_address.postal_code,
            country_code: checkoutData.shipping_address.country,
            phone_number: checkoutData.customer_info.phone || undefined,
            is_default_shipping: addressesArray.length === 0, // Make first address default
            is_default_billing: addressesArray.length === 0,          };
          
          const savedAddress = await saveAddress(addressData, token);
          
          // Update local addresses list
          setUserAddresses(prev => {
            const prevArray = Array.isArray(prev) ? prev : [];
            return [...prevArray, savedAddress];
          });
        }
      }
    } catch (error) {
      console.error('Failed to auto-save address:', error);
      // Don't show error to user for auto-save failures
    } finally {
      setAutoSaveInProgress(false);
    }
  };  // Load a specific saved address into the form
  const loadSavedAddress = (address: AddressResponse) => {
    setSelectedAddressId(address.id);
    setCheckoutData(prev => ({
      ...prev,
      // Do NOT auto-fill customer info from address data
      // Customer info should only be filled from user profile data
      shipping_address: {
        street_address: address.street_address,
        apartment: address.address_line_2 || '',
        city: address.city,
        state: address.state_province,
        postal_code: address.postal_code,
        country: address.country_code,
      },
    }));
  };
  // Delete a saved address
  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm(t('checkout.confirmations.deleteAddress'))) return;
    
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await deleteAddress(addressId, token);
        
        // Update local addresses list
        setUserAddresses(prev => prev.filter(addr => addr.id !== addressId));
          // If the deleted address was selected, clear selection
        if (selectedAddressId === addressId) {
          setSelectedAddressId(null);
          // Optionally clear the form or load another address
        }
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
      // You could show a toast notification here
    }
  };
  const handleContinue = () => {
    console.log('=== HANDLE CONTINUE CLICKED ===');    console.log('Current step:', currentStep);
    
    // Show validation warnings when user clicks continue
    setShowValidationWarnings(true);
    
    const isValid = validateCurrentStep();
    console.log('Validation result:', isValid);
    
    if (isValid) {
      // Hide validation warnings since validation passed
      setShowValidationWarnings(false);
        // Auto-save address when moving from step 1 to step 2
      if (currentStep === 1) {
        console.log('Step 1: Auto-saving address and moving to next step');
        autoSaveAddress().then(() => {
          nextStep();
        });
      } else if (currentStep === 4) {
        console.log('Step 4: Starting order submission');
        // Final submission
        handleOrderSubmission();
      } else {
        console.log(`Step ${currentStep}: Moving to next step`);
        nextStep();
      }    } else {
      console.log('Validation failed, errors:', errors);
      // Validation warnings will be shown because showValidationWarnings is now true
    }};

const handleOrderSubmission = async () => {
    setIsLoading(true);
    console.log('=== ORDER SUBMISSION STARTED ===');
    console.log('Current step:', currentStep);
    console.log('Cart ID:', cartId);
    console.log('Selected Address ID:', selectedAddressId);
    console.log('Is authenticated:', isAuthenticated);
    console.log('User:', user);
    console.log('Checkout data:', checkoutData);
    console.log('Is buy now flow:', isBuyNowFlow);
    
    try {      // Create the order before redirecting to payment
      let savedAddressId = selectedAddressId;
      let createdOrder = null;      // Save address for both authenticated and guest users if needed
      if (!selectedAddressId) {
        console.log('Creating address for order (save_address=', checkoutData.save_address, ')');
        try {
          const token = localStorage.getItem('access_token');          
          // Prepare shipping address data
          const shippingAddressData: CreateAddressRequest = {
            address_type: 'shipping',
            recipient_name: `${checkoutData.customer_info.first_name} ${checkoutData.customer_info.last_name}`.trim(),
            street_address: checkoutData.shipping_address.street_address,
            address_line_2: checkoutData.shipping_address.apartment || undefined,
            city: checkoutData.shipping_address.city,
            state_province: (checkoutData.shipping_address.state || '').trim() || 'N/A', // Ensure we never send empty string
            postal_code: checkoutData.shipping_address.postal_code,
            country_code: checkoutData.shipping_address.country,
            phone_number: checkoutData.customer_info.phone || undefined,
            is_default_shipping: isAuthenticated ? checkoutData.save_address : false, // Only set as default for authenticated users
            is_default_billing: isAuthenticated ? checkoutData.save_address : false,
          };

          console.log('Address data to save:', shippingAddressData);

          // Save address (authenticated users vs guest users)
          let savedAddress;
          if (isAuthenticated && token) {
            console.log('Saving address for authenticated user');
            savedAddress = await saveAddress(shippingAddressData, token);
          } else {
            console.log('Saving address for guest user');
            savedAddress = await saveGuestAddress(shippingAddressData);
          }
          
          savedAddressId = savedAddress.id;
          console.log('Address saved successfully:', savedAddress);
        } catch (addressError) {
          console.error('Failed to save address:', addressError);
          throw new Error('Failed to save shipping address: ' + (addressError instanceof Error ? addressError.message : 'Unknown error'));
        }
      } else if (selectedAddressId) {
        console.log('Using existing selected address:', selectedAddressId);
        savedAddressId = selectedAddressId;
      }// For Buy Now flow, use direct order creation
      if (isBuyNowFlow && buyNowProduct) {
        console.log('=== BUY NOW FLOW - CREATING DIRECT ORDER ===');
        console.log('Buy now product:', buyNowProduct);
          if (!savedAddressId) {
          console.log('=== ERROR: NO ADDRESS ID ===');
          throw new Error('Shipping address is required. Please ensure address is saved or selected.');
        }

        // Get authentication token if available (optional for guest checkout)
        const token = localStorage.getItem('access_token');
        // if (!token) {
        //   console.log('=== ERROR: NO AUTH TOKEN ===');
        //   throw new Error('Authentication required');
        // }
        if (token) {
          console.log('✓ Auth token available for Buy Now');
        } else {
          console.log('⚠ No auth token - proceeding as guest Buy Now');
        }        // Create direct order data
        const createDirectOrderData: CreateDirectOrderRequest = {
          product_id: buyNowProduct.id,
          quantity: buyNowProduct.quantity || 1,
          shipping_address_id: savedAddressId,
          billing_address_id: savedAddressId, // Always use same address for billing
          shipping_method_id: checkoutData.shipping_method?.id || 1,
          customer_notes: checkoutData.customer_notes || '',
        };

        // Add guest email if user is not authenticated
        if (!isAuthenticated) {
          createDirectOrderData.email_for_guest = checkoutData.customer_info.email;
        }

        // Add optional fields only if they exist
        if (buyNowProduct.variantId) {
          createDirectOrderData.product_variant_id = buyNowProduct.variantId;
        }
        if (buyNowProduct.color) {
          createDirectOrderData.color = buyNowProduct.color;
        }
        if (buyNowProduct.colorCode) {
          createDirectOrderData.color_code = buyNowProduct.colorCode;
        }
        if (buyNowProduct.size) {
          createDirectOrderData.size = buyNowProduct.size;
        }
        if (buyNowProduct.image) {
          createDirectOrderData.product_image = buyNowProduct.image;
        }

        console.log('=== SENDING DIRECT ORDER CREATION REQUEST ===');
        console.log('Direct order data:', createDirectOrderData);        // Create the order directly
        createdOrder = await createDirectOrder(createDirectOrderData, token || undefined);
        
        console.log('=== DIRECT ORDER CREATED SUCCESSFULLY ===');
        console.log('Created order:', createdOrder);      } else {
        console.log('=== REGULAR CHECKOUT FLOW - PROCEEDING WITH ORDER CREATION ===');

        // For regular checkout, ensure we have a cart with items
        let orderCartId = cartId;
        
        // If no cart ID exists (single item purchase), create a temporary cart
        if (!orderCartId) {
          console.log('=== NO CART ID - CREATING TEMPORARY CART FOR SINGLE ITEM ===');
          
          // Determine the items to add to cart
          const itemsToAdd = isBuyNowFlow && buyNowProduct ? [buyNowProduct] : cartItems;
          
          if (itemsToAdd.length === 0) {
            throw new Error('No items to order. Please add items to cart first.');
          }
          
          console.log('Items to add to cart:', itemsToAdd);
          
          // Create a new cart
          const newCart = await createCart();
          if (!newCart) {
            throw new Error('Failed to create cart for order');
          }
          
          orderCartId = newCart.cart_id;
          console.log('✓ Temporary cart created:', orderCartId);
          
          // Add items to the cart
          for (const item of itemsToAdd) {
            const addToCartData = {
              drop_product: item.dropProductId,
              product_variant: item.variantId,
              quantity: item.quantity,
              color: item.color,
              color_code: item.colorCode,
              size: item.size,
            };
            
            console.log('Adding item to cart:', addToCartData);
            
            const addedItem = await addToCartAPI(orderCartId, addToCartData);
            if (!addedItem) {
              throw new Error(`Failed to add ${item.name} to cart`);
            }
          }
          
          console.log('✓ All items added to temporary cart');
        }

        if (!orderCartId) {
          console.log('=== ERROR: NO CART ID AVAILABLE ===');
          throw new Error('Cart ID not available. Please refresh and try again.');
        }
        console.log('✓ Cart ID available:', orderCartId);

        if (!savedAddressId) {
          console.log('=== ERROR: NO ADDRESS ID ===');
          throw new Error('Shipping address is required. Please ensure address is saved or selected.');
        }
        console.log('✓ Address ID available:', savedAddressId);        // Get authentication token if user is logged in (optional for guest checkout)
        const token = localStorage.getItem('access_token');
        // if (!token) {
        //   console.log('=== ERROR: NO AUTH TOKEN ===');
        //   throw new Error('Authentication required');
        // }
        if (token) {
          console.log('✓ Auth token available');
        } else {
          console.log('⚠ No auth token - proceeding as guest checkout');
        }        console.log('=== CREATING ORDER ===');
        
        // Create order data
        const createOrderData: CreateOrderRequest = {
          cart_id: orderCartId,
          shipping_address_id: savedAddressId,
          billing_address_id: savedAddressId, // Use same address for billing
          shipping_method_id: checkoutData.shipping_method?.id || 1, // Default to first shipping method
          customer_notes: checkoutData.customer_notes || '',
        };

        // Add guest email if user is not authenticated
        if (!isAuthenticated) {
          createOrderData.email_for_guest = checkoutData.customer_info.email;
        }

        console.log('=== SENDING ORDER CREATION REQUEST ===');
        console.log('Order data:', createOrderData);

        // Create the order with pending status
        createdOrder = await createOrder(createOrderData, token);
        
        console.log('=== ORDER CREATED SUCCESSFULLY ===');
        console.log('Created order:', createdOrder);

        // Clear the cart after successful order creation
        dispatch(clearCart());
      }      console.log('=== REDIRECTING TO PAYPRO PAYMENT ===');
      console.log('Order created successfully:', createdOrder);
      
      // Always use PayPro payment integration instead of external links
      // Redirect to PayPro payment page with order ID
      console.log('Redirecting to PayPro payment page for order:', createdOrder.id);
      window.location.href = `/payment?order_id=${createdOrder.id}`;} catch (error) {
      console.error('=== ORDER SUBMISSION FAILED ===');
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setErrors({ submit: t('checkout.error.orderSubmissionFailed') + ': ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setIsLoading(false);
    }
  };
    
  // Don't render anything until client is mounted to prevent hydration mismatch
  if (!isClientMounted) {
    return (
      <div className={styles.checkoutPage}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t('checkout.loading')}</h1>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if cart is empty and not in Buy Now flow
  if (!isBuyNowFlow && cartItems.length === 0) {
    return (      <div className={styles.emptyCart}>
        <h2>{t('checkout.emptyCart.title')}</h2>
        <p>{t('checkout.emptyCart.message')}</p>
      </div>
    );
  }

  // Don't render if in Buy Now flow but no product data
  if (isBuyNowFlow && !buyNowProduct) {
    return (      <div className={styles.emptyCart}>
        <h2>{t('checkout.error.title')}</h2>
        <p>{t('checkout.error.productLoadFailed')}</p>
      </div>
    );
  }
  return (
    <div className={styles.checkoutPage}>
      <div className={styles.container}>        
        <div className={styles.header}>
          <h1 className={styles.title}>{t('checkout.title')}</h1>
          <CheckoutSteps steps={steps} currentStep={currentStep} onStepClick={goToStep} />
        </div>

        {/* Checkout Validation Bar */}
        <CheckoutValidationBar 
          onValidationResult={(isValid) => {
            // Could disable checkout button if not valid
            console.log('Cart validation result:', isValid);
          }}
          className={styles.checkoutValidation}
        />

        <div className={styles.content}>
          <div className={styles.mainContent}>            {currentStep === 1 && (
              <CustomerInformation
                checkoutData={checkoutData}
                updateCheckoutData={updateCheckoutData}
                errors={errors}
                isAuthenticated={isAuthenticated}
                userAddresses={userAddresses}
                isLoadingAddresses={isLoadingAddresses}
                autoSaveInProgress={autoSaveInProgress}
                onLoadSavedAddress={loadSavedAddress}
                onDeleteAddress={handleDeleteAddress}
                selectedAddressId={selectedAddressId}
              />
            )}

            {currentStep === 2 && (
              <ShippingStep
                checkoutData={checkoutData}
                updateCheckoutData={updateCheckoutData}
                shippingMethods={shippingMethods}
                errors={errors}
              />
            )}

            {currentStep === 3 && (
              <PaymentStep
                checkoutData={checkoutData}
                updateCheckoutData={updateCheckoutData}
                paymentMethods={PAYMENT_METHODS}
                errors={errors}
                orderSummary={orderSummary}
              />
            )}            {currentStep === 4 && (
              <ConfirmationStep
                checkoutData={checkoutData}
                orderSummary={orderSummary}
                onPlaceOrder={handleOrderSubmission}
                isLoading={isLoading}
              />
            )}            {/* Navigation */}
            {currentStep < 4 && (
              <div className={styles.navigation}>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={previousStep}
                    className={styles.backButton}
                    disabled={isLoading}
                  >
                    {t('checkout.navigation.back')}
                  </button>
                )}                <button
                  type="button"
                  onClick={handleContinue}
                  className={styles.continueButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className={styles.spinner}></span>
                      {t('checkout.navigation.processing')}
                    </>
                  ) : (
                    t('checkout.navigation.continue')
                  )}
                </button>                {/* Validation warnings below continue button */}
                {showValidationWarnings && getValidationWarnings().length > 0 && (
                  <div className={styles.validationWarnings}>
                    <div className={styles.warningHeader}>
                      ⚠️ {t('checkout.validation.pleaseComplete')}:
                    </div>
                    <ul className={styles.warningList}>
                      {getValidationWarnings().map((warning, index) => (
                        <li key={index} className={styles.warningItem}>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Back button only for step 4 */}
            {currentStep === 4 && (
              <div className={styles.navigation}>
                <button
                  type="button"
                  onClick={previousStep}
                  className={styles.backButton}
                  disabled={isLoading}
                >
                  {t('checkout.navigation.back')}
                </button>
              </div>            )}

            {errors.submit && (
              <div className={styles.errorMessage}>
                {errors.submit}
              </div>
            )}
          </div>{/* Order Summary Sidebar */}
          <div className={styles.sidebar}>
            <OrderSummaryComponent
              orderSummary={orderSummary}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
