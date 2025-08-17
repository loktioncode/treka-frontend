# Navigation System Refactor

## Overview
This refactor eliminates navigation delays and implements smooth page transitions with skeleton loaders for a better user experience.

## Key Components

### 1. NavigationContext (`/src/contexts/NavigationContext.tsx`)
- Manages navigation state and transitions
- Provides smooth navigation with loading overlays
- Handles data preloading for target pages

### 2. SmartLink (`/src/components/SmartLink.tsx`)
- Replaces standard Next.js Link components
- Automatically preloads data on hover
- Provides smooth navigation transitions
- Supports different variants (default, nav, button)

### 3. PageTransition (`/src/components/PageTransition.tsx`)
- Wraps page content for smooth transitions
- Shows skeleton loaders during route changes
- Provides consistent loading experience

### 4. LoadingState (`/src/components/ui/loading-state.tsx`)
- Reusable loading components
- Consistent loading UI across the app
- Supports different sizes and text

### 5. usePrefetch Hook (`/src/hooks/usePrefetch.ts`)
- Preloads data for better performance
- Uses React Query for efficient caching
- Supports client, client users, and other data types

### 6. useRoutePrefetch Hook (`/src/hooks/useRoutePrefetch.ts`)
- Automatically preloads data for adjacent routes
- Improves perceived performance
- Runs automatically in DashboardLayout

## Usage

### Basic Navigation
```tsx
import { SmartLink } from '@/components/SmartLink';

// Navigation link with hover preloading
<SmartLink href="/dashboard/clients" variant="nav">
  Clients
</SmartLink>

// Button-style navigation
<SmartLink href="/dashboard/profile" variant="button">
  View Profile
</SmartLink>

// Custom styling with preloading disabled
<SmartLink 
  href="/dashboard/settings" 
  preload={false}
  className="text-blue-600 hover:text-blue-800"
>
  Settings
</SmartLink>
```

### Page Transitions
```tsx
import { PageTransition } from '@/components/PageTransition';

// Basic page wrapper
export default function MyPage() {
  return (
    <PageTransition>
      <div>Page content</div>
    </PageTransition>
  );
}

// With custom styling
export default function ClientsPage() {
  return (
    <PageTransition className="max-w-7xl mx-auto">
      <div className="space-y-6">
        <h1>Clients</h1>
        {/* Page content */}
      </div>
    </PageTransition>
  );
}
```

### Loading States
```tsx
import { LoadingState, LoadingOverlay } from '@/components/ui/loading-state';

// Inline loading state
<LoadingState size="lg" text="Loading data...">
  <p className="text-sm text-gray-500">This may take a moment...</p>
</LoadingState>

// Full screen overlay
<LoadingOverlay text="Saving changes..." />

// Small loading indicator
<LoadingState size="sm" text="" />

// Custom loading message
<LoadingState size="md" text="Fetching user data...">
  <div className="mt-2 text-xs text-gray-400">
    Please wait while we load your information
  </div>
</LoadingState>
```

### Navigation Context Usage
```tsx
import { useNavigation } from '@/contexts/NavigationContext';

export default function MyComponent() {
  const { navigateTo, preloadPage, isNavigating } = useNavigation();

  const handleNavigation = () => {
    // Smooth navigation with transition
    navigateTo('/dashboard/clients');
  };

  const handlePreload = () => {
    // Preload data without navigation
    preloadPage('/dashboard/clients');
  };

  return (
    <div>
      <button onClick={handleNavigation}>
        Go to Clients
      </button>
      
      <button onMouseEnter={handlePreload}>
        Hover to Preload
      </button>
      
      {isNavigating && <p>Navigating...</p>}
    </div>
  );
}
```

### Data Prefetching
```tsx
import { usePrefetch } from '@/hooks/usePrefetch';

export default function NavigationMenu() {
  const { prefetchClients, prefetchClient } = usePrefetch();

  const handleClientHover = (clientId: string) => {
    // Preload specific client data
    prefetchClient(clientId);
  };

  const handleClientsHover = () => {
    // Preload clients list
    prefetchClients();
  };

  return (
    <nav>
      <div 
        onMouseEnter={handleClientsHover}
        className="p-2 hover:bg-gray-100"
      >
        All Clients
      </div>
      
      {clients.map(client => (
        <div
          key={client.id}
          onMouseEnter={() => handleClientHover(client.id)}
          className="p-2 hover:bg-gray-100"
        >
          {client.name}
        </div>
      ))}
    </nav>
  );
}
```

### Custom Navigation Components
```tsx
import { SmartLink } from '@/components/SmartLink';
import { motion } from 'framer-motion';

// Animated navigation card
export function NavigationCard({ href, title, description, icon: Icon }) {
  return (
    <SmartLink href={href} preload={true}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="p-6 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
      >
        <Icon className="h-8 w-8 text-teal-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 text-sm">
          {description}
        </p>
      </motion.div>
    </SmartLink>
  );
}

// Usage
<NavigationCard
  href="/dashboard/assets"
  title="Asset Management"
  description="Manage and track your assets"
  icon={Package}
/>
```

### Form Submission with Navigation
```tsx
import { useNavigation } from '@/contexts/NavigationContext';
import { useState } from 'react';

export default function CreateClientForm() {
  const { navigateTo } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await createClient(formData);
      
      // Navigate to clients list after successful creation
      navigateTo('/dashboard/clients');
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-teal-500 text-white px-4 py-2 rounded"
      >
        {isSubmitting ? 'Creating...' : 'Create Client'}
      </button>
    </form>
  );
}
```

### Conditional Navigation
```tsx
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ConditionalNavigation() {
  const { navigateTo } = useNavigation();
  const { user } = useAuth();

  const handleNavigation = () => {
    if (user?.role === 'super_admin') {
      navigateTo('/dashboard/clients');
    } else if (user?.role === 'admin') {
      navigateTo('/dashboard/assets');
    } else {
      navigateTo('/dashboard/profile');
    }
  };

  return (
    <button onClick={handleNavigation}>
      Go to Dashboard
    </button>
  );
}
```

### Error Handling with Navigation
```tsx
import { useNavigation } from '@/contexts/NavigationContext';
import { useState } from 'react';

export default function ErrorHandlingExample() {
  const { navigateTo } = useNavigation();
  const [error, setError] = useState(null);

  const handleAction = async () => {
    try {
      await performAction();
      navigateTo('/dashboard/success');
    } catch (error) {
      setError(error.message);
      // Navigate to error page or stay on current page
      if (error.code === 'AUTH_REQUIRED') {
        navigateTo('/login');
      }
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <button onClick={handleAction}>
        Perform Action
      </button>
    </div>
  );
}

## Benefits

1. **Eliminated Navigation Delays**: Smooth transitions replace jarring page loads
2. **Automatic Data Preloading**: Data is fetched before navigation
3. **Consistent Loading States**: Skeleton loaders provide visual feedback
4. **Better Performance**: React Query caching and prefetching
5. **Improved UX**: Smooth animations and transitions

## Migration Guide

### Replace Link Components
```tsx
// Before
import Link from 'next/link';
<Link href="/dashboard">Dashboard</Link>

// After
import { SmartLink } from '@/components/SmartLink';
<SmartLink href="/dashboard">Dashboard</SmartLink>
```

### Add Page Transitions
```tsx
// Before
export default function MyPage() {
  return <div>Content</div>;
}

// After
export default function MyPage() {
  return (
    <PageTransition>
      <div>Content</div>
    </PageTransition>
  );
}
```

### Update Navigation Calls
```tsx
// Before
router.push('/dashboard/clients');

// After
navigateTo('/dashboard/clients');
```

## Configuration

The navigation system is automatically configured when you wrap your app with:
- `QueryClientProvider` (for data caching)
- `AuthProvider` (for authentication)
- `NavigationProvider` (for navigation management)

## Performance Optimizations

1. **Route-based Prefetching**: Automatically preloads data for adjacent routes
2. **Hover Preloading**: Data is fetched when hovering over navigation links
3. **React Query Caching**: Efficient data caching and background updates
4. **Skeleton Loading**: Immediate visual feedback during transitions
5. **Debounced Navigation**: Prevents excessive API calls during rapid navigation

## Troubleshooting

### Navigation Not Working
- Ensure `NavigationProvider` is wrapped around your app
- Check that `useNavigation` hook is used in components

### Data Not Preloading
- Verify React Query is properly configured
- Check network tab for failed API calls
- Ensure prefetch hooks are properly imported

### Performance Issues
- Monitor React Query devtools for query performance
- Check if excessive prefetching is occurring
- Verify skeleton loading is working correctly

## File Structure

```
frontend/src/
├── components/
│   ├── SmartLink.tsx              # Smart navigation component
│   ├── PageTransition.tsx         # Page transition wrapper
│   ├── ui/
│   │   └── loading-state.tsx     # Loading components
│   └── layout/
│       └── DashboardLayout.tsx    # Updated with new navigation
├── contexts/
│   └── NavigationContext.tsx      # Navigation state management
├── hooks/
│   ├── usePrefetch.ts             # Data prefetching
│   └── useRoutePrefetch.ts       # Route-based prefetching
└── app/
    └── dashboard/
        └── clients/
            └── page.tsx           # Example page with transitions
```

## Next Steps

1. **Apply to Other Pages**: Wrap remaining pages with `PageTransition`
2. **Update Navigation**: Replace remaining `Link` components with `SmartLink`
3. **Add Prefetching**: Implement prefetching for other data types
4. **Performance Monitoring**: Use React Query devtools to monitor performance
5. **User Testing**: Gather feedback on navigation experience improvements
