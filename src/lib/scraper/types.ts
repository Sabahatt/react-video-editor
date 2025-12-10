/**
 * Scraper Types - Type definitions for web scraping pipeline
 * Optimized for restaurant video ad generation
 */

/** Food categories for prompt generation */
export type FoodType =
  | 'pizza'
  | 'salad'
  | 'bowl'
  | 'doughnut'
  | 'pastry'
  | 'bread'
  | 'sides'
  | 'protein'
  | 'appetizer';

export interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Image classification - no 'unknown', everything categorized or excluded */
  type: 'logo' | 'hero' | 'product' | 'background';
  /** Product name extracted from nearby heading or alt text */
  productName?: string;
  /** Product description from nearby paragraph or menu data */
  productDescription?: string;
  /** Detected food type for Akool prompt generation */
  foodType?: FoodType;
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
