/**
 * DOM Extractors - Functions to extract data from web pages
 * Optimized for restaurant websites
 */

import type { Page } from 'playwright';
import type { ScrapedImage, BrandInfo, ContactInfo, MenuItem } from './types';

/**
 * Extract brand information from page
 */
export async function extractBrandInfo(page: Page, url: string): Promise<BrandInfo> {
  return page.evaluate((sourceUrl) => {
    // Try to get brand name from various sources
    const getName = (): string => {
      // 1. og:site_name
      const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      if (ogSiteName) return ogSiteName;

      // 2. Title tag (clean up)
      const title = document.title;
      if (title) {
        // Remove common suffixes
        const cleaned = title
          .split(/[|\-–—]/)[0]
          .trim()
          .replace(/home|official|restaurant|cafe|bar/gi, '')
          .trim();
        if (cleaned.length > 2) return cleaned;
      }

      // 3. h1 if it looks like a brand name
      const h1 = document.querySelector('h1')?.textContent?.trim();
      if (h1 && h1.length < 50) return h1;

      // 4. Domain name fallback
      try {
        const hostname = new URL(sourceUrl).hostname;
        return hostname.replace(/^www\./, '').split('.')[0];
      } catch {
        return 'Unknown Brand';
      }
    };

    // Get tagline
    const getTagline = (): string | undefined => {
      // 1. og:description (often has tagline)
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');

      // 2. Meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');

      // 3. First h2 or subtitle
      const h2 = document.querySelector('h2')?.textContent?.trim();
      const subtitle = document.querySelector('.tagline, .subtitle, .slogan, [class*="tagline"], [class*="subtitle"]')?.textContent?.trim();

      // Return the shortest one that looks like a tagline (< 100 chars)
      const candidates = [subtitle, h2, ogDesc, metaDesc].filter(Boolean) as string[];
      const tagline = candidates.find(c => c.length < 100 && c.length > 5);

      return tagline;
    };

    // Get description
    const getDescription = (): string | undefined => {
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      return metaDesc || ogDesc || undefined;
    };

    // Detect cuisine type (restaurant-specific)
    const detectCuisine = (): string | undefined => {
      const text = document.body.innerText.toLowerCase();
      const cuisines: Record<string, string[]> = {
        italian: ['italian', 'pizza', 'pasta', 'trattoria', 'ristorante'],
        mexican: ['mexican', 'tacos', 'burrito', 'taqueria', 'cantina'],
        japanese: ['japanese', 'sushi', 'ramen', 'izakaya', 'tempura'],
        chinese: ['chinese', 'dim sum', 'wok', 'szechuan', 'cantonese'],
        indian: ['indian', 'curry', 'tandoori', 'masala', 'biryani'],
        thai: ['thai', 'pad thai', 'tom yum', 'green curry'],
        american: ['american', 'burger', 'bbq', 'grill', 'steakhouse'],
        french: ['french', 'bistro', 'brasserie', 'patisserie'],
        mediterranean: ['mediterranean', 'greek', 'falafel', 'hummus'],
        cafe: ['coffee', 'cafe', 'espresso', 'latte', 'bakery'],
      };

      for (const [cuisine, keywords] of Object.entries(cuisines)) {
        if (keywords.some(kw => text.includes(kw))) {
          return cuisine;
        }
      }
      return undefined;
    };

    return {
      name: getName(),
      tagline: getTagline(),
      description: getDescription(),
      cuisine: detectCuisine(),
    };
  }, url);
}

/**
 * Extract logo from page
 */
export async function extractLogo(page: Page, baseUrl: string): Promise<string | undefined> {
  return page.evaluate((base) => {
    const resolveUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('data:')) return url;
      if (url.startsWith('http')) return url;
      if (url.startsWith('//')) return `https:${url}`;
      if (url.startsWith('/')) return `${new URL(base).origin}${url}`;
      return `${base}/${url}`;
    };

    // Priority order for logo detection
    const candidates: string[] = [];

    // 1. og:image (often the logo or hero)
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (ogImage) candidates.push(resolveUrl(ogImage));

    // 2. Explicit logo elements
    const logoSelectors = [
      'img[class*="logo"]',
      'img[id*="logo"]',
      'img[alt*="logo" i]',
      '.logo img',
      '#logo img',
      'header img:first-of-type',
      'nav img:first-of-type',
      '.navbar-brand img',
      'a[href="/"] img',
    ];

    for (const selector of logoSelectors) {
      const img = document.querySelector(selector) as HTMLImageElement;
      if (img?.src) {
        candidates.push(resolveUrl(img.src));
      }
    }

    // 3. Favicon as last resort
    const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.getAttribute('href');
    if (favicon) candidates.push(resolveUrl(favicon));

    // Return first valid candidate
    return candidates.find(url => url && !url.includes('undefined'));
  }, baseUrl);
}

/**
 * Extract all images from page
 * Enhanced to capture lazy-loaded food/product images
 */
export async function extractImages(page: Page, baseUrl: string, maxImages = 20): Promise<ScrapedImage[]> {
  return page.evaluate(({ base, max }) => {
    const resolveUrl = (url: string): string => {
      if (!url) return '';
      if (url.startsWith('data:')) return url;
      if (url.startsWith('http')) return url;
      if (url.startsWith('//')) return `https:${url}`;
      if (url.startsWith('/')) return `${new URL(base).origin}${url}`;
      return `${base}/${url}`;
    };

    const images: Array<{
      url: string;
      alt?: string;
      width?: number;
      height?: number;
      type: 'logo' | 'hero' | 'product' | 'background' | 'unknown';
    }> = [];

    const seen = new Set<string>();

    // Patterns to exclude (icons, trackers, social media, etc.)
    // Note: Be careful not to exclude legitimate images (e.g., /ad_/ was excluding Wix site IDs like 4801ad_)
    const excludePatterns = [
      /icon/i, /favicon/i, /sprite/i, /tracking/i, /pixel/i,
      /spacer/i, /blank/i, /transparent/i,
      /\/ad\/|\/ads\/|_ad\.|\.ad\./i, // Ads - more specific patterns to avoid false positives
      /analytics/i, /badge/i, /button/i, /arrow/i,
      /\/social\//i, // More specific - only exclude paths with /social/
      /facebook\.com|twitter\.com|instagram\.com|linkedin\.com/i, // Social domains only
      /googleads|doubleclick/i, // Ad networks
      /\.svg$/i, // Usually icons
      /1x1|2x2/i, // Tracking pixels
      /bat\.bing\.com|\.bing\.com\/action/i, // Bing tracking
      /\.gif\?/i, // Tracking GIFs with query params
    ];

    // Patterns that indicate food/product images (prioritize these)
    const foodPatterns = [
      /food|dish|meal|menu|plate|bowl|cuisine/i,
      /pizza|burger|taco|sushi|pasta|salad|steak|chicken|seafood/i,
      /appetizer|entree|dessert|drink|beverage|coffee|cocktail/i,
      /gallery|product|item|special/i,
    ];

    // Helper to extract original URL from Next.js /_next/image wrapper
    const unwrapNextJsImage = (url: string): string => {
      if (url.includes('/_next/image')) {
        try {
          const urlObj = new URL(url);
          const originalUrl = urlObj.searchParams.get('url');
          if (originalUrl) {
            return decodeURIComponent(originalUrl);
          }
        } catch {}
      }
      return url;
    };

    // Helper to get image source from various attributes
    const getImageSrc = (img: HTMLImageElement): string | null => {
      // Check standard src first
      if (img.src && !img.src.startsWith('data:')) {
        return unwrapNextJsImage(img.src);
      }

      // Check lazy-loading attributes (common patterns)
      const lazyAttrs = [
        'data-src',
        'data-lazy-src',
        'data-original',
        'data-lazy',
        'data-srcset',
        'data-full-src',
        'data-image',
        'data-bg',
        'data-background',
        'data-large-file',
        'data-medium-file',
        'data-nimg', // Next.js
      ];

      for (const attr of lazyAttrs) {
        const value = img.getAttribute(attr);
        if (value && !value.startsWith('data:')) {
          return unwrapNextJsImage(value);
        }
      }

      // Check srcset for high-res image
      const srcset = img.getAttribute('srcset') || img.srcset;
      if (srcset) {
        // Get the largest image from srcset
        const sources = srcset.split(',').map(s => s.trim());
        const largest = sources
          .map(s => {
            const [url, size] = s.split(/\s+/);
            const width = parseInt(size) || 0;
            return { url: unwrapNextJsImage(url), width };
          })
          .sort((a, b) => b.width - a.width)[0];
        if (largest?.url) return largest.url;
      }

      return null;
    };

    // Helper to determine image type based on context
    const getImageType = (
      img: HTMLImageElement,
      url: string,
      effectiveWidth: number,
      effectiveHeight: number
    ): 'logo' | 'hero' | 'product' | 'background' | 'unknown' => {
      const classes = (img.className || '').toLowerCase();
      const alt = (img.alt || '').toLowerCase();
      const id = (img.id || '').toLowerCase();
      const parent = img.closest('section, div, article, figure, li');
      const parentClasses = parent?.className?.toLowerCase() || '';
      const parentId = parent?.id?.toLowerCase() || '';
      const grandparent = parent?.parentElement;
      const grandparentClasses = grandparent?.className?.toLowerCase() || '';

      // Check for logo
      if (/logo/i.test(classes + id + alt)) return 'logo';

      // Check for hero/banner
      if (/hero|banner|slider|carousel|slideshow|featured/i.test(classes + parentClasses + grandparentClasses)) {
        return 'hero';
      }

      // Check for food/product - expand detection
      if (
        /product|menu|food|dish|item|gallery|grid|card|section/i.test(classes + parentClasses + grandparentClasses) ||
        /product|menu|food|dish|item|gallery|section|wrapper/i.test(parentId) ||
        foodPatterns.some(p => p.test(alt)) ||
        foodPatterns.some(p => p.test(url))
      ) {
        return 'product';
      }

      // Check for background
      if (/background|bg|cover/i.test(classes)) return 'background';

      // Infer from size - larger images are likely hero or product
      if (effectiveWidth > 600 && effectiveHeight > 400) {
        return effectiveWidth / effectiveHeight > 1.8 ? 'hero' : 'product';
      }

      // Medium-sized images in gallery context likely products
      if (effectiveWidth > 200 && effectiveHeight > 200) {
        if (/gallery|grid|list|menu/i.test(parentClasses + grandparentClasses)) {
          return 'product';
        }
      }

      return 'unknown';
    };

    // 1. Extract from <img> elements
    const imgElements = document.querySelectorAll('img');
    for (const img of imgElements) {
      if (images.length >= max) break;

      const src = getImageSrc(img);
      if (!src) continue;

      const url = resolveUrl(src);
      if (seen.has(url) || url.startsWith('data:')) continue;

      // Skip excluded patterns
      if (excludePatterns.some(p => p.test(url))) continue;

      seen.add(url);

      // Get dimensions
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      const attrWidth = parseInt(img.getAttribute('width') || '0', 10);
      const attrHeight = parseInt(img.getAttribute('height') || '0', 10);
      const effectiveWidth = width || attrWidth;
      const effectiveHeight = height || attrHeight;

      // Skip tiny images only if we know their size
      if (effectiveWidth > 0 && effectiveHeight > 0 && (effectiveWidth < 50 || effectiveHeight < 50)) continue;

      const type = getImageType(img, url, effectiveWidth, effectiveHeight);

      images.push({
        url,
        alt: img.alt || undefined,
        width: effectiveWidth || undefined,
        height: effectiveHeight || undefined,
        type,
      });
    }

    // 2. Extract from <picture> elements (responsive images)
    const pictureElements = document.querySelectorAll('picture');
    for (const picture of pictureElements) {
      if (images.length >= max) break;

      // Get sources in order of preference (larger first)
      const sources = picture.querySelectorAll('source');
      let bestSrc: string | null = null;

      for (const source of sources) {
        const srcset = source.getAttribute('srcset');
        if (srcset) {
          const firstSrc = srcset.split(',')[0].split(/\s+/)[0];
          if (firstSrc) {
            bestSrc = firstSrc;
            break;
          }
        }
      }

      // Fallback to img inside picture
      if (!bestSrc) {
        const img = picture.querySelector('img');
        if (img) bestSrc = getImageSrc(img);
      }

      if (!bestSrc) continue;

      const url = resolveUrl(bestSrc);
      if (seen.has(url) || url.startsWith('data:')) continue;
      if (excludePatterns.some(p => p.test(url))) continue;

      seen.add(url);

      const img = picture.querySelector('img');
      images.push({
        url,
        alt: img?.alt || undefined,
        type: 'product', // Picture elements usually contain important images
      });
    }

    // 3. Extract from <figure> elements (semantic image containers)
    const figureElements = document.querySelectorAll('figure:not(:has(img[src]))');
    for (const figure of figureElements) {
      if (images.length >= max) break;

      // Check for background image on figure
      const style = window.getComputedStyle(figure);
      const bgImage = style.backgroundImage;
      const match = bgImage?.match(/url\(['"]?([^'"]+)['"]?\)/);

      if (match?.[1]) {
        const url = resolveUrl(match[1]);
        if (!seen.has(url) && !excludePatterns.some(p => p.test(url))) {
          seen.add(url);
          images.push({
            url,
            type: 'product',
          });
        }
      }
    }

    // 4. Extract background images from CSS (inline styles)
    const elementsWithBg = document.querySelectorAll('[style*="background"]');
    for (const el of elementsWithBg) {
      if (images.length >= max) break;

      const style = (el as HTMLElement).style.backgroundImage;
      const match = style?.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match?.[1]) {
        const url = resolveUrl(match[1]);
        if (!seen.has(url) && !url.startsWith('data:') && !excludePatterns.some(p => p.test(url))) {
          seen.add(url);

          // Determine type based on element context
          const classes = (el as HTMLElement).className?.toLowerCase() || '';
          let type: 'hero' | 'product' | 'background' = 'background';
          if (/hero|banner|slider/i.test(classes)) type = 'hero';
          else if (/menu|food|product|gallery/i.test(classes)) type = 'product';

          images.push({ url, type });
        }
      }
    }

    // 5. Extract background images from computed styles (CSS classes)
    const potentialBgElements = document.querySelectorAll(
      '[class*="hero"], [class*="banner"], [class*="slider"], [class*="menu"], [class*="food"], [class*="product"], [class*="gallery"], [class*="featured"]'
    );
    for (const el of potentialBgElements) {
      if (images.length >= max) break;

      const computed = window.getComputedStyle(el);
      const bgImage = computed.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match?.[1]) {
          const url = resolveUrl(match[1]);
          if (!seen.has(url) && !url.startsWith('data:') && !excludePatterns.some(p => p.test(url))) {
            seen.add(url);

            const classes = (el as HTMLElement).className?.toLowerCase() || '';
            let type: 'hero' | 'product' | 'background' = 'background';
            if (/hero|banner|slider/i.test(classes)) type = 'hero';
            else if (/menu|food|product|gallery/i.test(classes)) type = 'product';

            images.push({ url, type });
          }
        }
      }
    }

    // 6. Specifically look for images inside menu/item sections (common restaurant patterns)
    const menuSectionSelectors = [
      '[class*="item-section"] img',
      '[class*="items-section"] img',
      '[class*="menu-section"] img',
      '[class*="menu-item"] img',
      '[class*="food-item"] img',
      '[class*="product-card"] img',
      '[class*="dish-card"] img',
      '[class*="category-item"] img',
      '.menu img',
      '.products img',
      '.items img',
    ];

    for (const selector of menuSectionSelectors) {
      if (images.length >= max) break;

      try {
        const menuImages = document.querySelectorAll(selector);
        for (const img of menuImages) {
          if (images.length >= max) break;

          const src = getImageSrc(img as HTMLImageElement);
          if (!src) continue;

          const url = resolveUrl(src);
          if (seen.has(url) || url.startsWith('data:')) continue;
          if (excludePatterns.some(p => p.test(url))) continue;

          seen.add(url);

          const width = (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width || 0;
          const height = (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height || 0;

          images.push({
            url,
            alt: (img as HTMLImageElement).alt || undefined,
            width: width || undefined,
            height: height || undefined,
            type: 'product',
          });
        }
      } catch {}
    }

    // 7. Wix-specific image extraction (wow-image, wix-image elements)
    const wixImageSelectors = [
      'wow-image img',
      'wix-image img',
      '[data-hook="gallery-item-image-img"]',
      '[data-testid*="image"]',
      '[data-image-info]',
      'img[fetchpriority]', // Wix often uses fetchpriority attribute
    ];

    for (const selector of wixImageSelectors) {
      if (images.length >= max) break;

      try {
        const wixImages = document.querySelectorAll(selector);
        for (const img of wixImages) {
          if (images.length >= max) break;

          const imgEl = img as HTMLImageElement;
          let src = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src');

          // Wix images often have the real URL in a parent element's data attribute
          if (!src || src.startsWith('data:')) {
            const parent = imgEl.closest('[data-image-info], wow-image, wix-image');
            if (parent) {
              const dataImageInfo = parent.getAttribute('data-image-info');
              if (dataImageInfo) {
                try {
                  const info = JSON.parse(dataImageInfo);
                  if (info.imageData?.uri) {
                    src = `https://static.wixstatic.com/media/${info.imageData.uri}`;
                  }
                } catch {}
              }
            }
          }

          if (!src) continue;

          const url = resolveUrl(src);
          if (seen.has(url) || url.startsWith('data:')) continue;
          if (excludePatterns.some(p => p.test(url))) continue;

          seen.add(url);

          images.push({
            url,
            alt: imgEl.alt || undefined,
            width: imgEl.naturalWidth || imgEl.width || undefined,
            height: imgEl.naturalHeight || imgEl.height || undefined,
            type: 'product',
          });
        }
      } catch {}
    }

    // 8. Extract from any wixstatic.com URLs in img src (fallback for Wix sites)
    const allImages = document.querySelectorAll('img[src*="wixstatic.com"], img[src*="parastorage.com"]');
    for (const img of allImages) {
      if (images.length >= max) break;

      const imgEl = img as HTMLImageElement;
      const src = imgEl.src;
      if (!src || seen.has(src)) continue;
      if (excludePatterns.some(p => p.test(src))) continue;

      // Skip very small images (likely icons or placeholders)
      const width = imgEl.naturalWidth || imgEl.width || 0;
      const height = imgEl.naturalHeight || imgEl.height || 0;
      if (width > 0 && height > 0 && (width < 100 || height < 100)) continue;

      seen.add(src);

      images.push({
        url: src,
        alt: imgEl.alt || undefined,
        width: width || undefined,
        height: height || undefined,
        type: 'product',
      });
    }

    // 9. Extract from Wix gallery/grid containers using data attributes
    const wixGalleryItems = document.querySelectorAll('[data-hook*="gallery"], [class*="gallery"], [class*="grid-item"]');
    for (const item of wixGalleryItems) {
      if (images.length >= max) break;

      // Check for background image
      const style = window.getComputedStyle(item);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match?.[1]) {
          const url = resolveUrl(match[1]);
          if (!seen.has(url) && !url.startsWith('data:') && !excludePatterns.some(p => p.test(url))) {
            seen.add(url);
            images.push({ url, type: 'product' });
          }
        }
      }

      // Check nested img elements
      const nestedImgs = item.querySelectorAll('img');
      for (const img of nestedImgs) {
        if (images.length >= max) break;

        const imgEl = img as HTMLImageElement;
        const src = getImageSrc(imgEl);
        if (!src) continue;

        const url = resolveUrl(src);
        if (seen.has(url) || url.startsWith('data:')) continue;
        if (excludePatterns.some(p => p.test(url))) continue;

        seen.add(url);

        images.push({
          url,
          alt: imgEl.alt || undefined,
          width: imgEl.naturalWidth || imgEl.width || undefined,
          height: imgEl.naturalHeight || imgEl.height || undefined,
          type: 'product',
        });
      }
    }

    // Sort: prioritize product images, then hero, then others
    const typePriority = { product: 0, hero: 1, background: 2, logo: 3, unknown: 4 };
    images.sort((a, b) => typePriority[a.type] - typePriority[b.type]);

    return images.slice(0, max);
  }, { base: baseUrl, max: maxImages });
}

/**
 * Extract contact information
 */
export async function extractContact(page: Page, url: string): Promise<ContactInfo> {
  return page.evaluate((sourceUrl) => {
    const text = document.body.innerText;

    // Phone number patterns
    const phonePatterns = [
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
    ];

    let phone: string | undefined;
    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match) {
        phone = match[0];
        break;
      }
    }

    // Email pattern
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch?.[0];

    // Address - look for common patterns
    const addressSelectors = [
      '[class*="address"]:not(style):not(script)',
      '[itemtype*="PostalAddress"]',
      'address',
      '[data-testid*="address"]',
    ];
    let address: string | undefined;
    for (const selector of addressSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const content = el.textContent?.trim().replace(/\s+/g, ' ');
        // Only use if it looks like an address (has numbers and reasonable length)
        if (content && content.length < 200 && /\d/.test(content)) {
          address = content;
          break;
        }
      }
    }

    // Hours - look for hours section with more specific selectors
    // Avoid matching generic class names that contain "time" (e.g., animation-time, grid-template)
    const hoursSelectors = [
      '[class*="hours"]:not(style):not(script)',
      '[class*="opening"]:not(style):not(script)',
      '[class*="schedule"]:not(style):not(script)',
      '[class*="business-hour"]',
      '[data-testid*="hours"]',
      'time[datetime]',
    ];
    let hours: string | undefined;
    for (const selector of hoursSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el) {
          const content = el.textContent?.trim().replace(/\s+/g, ' ');
          // Only use if it looks like hours info (reasonable length, contains time patterns)
          if (content && content.length < 500 && content.length > 3) {
            // Check if it contains time-like patterns (am/pm, numbers with colons, days of week)
            const hasTimePattern = /\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|daily|open|close/i.test(content);
            if (hasTimePattern) {
              hours = content;
              break;
            }
          }
        }
      } catch {}
    }

    // Fallback: try to extract hours from page text using regex
    if (!hours) {
      const hoursPattern = /(?:hours|open|daily)[:\s]*(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/i;
      const hoursMatch = text.match(hoursPattern);
      if (hoursMatch) {
        hours = hoursMatch[0];
      }
    }

    return {
      phone,
      email,
      address,
      hours,
      website: sourceUrl,
    };
  }, url);
}

/**
 * Extract menu items (restaurant-specific)
 */
export async function extractMenuItems(page: Page, maxItems = 10): Promise<MenuItem[]> {
  return page.evaluate((max) => {
    const items: Array<{
      name: string;
      description?: string;
      price?: string;
      image?: string;
    }> = [];

    // Common menu item selectors
    const menuSelectors = [
      '.menu-item',
      '[class*="menu-item"]',
      '[class*="dish"]',
      '[class*="food-item"]',
      '.product-card',
      'article[class*="menu"]',
    ];

    for (const selector of menuSelectors) {
      const elements = document.querySelectorAll(selector);

      for (const el of elements) {
        if (items.length >= max) break;

        // Try to extract item details
        const name = el.querySelector('h2, h3, h4, .name, .title')?.textContent?.trim();
        if (!name || name.length < 2) continue;

        const description = el.querySelector('p, .description, .desc')?.textContent?.trim();

        // Price pattern
        const priceText = el.textContent || '';
        const priceMatch = priceText.match(/\$[\d.]+/);
        const price = priceMatch?.[0];

        const img = el.querySelector('img') as HTMLImageElement | null;
        const image = img?.src;

        items.push({
          name,
          description: description?.substring(0, 200),
          price,
          image,
        });
      }

      if (items.length >= max) break;
    }

    return items;
  }, maxItems);
}

/**
 * Extract brand colors from website CSS/theme (not from food images)
 * This looks at actual design choices: CSS variables, backgrounds, buttons, headers
 */
export async function extractBrandColorsFromCSS(page: Page): Promise<{
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
} | null> {
  return page.evaluate(() => {
    const colors: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    } = {};

    // Helper to convert rgb/rgba to hex
    const rgbToHex = (color: string): string | null => {
      if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
      if (color.startsWith('#')) return color;

      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
      return null;
    };

    // Helper to check if color is too close to white/black (not useful as brand color)
    const isUsableColor = (hex: string | null): boolean => {
      if (!hex) return false;
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = rgb & 0xff;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
      // Skip colors that are too dark (< 20) or too light (> 235)
      return luminance > 20 && luminance < 235;
    };

    // 1. Check CSS custom properties (modern sites use these)
    const root = document.documentElement;
    const rootStyles = getComputedStyle(root);

    const cssVarPatterns = [
      // Primary color patterns
      { prop: '--primary', target: 'primary' },
      { prop: '--primary-color', target: 'primary' },
      { prop: '--brand-primary', target: 'primary' },
      { prop: '--color-primary', target: 'primary' },
      { prop: '--theme-primary', target: 'primary' },
      { prop: '--main-color', target: 'primary' },
      { prop: '--brand-color', target: 'primary' },
      // Secondary
      { prop: '--secondary', target: 'secondary' },
      { prop: '--secondary-color', target: 'secondary' },
      { prop: '--brand-secondary', target: 'secondary' },
      // Accent
      { prop: '--accent', target: 'accent' },
      { prop: '--accent-color', target: 'accent' },
      { prop: '--highlight', target: 'accent' },
      // Background
      { prop: '--background', target: 'background' },
      { prop: '--bg-color', target: 'background' },
      { prop: '--body-bg', target: 'background' },
    ];

    for (const { prop, target } of cssVarPatterns) {
      const value = rootStyles.getPropertyValue(prop).trim();
      if (value && !colors[target as keyof typeof colors]) {
        const hex = rgbToHex(value) || (value.startsWith('#') ? value : null);
        if (hex && isUsableColor(hex)) {
          colors[target as keyof typeof colors] = hex;
        }
      }
    }

    // 2. Extract from header/nav background (usually brand color)
    const headerSelectors = ['header', 'nav', '.header', '.navbar', '.nav', '[class*="header"]', '[class*="nav-bar"]'];
    for (const selector of headerSelectors) {
      if (colors.primary) break;
      const el = document.querySelector(selector);
      if (el) {
        const style = getComputedStyle(el);
        const bg = rgbToHex(style.backgroundColor);
        if (bg && isUsableColor(bg)) {
          colors.primary = bg;
          break;
        }
      }
    }

    // 3. Extract from buttons/CTAs (accent color)
    const buttonSelectors = ['button', '.btn', '.button', 'a.btn', '[class*="button"]', '[class*="cta"]'];
    for (const selector of buttonSelectors) {
      if (colors.accent) break;
      const el = document.querySelector(selector);
      if (el) {
        const style = getComputedStyle(el);
        const bg = rgbToHex(style.backgroundColor);
        if (bg && isUsableColor(bg) && bg !== colors.primary) {
          colors.accent = bg;
          break;
        }
      }
    }

    // 4. Extract from footer (often has brand colors)
    const footer = document.querySelector('footer, .footer, [class*="footer"]');
    if (footer && !colors.secondary) {
      const style = getComputedStyle(footer);
      const bg = rgbToHex(style.backgroundColor);
      if (bg && isUsableColor(bg) && bg !== colors.primary && bg !== colors.accent) {
        colors.secondary = bg;
      }
    }

    // 5. Get body background and text colors
    const bodyStyle = getComputedStyle(document.body);
    if (!colors.background) {
      const bg = rgbToHex(bodyStyle.backgroundColor);
      if (bg) colors.background = bg;
    }
    if (!colors.text) {
      const text = rgbToHex(bodyStyle.color);
      if (text) colors.text = text;
    }

    // 6. Look for theme-color meta tag
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && !colors.primary) {
      const themeColor = themeColorMeta.getAttribute('content');
      if (themeColor && isUsableColor(themeColor)) {
        colors.primary = themeColor;
      }
    }

    // 7. Scan for most common non-grayscale colors in visible elements
    if (!colors.primary || !colors.accent) {
      const colorCounts: Record<string, number> = {};
      const elements = document.querySelectorAll('h1, h2, h3, a, button, .btn, [class*="brand"], [class*="logo"]');

      elements.forEach(el => {
        const style = getComputedStyle(el);
        const textColor = rgbToHex(style.color);
        const bgColor = rgbToHex(style.backgroundColor);

        [textColor, bgColor].forEach(color => {
          if (color && isUsableColor(color)) {
            // Skip grayscale colors
            const rgb = parseInt(color.slice(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = rgb & 0xff;
            const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
            if (!isGray) {
              colorCounts[color] = (colorCounts[color] || 0) + 1;
            }
          }
        });
      });

      // Get most common colors
      const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);

      if (!colors.primary && sortedColors[0]) {
        colors.primary = sortedColors[0];
      }
      if (!colors.accent && sortedColors[1] && sortedColors[1] !== colors.primary) {
        colors.accent = sortedColors[1];
      }
    }

    // Return null if we didn't find any meaningful colors
    if (!colors.primary && !colors.accent && !colors.secondary) {
      return null;
    }

    return colors;
  });
}

/**
 * Extract social media links
 */
export async function extractSocialLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const socialPatterns = [
      /facebook\.com/i,
      /instagram\.com/i,
      /twitter\.com/i,
      /x\.com/i,
      /linkedin\.com/i,
      /youtube\.com/i,
      /tiktok\.com/i,
      /yelp\.com/i,
    ];

    const links: string[] = [];
    const anchors = document.querySelectorAll('a[href]');

    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (socialPatterns.some(p => p.test(href))) {
        links.push(href);
      }
    }

    return [...new Set(links)];
  });
}
