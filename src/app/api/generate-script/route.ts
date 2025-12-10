/**
 * Script Generation API - v3
 *
 * When images are provided, does full v3 processing:
 * 1. Generate script with LLM
 * 2. Plan scenes (animated vs static with pattern variation)
 * 3. Select images with main dish prioritization
 * 4. Generate Akool prompts (templates for POC, no LLM)
 *
 * Returns complete scene data ready for timeline builder.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateScript,
  detectPOCBrand,
  categorizeImages,
  selectImagesForScenePlan,
  getMainDishType,
  planScenes,
  generatePOCTemplatePrompt,
  type AdTone,
  type ContactInfo,
  type AkoolAnimationConfig,
} from '@/lib/script-generator';
import type { ScenePlan } from '@/lib/script-generator/scene-planner';

interface ScrapedImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  type?: string;
  foodType?: string;
  productDescription?: string;
}

interface SceneWithImagesV3 {
  sceneId: string;
  sceneIndex: number;
  voiceoverText: string;
  displayText: string;
  duration: number;
  visualMode: 'animated' | 'static';
  kenBurnsDirection?: string;
  selectedImage: {
    url: string;
    alt: string;
    category: string;
    foodType?: string;
  } | null;
  akoolConfig: AkoolAnimationConfig | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brandName,
      tagline,
      description,
      cuisine,
      tone,
      duration = 20,
      url,
      contact,
      images, // Optional: scraped images for full v3 processing
    } = body;

    // Validate required fields
    if (!brandName || typeof brandName !== 'string') {
      return NextResponse.json(
        { error: 'brandName is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if this is a POC brand
    const pocBrand = detectPOCBrand(brandName.trim(), url);

    // Determine effective tone
    const validTones: AdTone[] = ['professional', 'playful', 'urgent', 'friendly'];
    let effectiveTone: AdTone;

    if (tone && validTones.includes(tone)) {
      effectiveTone = tone as AdTone;
    } else if (pocBrand) {
      effectiveTone = pocBrand.tone;
    } else {
      effectiveTone = 'friendly';
    }

    // Validate duration
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration < 5 || numDuration > 60) {
      return NextResponse.json(
        { error: 'Duration must be a number between 5 and 60 seconds' },
        { status: 400 }
      );
    }

    // Build contact info if provided
    const contactInfo: ContactInfo | undefined = contact ? {
      phone: contact.phone?.trim(),
      address: contact.address?.trim(),
      website: contact.website?.trim(),
      hours: contact.hours?.trim(),
    } : undefined;

    // ============ Step 1: Generate Script ============
    console.log(`[generate-script] Generating script for ${brandName}...`);
    const result = await generateScript({
      brandName: brandName.trim(),
      tagline: tagline?.trim(),
      description: description?.trim(),
      cuisine: cuisine?.trim(),
      tone: effectiveTone,
      duration: numDuration,
      url: url?.trim(),
      contact: contactInfo,
    });

    if (!result.success || !result.script) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate script' },
        { status: 500 }
      );
    }

    // If no images provided, return basic script (legacy mode)
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.log(`[generate-script] No images provided, returning basic script`);
      return NextResponse.json({
        success: true,
        script: result.script,
        pocBrand: pocBrand ? {
          name: pocBrand.brandName,
          tone: pocBrand.tone,
          menuCategories: Object.keys(pocBrand.menuCategories),
        } : null,
      });
    }

    // ============ Full v3 Processing with Images ============
    console.log(`[generate-script] Full v3 processing with ${images.length} images...`);

    // ============ Step 2: Scene Planning ============
    const scenesForPlanning = result.script.scenes.map((s) => ({
      id: s.id,
      visualCategory: s.visualCategory,
      visualType: s.visualType,
    }));

    const scenePlan: ScenePlan = planScenes(scenesForPlanning, pocBrand);
    console.log(`[generate-script] Scene plan: pattern ${scenePlan.patternIndex + 1}, ${scenePlan.animatedCount} animated, ${scenePlan.staticCount} static`);

    // ============ Step 3: Image Selection ============
    const mainDishType = getMainDishType(brandName);
    const menuCategories = pocBrand?.menuCategories || {};

    // Convert images to proper format for categorization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrapedImages = images.map((img: ScrapedImage) => ({
      url: img.url,
      alt: img.alt || '',
      width: img.width,
      height: img.height,
      type: (img.type || 'product') as 'product' | 'logo' | 'hero' | 'background',
      foodType: img.foodType,
      productDescription: img.productDescription,
    }));

    const categorizedImages = categorizeImages(scrapedImages as any, menuCategories);
    const selectedImages = selectImagesForScenePlan(categorizedImages, scenePlan, mainDishType);
    console.log(`[generate-script] Selected ${selectedImages.length} images`);

    // ============ Step 4: Build Scenes with Images and Akool Prompts ============
    let imageIndex = 0;
    const scenesWithImages: SceneWithImagesV3[] = [];

    for (let sceneIdx = 0; sceneIdx < result.script.scenes.length; sceneIdx++) {
      const scene = result.script.scenes[sceneIdx];
      const plannedScene = scenePlan.scenes.find(s => s.sceneIndex === sceneIdx);
      const shouldAnimate = plannedScene?.visualMode === 'animated';
      const kenBurnsDirection = plannedScene?.kenBurnsDirection;

      // Get selected image (if not CTA)
      let selectedImage = null;
      if (scene.visualType !== 'logo_brand' && scene.id !== 'cta') {
        selectedImage = imageIndex < selectedImages.length
          ? selectedImages[imageIndex++]
          : null;
      }

      // Generate Akool prompt for animated scenes using templates
      let akoolConfig: AkoolAnimationConfig | null = null;
      if (shouldAnimate && selectedImage) {
        akoolConfig = generatePOCTemplatePrompt(
          selectedImage.alt,
          {
            productDescription: selectedImage.productDescription,
            foodType: selectedImage.foodType,
            brandName: brandName,
            sceneIndex: sceneIdx,
          }
        );
      }

      // For hook scene, use tagline/USP as display text if available
      const displayText = scene.id === 'hook' && tagline
        ? tagline
        : scene.displayText;

      scenesWithImages.push({
        sceneId: scene.id,
        sceneIndex: sceneIdx,
        voiceoverText: scene.voiceoverText,
        displayText,
        duration: scene.duration,
        visualMode: shouldAnimate ? 'animated' : 'static',
        kenBurnsDirection,
        selectedImage: selectedImage ? {
          url: selectedImage.url,
          alt: selectedImage.alt,
          category: selectedImage.category,
          foodType: selectedImage.foodType,
        } : null,
        akoolConfig,
      });
    }

    // Return v3 format
    return NextResponse.json({
      success: true,
      pocBrand: result.pocBrand || null,
      mainDishType: mainDishType || null,
      fullScript: result.script.fullScript,
      tone: result.script.tone,
      totalDuration: result.script.totalDuration,
      scenePlan: {
        patternIndex: scenePlan.patternIndex,
        patternName: `Pattern ${scenePlan.patternIndex + 1}`,
        animatedCount: scenePlan.animatedCount,
        staticCount: scenePlan.staticCount,
      },
      scenes: scenesWithImages,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Script generation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
