/**
 * Scraper Types - Type definitions for web scraping pipeline
 */

export interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type: 'logo' | 'hero' | 'product' | 'background' | 'unknown';
  score?: number;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent?: string;
  background?: string;
  text?: string;
  palette: string[];
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  website: string;
}

export interface BrandInfo {
  name: string;
  tagline?: string;
  description?: string;
  cuisine?: string; // For restaurants: italian, mexican, japanese, etc.
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  image?: string;
}

export interface ScrapedData {
  brand: BrandInfo;
  logo?: string;
  images: ScrapedImage[];
  colors: BrandColors;
  contact: ContactInfo;
  menuItems?: MenuItem[];
  socialLinks?: string[];
  scrapedAt: string;
  sourceUrl: string;
}

export interface ScrapeOptions {
  timeout?: number;
  waitForImages?: boolean;
  maxImages?: number;
  extractMenu?: boolean;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
  timing?: {
    total: number;
    pageLoad: number;
    extraction: number;
    colorExtraction: number;
  };
}
