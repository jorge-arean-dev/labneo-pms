---
trigger: always_on
---

# Vercel User Cache Isolation Guide

## Overview

This guide addresses a critical issue in SaaS applications deployed on Vercel: **user data caching conflicts** where User A's data appears for User B after authentication changes. This happens due to Vercel's aggressive edge caching combined with Next.js server-side rendering optimizations.

## ⚠️ When This Issue Occurs

### Symptoms
- User logs out, new user logs in, sees previous user's data
- Avatar images show wrong user's photo or incorrect fallback initials  
- User-specific data persists across different user sessions
- Issue **only occurs in production/Vercel**, works fine locally
- Refreshing the page fixes the issue temporarily

### Root Causes
1. **Vercel Edge Caching** - Caches server-rendered responses at CDN level
2. **Next.js Server Component Caching** - Caches component output between requests
3. **Authentication State Caching** - User auth state gets cached in server responses
4. **Client-Side Cache Persistence** - Browser/session storage retains previous user data

## 🛡️ Critical Requirements for SaaS Applications

### Data Isolation is Non-Negotiable
- **Security**: User A must never see User B's data
- **Privacy**: Personal information must be properly isolated
- **Compliance**: Many industries require strict data separation
- **Trust**: Users abandon apps that show wrong data

### Performance vs. Correctness Trade-off
- **Correctness > Performance** for user-specific data
- User dashboards, profiles, settings should never be cached
- Public content can still be cached for performance
- Sub-second load times are acceptable, data leaks are not

## 🔧 Implementation Strategy

### Phase 1: Server-Side Cache Busting

#### 1.1 Add `noStore()` to All User-Specific Pages

```typescript
// app/protected/page.tsx
import { unstable_noStore as noStore } from 'next/cache';

export default async function ProtectedPage() {
  // Disable caching to ensure fresh user data on each request
  noStore();
  
  const supabase = await createClient();
  // ... rest of component
}
```

**Apply to ALL pages that display user-specific data:**
- Dashboard pages
- Profile/settings pages
- User-generated content pages
- Any page showing personalized data

#### 1.2 Identify Pages Requiring `noStore()`

✅ **Always add `noStore()` to:**
- `/protected/*` routes
- `/dashboard/*` routes  
- `/settings/*` routes
- `/profile/*` routes
- Any route displaying user-specific data

❌ **Don't add `noStore()` to:**
- Landing pages
- Public documentation
- Marketing pages
- Static content

### Phase 2: Middleware Cache Headers

#### 2.1 Enhanced Middleware Configuration

```typescript
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  // ... existing auth logic

  // Add cache control headers for user-specific content
  if (user && !isPublicRoute) {
    supabaseResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    supabaseResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.headers.set('Expires', '0');
    supabaseResponse.headers.set('Vary', 'Cookie, Authorization');
    
    // Add user-specific header for cache segmentation
    supabaseResponse.headers.set('X-User-ID', user.id);
    // Add timestamp to prevent any caching
    supabaseResponse.headers.set('X-Timestamp', Date.now().toString());
  }

  return supabaseResponse;
}
```

#### 2.2 Header Explanation

- `Cache-Control: no-cache, no-store, must-revalidate, private` - Prevents all caching
- `Pragma: no-cache` - HTTP/1.0 compatibility
- `Expires: 0` - Forces immediate expiration
- `Vary: Cookie, Authorization` - Cache varies by auth headers
- `X-User-ID` - User-specific cache segmentation
- `X-Timestamp` - Prevents any temporal caching

### Phase 3: Client-Side Cache Management

#### 3.1 User-Specific Cache Keys

```typescript
// hooks/use-avatar.ts
export function useAvatar({ avatarUrl, userId }: UseAvatarOptions) {
  useEffect(() => {
    async function getAvatarUrl() {
      if (avatarUrl && userId) {
        // Create user-specific cache key
        const cacheKey = `avatar_${userId}_${avatarUrl}`;
        
        // Check for cached URL with expiration validation
        const cachedUrl = sessionStorage.getItem(cacheKey);
        if (cachedUrl) {
          const urlObj = new URL(cachedUrl);
          const expiresParam = urlObj.searchParams.get('Expires');
          if (expiresParam && Date.now() < parseInt(expiresParam) * 1000) {
            setSignedAvatarUrl(cachedUrl);
            return;
          } else {
            sessionStorage.removeItem(cacheKey); // Remove expired
          }
        }
        
        // Generate fresh signed URL and cache with user-specific key
        const { data, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(avatarUrl, 3600);
          
        if (data?.signedUrl && !error) {
          sessionStorage.setItem(cacheKey, data.signedUrl);
          setSignedAvatarUrl(data.signedUrl);
        }
      }
    }
    getAvatarUrl();
  }, [avatarUrl, userId]);
}
```

#### 3.2 Cache Key Patterns

```typescript
// ✅ Good: User-specific cache keys
const cacheKey = `avatar_${userId}_${avatarUrl}`;
const cacheKey = `profile_${userId}`;
const cacheKey = `settings_${userId}_${settingType}`;

// ❌ Bad: Generic cache keys (cause collisions)
const cacheKey = `avatar_${firstName}_${avatarUrl}`;
const cacheKey = `profile_data`;
const cacheKey = `user_settings`;
```

### Phase 4: Authentication State Management

#### 4.1 Global Auth State Monitoring

```typescript
// hooks/use-auth-state.ts
export function useAuthState() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear all client-side caches
        sessionStorage.clear();
        localStorage.clear();
        
        // Force hard navigation to clear cached state
        window.location.href = '/';
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Force router refresh for fresh data
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);
}
```

#### 4.2 Enhanced Logout Function

```typescript
// components/logout-button.tsx
const logout = async () => {
  const supabase = createClient();
  
  // Clear all user-specific caches
  if (typeof window !== 'undefined') {
    sessionStorage.clear();
    localStorage.clear();
  }
  
  await supabase.auth.signOut();
  
  // Force hard navigation to clear any cached state
  window.location.href = "/";
};
```

#### 4.3 Auth State Provider Setup

```typescript
// components/auth-state-provider.tsx
"use client";

import { useAuthState } from '@/hooks/use-auth-state';

export function AuthStateProvider({ children }: { children: React.ReactNode }) {
  useAuthState();
  return <>{children}</>;
}

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthStateProvider>
          {children}
        </AuthStateProvider>
      </body>
    </html>
  );
}
```

### Phase 5: Cache Management Utilities

#### 5.1 Cache Management Class

```typescript
// lib/cache.ts
export class CacheManager {
  static revalidateUserData(userId: string) {
    revalidateTag(`user:${userId}`);
    revalidateTag(`profile:${userId}`);
    revalidatePath('/protected');
  }

  static clearUserCaches(userId: string) {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(`avatar_${userId}_`) || 
          key.startsWith(`profile_${userId}_`) ||
          key.startsWith(`user_${userId}_`)) {
        sessionStorage.removeItem(key);
      }
    });
  }

  static getUserTags(userId: string): string[] {
    return [`user:${userId}`, `profile:${userId}`];
  }
}
```

## 📋 Implementation Checklist

### For New SaaS Applications

#### Server-Side Setup
- [ ] Add `noStore()` to all user-specific pages
- [ ] Configure middleware cache headers
- [ ] Set up proper route protection
- [ ] Add user-specific response headers

#### Client-Side Setup  
- [ ] Implement user-specific cache keys for all cached data
- [ ] Add global auth state monitoring
- [ ] Create enhanced logout with cache clearing
- [ ] Set up auth state provider in root layout

#### Cache Management
- [ ] Create cache management utilities
- [ ] Implement cache invalidation on user actions
- [ ] Add expiration checking for cached data
- [ ] Set up proper error handling for cache operations

### For Existing Applications

#### Audit Current Caching
- [ ] Identify all pages displaying user-specific data
- [ ] Check for generic cache keys that could cause collisions
- [ ] Review logout procedures for complete state clearing
- [ ] Test multi-user scenarios in production

#### Apply Fixes Incrementally
- [ ] Start with most critical user data (profiles, dashboards)
- [ ] Add `noStore()` to high-risk pages first
- [ ] Implement enhanced logout immediately
- [ ] Add auth state monitoring
- [ ] Update cache keys to be user-specific

## 🚨 Red Flags to Watch For

### Development Indicators
- Cache keys without user IDs
- Generic sessionStorage/localStorage keys
- Missing `noStore()` on user-specific pages
- Logout using `router.push()` instead of `window.location.href`

### Testing Indicators
- Different behavior between local and production
- Issues only appearing after user switches
- Data persisting after logout
- Wrong user data appearing briefly before correct data loads

### Production Monitoring
- User reports seeing wrong data
- Support tickets about "stale information"
- Authentication-related user confusion
- Inconsistent user experience reports

## 🎯 Testing Strategy

### Multi-User Testing Protocol
1. **User A Login Test**
   - User A logs in
   - Verify correct data displays
   - Check avatar, profile, dashboard data

2. **Logout/Login Switch Test**
   - User A logs out
   - User B logs in immediately
   - Verify no User A data appears
   - Check all user-specific components

3. **Cache Persistence Test**
   - Perform switch test without page refresh
   - Verify behavior matches refresh scenario
   - Test in incognito/private browsing mode

4. **Production-Specific Testing**
   - Test specifically on Vercel/production environment
   - Use different devices/browsers for different users
   - Test with actual user accounts, not test accounts

## 🔄 Future Considerations

### Performance Optimization
Once user isolation is working:
- Implement selective caching for non-sensitive data
- Add smart cache invalidation strategies
- Consider client-side data fetching for user-specific content
- Implement background revalidation patterns

### Monitoring and Alerting
- Set up user data isolation monitoring
- Add alerts for cache-related errors
- Track performance impact of no-cache headers
- Monitor user experience metrics

### Advanced Patterns
- User-specific edge caching with proper segmentation
- Background sync for user data
- Optimistic updates with proper fallbacks
- Smart cache warming strategies

## 📚 Related Documentation

- [Next.js Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
- [Vercel Edge Caching](https://vercel.com/docs/concepts/edge-network/caching)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## 🤝 Contributing

When adding new user-specific features:
1. Always consider cache isolation requirements
2. Add `noStore()` to new user-specific pages
3. Use user-specific cache keys for any client-side caching
4. Test multi-user scenarios before deployment
5. Update this guide with new patterns discovered