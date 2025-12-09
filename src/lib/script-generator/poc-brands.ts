/**
 * POC Brand Configurations
 *
 * Rich brand context for the 3 POC restaurants.
 * This data is injected into the LLM prompt - the LLM generates all creative copy.
 */

import type { AdTone } from './types';

export interface POCBrandIdentity {
  established: string;
  founder?: string;
  founderOrigin?: string;
  founders?: string;
  foundingStory?: string;
  originalLocation?: string;
  currentLocation?: string;
  location?: string;
  ownerStatus?: string;
  expansion?: string;
  scale?: string;
  parentCompany?: string;
  hours?: string;
  dailyProduction?: string;
}

export interface POCBrandMission {
  statement: string;
  philosophy: string;
  approach?: string;
}

export interface POCBrandSourcing {
  proteins?: string;
  produce?: string;
  local?: string;
  farming?: string;
  transparency?: string;
}

export interface POCBrandIngredients {
  cheese?: string;
  sauce?: string;
  dough?: string;
  specialty?: Record<string, string>;
  salads?: string;
}

export interface POCBrandProductQuality {
  texture?: string;
  cakeDonuts?: string;
  glaze?: string;
  chocolate?: string;
  reputation?: string;
}

export interface POCBrandConfig {
  brandName: string;
  urlPatterns: string[];

  // Core identity
  identity: POCBrandIdentity;

  // Mission & values (primarily for Sweetgreen)
  mission?: POCBrandMission;

  // Taglines (brand's own taglines, not ad copy)
  taglines?: string[];

  // Recognition & press
  recognition?: string[];

  // What makes them special
  uniqueQualities: string[];

  // Ingredient/sourcing quality
  ingredients?: POCBrandIngredients;
  sourcing?: POCBrandSourcing;
  sustainability?: string[];

  // Product quality descriptors (from reviews/reputation)
  productQuality?: POCBrandProductQuality;

  // Menu categories for image diversity selection
  menuCategories: Record<string, string[]>;

  // Suggested tone for ad
  tone: AdTone;
  cuisine: string;
}

/**
 * Joe's Pizza - NYC Institution Since 1975
 */
const JOES_PIZZA: POCBrandConfig = {
  brandName: "Joe's Pizza",
  urlPatterns: ["joespizza.com", "joespizza"],

  identity: {
    established: "1975",
    founder: "Pino 'Joe' Pozzuoli",
    founderOrigin: "Naples, Italy - the birthplace of pizza",
    originalLocation: "Corner of Bleecker and Carmine Street, Greenwich Village",
    currentLocation: "7 Carmine Street, Greenwich Village, NYC",
    ownerStatus: "Joe Pozzuoli, now in his 80s, still owns and operates the restaurant",
    expansion: "Multiple NYC locations, plus Ann Arbor, Miami, Boston, and international locations"
  },

  recognition: [
    "Named 'Best of New York' by New York Magazine",
    "Called 'the quintessential New York slice' by New York Magazine",
    "Listed as one of 'Best 25 Pizzas on Earth' by GQ Magazine (2009)",
    "Featured in Spider-Man movie",
    "Appeared in Along Came Polly, Sex and the City, Keeping Up with the Kardashians",
    "Celebrity favorite: Leonardo DiCaprio, Jessica Alba, Conan O'Brien, Jack Grealish",
    "Pete Wells (NY Times): 'When neoclassical slice-shop owners say they emulate the old-school joints that still obsess over quality, Joe's is one of the places they're talking about'"
  ],

  uniqueQualities: [
    "Greenwich Village institution for nearly 50 years",
    "Authentic New York street-style pizza",
    "Thin, crispy yet perfectly foldable slices",
    "Equally loved by tourists and native New Yorkers",
    "The pizza that defined what a New York slice should be"
  ],

  ingredients: {
    cheese: "All natural mozzarella cheese - no preservatives, fillers, or artificial ingredients",
    sauce: "House-made tomato sauce",
    dough: "Hand-tossed fresh daily",
    specialty: {
      grandmaPizza: "Grandma's secret marinara sauce, fresh buffalo mozzarella, parmesan reggiano, baby basil, aromatic olive oil",
      artichokePizza: "Artichoke hearts, fresh spinach & garlic, whipped ricotta, romano cheese",
      vegetablePizza: "Farmers market fresh ingredients"
    },
    salads: "Organic mix greens, fresh buffalo mozzarella"
  },

  menuCategories: {
    pizzas: ["NY Cheese Pizza", "Pepperoni Pizza", "Margherita", "White Pizza", "Sicilian Pizza", "Grandma Pizza", "Caprese Pizza", "Sausage Pizza", "Spinach & Artichoke Pizza", "My Way Pizza", "Sicilian Pepperoni"],
    salads: ["Organic Italian Salad", "Caesar Salad", "Caprese Salad", "Organic Antipasto Salad"],
    sides: ["House-made Meatballs", "Garlic Knots"]
  },

  tone: "playful",
  cuisine: "pizza"
};

/**
 * Sweetgreen - Real Food, Real Good
 */
const SWEETGREEN: POCBrandConfig = {
  brandName: "Sweetgreen",
  urlPatterns: ["sweetgreen.com", "sweetgreen"],

  identity: {
    established: "2007",
    founders: "Nicolas Jammet, Nathaniel Ru, Jonathan Neman",
    foundingStory: "Three college students looking for healthier fast food options - opened first 560 sq ft store in Washington D.C. on August 1, 2007",
    scale: "260+ locations nationwide"
  },

  taglines: [
    "Fresh, plant-forward, earth-friendly food"
  ],

  mission: {
    statement: "Building healthier communities by connecting people to real food",
    philosophy: "Reimagining fast food - proving quality doesn't need to be sacrificed for convenience",
    approach: "Transparent supply network, cooking from scratch, empowering positive change in the food system"
  },

  recognition: [
    "Pioneer of farm-to-table fast-casual dining",
    "Nicolas Jammet: 'Our mission was simple: source better ingredients from local farmers and growers, and connect more people to real food'"
  ],

  uniqueQualities: [
    "Real food made from scratch daily",
    "Locally sourced, seasonally inspired menu",
    "Transparent about ingredients and sourcing",
    "Chef-crafted recipes with whole ingredients",
    "Healthy eating that actually tastes good"
  ],

  sourcing: {
    proteins: "Antibiotic-free roasted chicken, antibiotic-free grass-fed steak, antibiotic-free miso glazed salmon",
    produce: "Organic shredded kale, organic baby spinach, organic arugula, organic spring mix",
    local: "30% of produce sourced locally, locally-made rosemary focaccia from regional bakery partners",
    farming: "Work with farmers using regenerative practices - giving more to the land than they take",
    transparency: "Carbon footprint labeling on every menu item"
  },

  sustainability: [
    "Carbon neutral operations by end of 2027",
    "Plant-forward menu with 30% lower carbon intensity than typical American meals",
    "Better Chicken Commitment for animal welfare",
    "Eco-friendly aluminum bottles for plastic-free oceans",
    "Sustainable restaurant design with clean energy"
  ],

  menuCategories: {
    salads: ["Kale Caesar", "Guac Greens", "Buffalo Chicken Salad", "Super Green Goddess", "Garden Cobb", "Hummus Crunch"],
    bowls: ["Harvest Bowl", "Chicken Pesto Parm", "Shroomami", "Crispy Rice Bowl", "Fish Taco Bowl"],
    plates: ["Caramelized Garlic Steak Plate", "Miso Glazed Salmon Plate", "Hot Honey Chicken Plate"],
    sides: ["Rosemary Focaccia", "Roasted Sweet Potatoes", "Hummus"],
    drinks: ["Hibiscus Clover Tea", "Organic Juices"]
  },

  tone: "professional",
  cuisine: "salad"
};

/**
 * Doughnut Vault - Artisanal Doughnuts, Chicago
 */
const DOUGHNUT_VAULT: POCBrandConfig = {
  brandName: "Doughnut Vault",
  urlPatterns: ["doughnutvault.com", "doughnut-vault", "doughnutvault"],

  identity: {
    established: "2011",
    founder: "Brendan Sodikoff (trained at Per Se and Alain Ducasse)",
    parentCompany: "Hogsalt Hospitality (also owns Au Cheval, Aster Hall)",
    location: "401 N Franklin St, Chicago - River North, housed in an old bank vault",
    hours: "Daily 7:30am - 1:00pm",
    dailyProduction: "~600 doughnuts per day"
  },

  taglines: [
    "Artisanal doughnuts handcrafted daily using old world recipes",
    "Maybe old fashioned, but always in style",
    "Life is sweet"
  ],

  uniqueQualities: [
    "Small-batch artisan doughnuts made with love",
    "Old world recipes passed down through generations",
    "Fresh from the fryer - available until sold out",
    "Tucked inside an actual vintage bank vault",
    "Morning ritual - Chicago locals line up at dawn",
    "Gone before noon - sells out in under 2 hours",
    "A sweet destination worth the journey"
  ],

  productQuality: {
    texture: "That perfect crunch when you bite through the glaze, then clouds of soft, tender dough inside",
    cakeDonuts: "Light as air - these aren't your typical dense cake doughnuts. They practically melt on your tongue",
    glaze: "Glossy, crackly glaze that shatters perfectly with each bite",
    chocolate: "Rich, velvety chocolate that coats each doughnut just right",
    reputation: "Chicago's best-kept sweet secret - fluffy, dreamy doughnuts worth waking up early for"
  },

  menuCategories: {
    oldFashioned: ["Buttermilk Old Fashioned", "Triple Chocolate Old Fashioned", "Pistachio Old Fashioned", "Lemon Poppyseed Old Fashioned", "Almond Old Fashioned"],
    glazed: ["Vanilla Glazed", "Chocolate Glazed", "Strawberry Glazed"],
    specialty: ["Gingerbread Stack", "Vanilla Birthday Cake", "Apple Fritter", "Red Velvet", "Carrot Cake", "Apple Cider"],
    other: ["Doughnut Holes", "Coffee", "Cold Brew"]
  },

  tone: "friendly",
  cuisine: "bakery"
};

/**
 * All POC brand configs
 */
export const POC_BRANDS: POCBrandConfig[] = [
  JOES_PIZZA,
  SWEETGREEN,
  DOUGHNUT_VAULT
];

/**
 * Detect if a brand matches a POC restaurant
 */
export function detectPOCBrand(brandName: string, url?: string): POCBrandConfig | null {
  const normalizedBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedUrl = url?.toLowerCase() || '';

  for (const brand of POC_BRANDS) {
    // Check brand name match
    const normalizedConfigName = brand.brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedBrand.includes(normalizedConfigName) || normalizedConfigName.includes(normalizedBrand)) {
      return brand;
    }

    // Check URL patterns
    for (const pattern of brand.urlPatterns) {
      if (normalizedUrl.includes(pattern.toLowerCase())) {
        return brand;
      }
    }
  }

  return null;
}

/**
 * Build a formatted brand context string for LLM prompt injection
 */
export function buildBrandContextPrompt(brand: POCBrandConfig): string {
  const sections: string[] = [];

  // Identity
  sections.push(`BRAND: ${brand.brandName}`);
  sections.push(`ESTABLISHED: ${brand.identity.established}`);

  if (brand.identity.founder) {
    sections.push(`FOUNDER: ${brand.identity.founder}`);
  }
  if (brand.identity.founders) {
    sections.push(`FOUNDERS: ${brand.identity.founders}`);
  }
  if (brand.identity.founderOrigin) {
    sections.push(`ORIGIN: ${brand.identity.founderOrigin}`);
  }
  if (brand.identity.foundingStory) {
    sections.push(`FOUNDING STORY: ${brand.identity.foundingStory}`);
  }
  if (brand.identity.location || brand.identity.currentLocation) {
    sections.push(`LOCATION: ${brand.identity.location || brand.identity.currentLocation}`);
  }
  if (brand.identity.scale) {
    sections.push(`SCALE: ${brand.identity.scale}`);
  }
  if (brand.identity.ownerStatus) {
    sections.push(`OWNER: ${brand.identity.ownerStatus}`);
  }

  // Taglines
  if (brand.taglines && brand.taglines.length > 0) {
    sections.push(`\nBRAND TAGLINES:\n${brand.taglines.map(t => `- "${t}"`).join('\n')}`);
  }

  // Mission
  if (brand.mission) {
    sections.push(`\nMISSION: ${brand.mission.statement}`);
    sections.push(`PHILOSOPHY: ${brand.mission.philosophy}`);
    if (brand.mission.approach) {
      sections.push(`APPROACH: ${brand.mission.approach}`);
    }
  }

  // Recognition
  if (brand.recognition && brand.recognition.length > 0) {
    sections.push(`\nRECOGNITION & PRESS:\n${brand.recognition.map(r => `- ${r}`).join('\n')}`);
  }

  // What makes them special
  sections.push(`\nWHAT MAKES THEM SPECIAL:\n${brand.uniqueQualities.map(q => `- ${q}`).join('\n')}`);

  // Ingredients/Quality
  if (brand.ingredients) {
    const ingredientLines: string[] = [];
    if (brand.ingredients.cheese) ingredientLines.push(`- Cheese: ${brand.ingredients.cheese}`);
    if (brand.ingredients.sauce) ingredientLines.push(`- Sauce: ${brand.ingredients.sauce}`);
    if (brand.ingredients.dough) ingredientLines.push(`- Dough: ${brand.ingredients.dough}`);
    if (brand.ingredients.salads) ingredientLines.push(`- Salads: ${brand.ingredients.salads}`);
    if (ingredientLines.length > 0) {
      sections.push(`\nINGREDIENT QUALITY:\n${ingredientLines.join('\n')}`);
    }
  }

  // Sourcing
  if (brand.sourcing) {
    const sourcingLines: string[] = [];
    if (brand.sourcing.proteins) sourcingLines.push(`- Proteins: ${brand.sourcing.proteins}`);
    if (brand.sourcing.produce) sourcingLines.push(`- Produce: ${brand.sourcing.produce}`);
    if (brand.sourcing.local) sourcingLines.push(`- Local: ${brand.sourcing.local}`);
    if (brand.sourcing.farming) sourcingLines.push(`- Farming: ${brand.sourcing.farming}`);
    if (sourcingLines.length > 0) {
      sections.push(`\nSOURCING & QUALITY:\n${sourcingLines.join('\n')}`);
    }
  }

  // Product quality (for Doughnut Vault)
  if (brand.productQuality) {
    const qualityLines: string[] = [];
    if (brand.productQuality.texture) qualityLines.push(`- Texture: ${brand.productQuality.texture}`);
    if (brand.productQuality.glaze) qualityLines.push(`- Glaze: ${brand.productQuality.glaze}`);
    if (brand.productQuality.reputation) qualityLines.push(`- Reputation: ${brand.productQuality.reputation}`);
    if (qualityLines.length > 0) {
      sections.push(`\nPRODUCT QUALITY:\n${qualityLines.join('\n')}`);
    }
  }

  // Sustainability
  if (brand.sustainability && brand.sustainability.length > 0) {
    sections.push(`\nSUSTAINABILITY:\n${brand.sustainability.map(s => `- ${s}`).join('\n')}`);
  }

  // Menu categories
  const menuLines = Object.entries(brand.menuCategories)
    .map(([category, items]) => `- ${category}: ${items.slice(0, 5).join(', ')}${items.length > 5 ? '...' : ''}`)
    .join('\n');
  sections.push(`\nMENU CATEGORIES:\n${menuLines}`);

  sections.push(`\nTONE: ${brand.tone}`);
  sections.push(`CUISINE TYPE: ${brand.cuisine}`);

  return sections.join('\n');
}
