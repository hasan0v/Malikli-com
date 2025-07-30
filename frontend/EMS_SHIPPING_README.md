# EMS International Shipping Calculator

A comprehensive shipping calculator for EMS (Express Mail Service) international deliveries, built for the Malikli-com e-commerce platform. This calculator provides accurate shipping rates based on destination, weight, and package type.

## Features

### 🌍 **International Coverage**
- Support for 20+ major international destinations
- Accurate country-specific rates from official EMS tariffs
- Real-time rate calculation based on destination

### ⚖️ **Weight-Based Calculation**
- Precise weight calculation (400g per item)
- Automatic tier calculation:
  - Up to 500g
  - 500g to 1000g 
  - Additional weight charges per kg
- Support for both goods and documents

### 💰 **Complete Cost Breakdown**
- Base shipping rates
- Additional weight charges
- Customs clearance fees (€2.41)
- Declared value fees (3% of order value)
- Total cost calculation with all fees included

### 🎨 **Modern UI/UX**
- Responsive design for all devices
- Real-time calculation updates
- Interactive country selection
- Animated loading states
- Clear cost breakdown display

## Implementation

### Core Files

```
frontend/src/
├── utils/emsShippingCalculator.ts     # Core calculation logic
├── components/
│   ├── EMSShippingCalculator.tsx      # Main calculator component
│   ├── EMSShippingCalculator.module.css
│   ├── EMSDemo.tsx                    # Demo page component
│   ├── EMSDemo.module.css
│   └── Checkout/
│       ├── ShippingStep.tsx           # Updated checkout integration
│       └── ShippingStep.module.css
└── app/ems-shipping/page.tsx          # Demo page route
```

### Usage Examples

#### 1. Standalone Calculator
```tsx
import EMSShippingCalculator from '@/components/EMSShippingCalculator';

function ShippingPage() {
  const handleCalculation = (calculation) => {
    if (calculation?.isAvailable) {
      console.log('Shipping cost:', calculation.finalTotal);
    }
  };

  return (
    <EMSShippingCalculator
      itemCount={3}
      declaredValue={250}
      selectedCountry="Germany"
      onShippingCalculated={handleCalculation}
    />
  );
}
```

#### 2. Checkout Integration
```tsx
import { getEMSShippingMethod } from '@/utils/emsShippingCalculator';

// Get EMS as a shipping method option
const emsMethod = getEMSShippingMethod('United States', 2, 150);
if (emsMethod) {
  // Add to available shipping methods
  shippingMethods.push(emsMethod);
}
```

#### 3. Direct Calculation
```tsx
import { calculateEMSShipping } from '@/utils/emsShippingCalculator';

const result = calculateEMSShipping('France', {
  itemCount: 4,
  declaredValue: 300,
  type: 'goods'
});

console.log('Total shipping:', result.finalTotal);
console.log('Breakdown:', {
  base: result.baseRate,
  additional: result.additionalKgRate,
  customs: result.customsClearanceFee,
  declared: result.declaredValueFee
});
```

## Supported Countries

The calculator currently supports the following destinations:

- **Europe**: Austria, Belgium, Denmark, France, Germany, Italy, Netherlands, Norway, Poland, Spain, Sweden, Switzerland, United Kingdom
- **North America**: Canada, United States
- **Asia-Pacific**: Australia, China, Japan
- **Others**: Brazil, Russian Federation

*Additional countries can be added by extending the `emsShippingRates` array in the calculator utility.*

## Rate Structure

### Weight Tiers
1. **Up to 500g**: Base rate for small packages
2. **500g to 1000g**: Mid-tier rate for medium packages  
3. **Over 1000g**: Base rate + additional charges per kg

### Additional Fees
- **Customs Clearance**: €2.41 (fixed fee)
- **Declared Value Fee**: 3% of order total (when declared value > 0)

### Package Types
- **Goods**: Commercial items, products (default)
- **Documents**: Papers, certificates (typically lower rates)

## API Reference

### Main Functions

#### `calculateEMSShipping(country, options)`
Calculates complete EMS shipping cost for a destination.

**Parameters:**
- `country` (string): Destination country name
- `options` (object):
  - `itemCount` (number): Number of items to ship
  - `declaredValue` (number, optional): Order value in EUR
  - `type` ('goods' | 'documents', optional): Package type

**Returns:** `EMSShippingCalculation` object with cost breakdown

#### `getAvailableEMSCountries()`
Returns array of all supported destination countries.

#### `getEMSShippingMethod(country, itemCount, declaredValue)`
Formats EMS calculation as a shipping method for checkout integration.

## Configuration

### Weight Per Item
Default: 400 grams per item (configurable in `ITEM_WEIGHT_GRAMS`)

### Rate Updates
Rates are based on official EMS tariffs as of January 1, 2025. To update rates:

1. Update the `emsShippingRates` array in `emsShippingCalculator.ts`
2. Modify `CUSTOMS_CLEARANCE_FEE_EUR` and `DECLARED_VALUE_FEE_PERCENTAGE` if needed
3. Test calculations with the demo page

## Testing

### Demo Page
Visit `/ems-shipping` to test the calculator with different configurations:
- Adjust item count and declared value
- Select various destinations
- View detailed cost breakdowns
- Test responsive design

### Integration Testing
The calculator integrates with the existing checkout flow in `ShippingStep.tsx`:
1. Toggle EMS calculator visibility
2. Calculate rates based on cart contents
3. Add EMS as shipping method option
4. Select EMS for checkout completion

## Responsive Design

The calculator is fully responsive with breakpoints:
- **Desktop**: Full-width with side-by-side panels
- **Tablet**: Stacked layout with optimized spacing
- **Mobile**: Single-column with touch-friendly controls

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lightweight calculation engine
- Debounced input handling
- Efficient country filtering
- Minimal re-renders with React optimization

## Future Enhancements

1. **Extended Country Support**: Add more international destinations
2. **Bulk Discounts**: Volume-based rate reductions
3. **Express Options**: Multiple delivery speed tiers
4. **Insurance Options**: Additional coverage levels
5. **Currency Support**: Multi-currency rate display
6. **Rate History**: Track and display rate changes

## License

This implementation is part of the Malikli-com e-commerce platform and follows the project's licensing terms.
