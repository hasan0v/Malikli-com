// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  // Track page load times
  trackPageLoad(pageName: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      this.metrics.set(`page_load_${pageName}`, loadTime);
      console.log(`📊 Page Load Time for ${pageName}: ${loadTime}ms`);
    }
  }
  
  // Track API response times
  trackApiCall(endpoint: string, startTime: number): void {
    const endTime = Date.now();
    const duration = endTime - startTime;
    this.metrics.set(`api_${endpoint}`, duration);
    console.log(`📊 API Call ${endpoint}: ${duration}ms`);
  }
  
  // Track third-party script errors
  trackThirdPartyErrors(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        const errorUrl = event.filename || '';
        if (errorUrl.includes('rokt.com') || errorUrl.includes('third-party')) {
          console.warn(`⚠️ Third-party script error: ${errorUrl}`, event.error);
          // You could send this to your analytics service
        }
      });
      
      // Track failed network requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [url] = args;
        const startTime = Date.now();
        
        try {
          const response = await originalFetch(...args);
          const duration = Date.now() - startTime;
          
          if (typeof url === 'string' && url.includes('rokt.com')) {
            console.warn(`⚠️ Third-party request to ${url}: ${response.status} (${duration}ms)`);
          }
          
          return response;
        } catch (error) {
          const duration = Date.now() - startTime;
          if (typeof url === 'string' && url.includes('rokt.com')) {
            console.error(`❌ Failed third-party request to ${url}: ${duration}ms`, error);
          }
          throw error;
        }
      };
    }
  }
  
  // Get performance metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
  
  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Initialize performance monitoring
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-track third-party errors
if (typeof window !== 'undefined') {
  performanceMonitor.trackThirdPartyErrors();
}
