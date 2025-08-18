import type { 
  Property, 
  PropertyClass, 
  PropertyRegion, 
  PropertyClassConfig, 
  StateRegionMapping,
  MockInvestor 
} from '../types/property';
import { Timestamp } from 'firebase/firestore';
import imageInventory from './imageInventory.json';

// Type assertion for image inventory
type ImageInventory = Record<PropertyClass, Record<PropertyRegion, string[]>>;
const typedImageInventory = imageInventory as ImageInventory;

// US States to regions mapping
export const STATE_REGION_MAPPING: StateRegionMapping = {
  // Southeast
  'FL': 'Southeast', 'GA': 'Southeast', 'SC': 'Southeast', 'AL': 'Southeast', 'MS': 'Southeast',
  'LA': 'Southeast', 
  
  // Southwest  
  'CA': 'Southwest', 'AZ': 'Southwest', 'NM': 'Southwest', 'NV': 'Southwest', 'TX': 'Southwest',
  'HI': 'Southwest',
  
  // Northwest (Class A only - mountain apartments)
  'WA': 'Northwest', 'OR': 'Northwest', 'ID': 'Northwest', 'MT': 'Northwest', 'TN': 'Northwest',
  'CO': 'Northwest', 'UT': 'Northwest', 'WY': 'Northwest', 'AK': 'Northwest', 'WV': 'Northwest',
  
  // Midwest/Northeast (all other states)
  'IL': 'Midwest', 'IN': 'Midwest', 'IA': 'Midwest', 'KS': 'Midwest', 'MI': 'Midwest',
  'MN': 'Midwest', 'MO': 'Midwest', 'NE': 'Midwest', 'ND': 'Midwest', 'OH': 'Midwest',
  'SD': 'Midwest', 'WI': 'Midwest', 'ME': 'Midwest', 'NH': 'Midwest', 'VT': 'Midwest',
  'MA': 'Midwest', 'RI': 'Midwest', 'CT': 'Midwest', 'NY': 'Midwest', 'NJ': 'Midwest',
  'PA': 'Midwest', 'DE': 'Midwest', 'MD': 'Midwest', 'DC': 'Midwest', 
  'NC': 'Midwest', 'KY': 'Midwest', 'VA': 'Midwest', 'AR': 'Midwest',
};

// Property class configurations
export const PROPERTY_CLASS_CONFIGS: Record<PropertyClass, PropertyClassConfig> = {
  'C': {
    priceRange: { min: 100000, max: 500000 },
    sqftRange: { min: 800, max: 2000 },
    bedroomRange: { min: 1, max: 3 },
    bathroomRange: { min: 1, max: 2 },
    yearBuiltRange: { min: 1960, max: 2010 },
    rentalYieldRange: { min: 0.08, max: 0.15 },
    types: ['Basic residential homes', 'Duplexes', 'Trailer parks', 'Starter homes'],
    targetAreas: ['Developing neighborhoods', 'Rural areas', 'Entry-level markets'],
    financingRequired: false,
    distributionWeight: 0.4
  },
  'B': {
    priceRange: { min: 500000, max: 2000000 },
    sqftRange: { min: 1500, max: 4000 },
    bedroomRange: { min: 2, max: 5 },
    bathroomRange: { min: 2, max: 4 },
    yearBuiltRange: { min: 1980, max: 2020 },
    rentalYieldRange: { min: 0.05, max: 0.10 },
    types: ['Single-family homes', 'Townhouses', 'Luxury condos', 'Small apartment buildings'],
    targetAreas: ['Established neighborhoods', 'Suburban developments', 'Secondary markets'],
    financingRequired: false,
    distributionWeight: 0.4
  },
  'A': {
    priceRange: { min: 2000000, max: 50000000 },
    sqftRange: { min: 5000, max: 100000 },
    bedroomRange: { min: 10, max: 200 }, // Unit count for apartments
    bathroomRange: { min: 10, max: 200 },
    yearBuiltRange: { min: 1990, max: 2024 },
    rentalYieldRange: { min: 0.03, max: 0.08 },
    types: ['Large apartment buildings', 'Commercial real estate', 'Luxury high-rise condos', 'Mixed-use developments'],
    targetAreas: ['Prime urban locations', 'Luxury markets', 'Commercial districts'],
    financingRequired: true,
    distributionWeight: 0.2
  }
};

// US Cities database (sample - can be expanded)
const US_CITIES_BY_STATE: Record<string, string[]> = {
  'CA': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland', 'Fresno', 'Long Beach'],
  'TX': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington'],
  'FL': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'St. Petersburg', 'Tallahassee', 'Fort Lauderdale'],
  'NY': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Yonkers', 'Utica'],
  'IL': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield', 'Peoria'],
  'GA': ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell'],
  'NC': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary'],
  'AZ': ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Gilbert'],
  'WA': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett'],
  'OR': ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro', 'Bend', 'Beaverton'],
  'CO': ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada'],
  'MI': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing', 'Ann Arbor', 'Flint'],
  'OH': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma'],
  'PA': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem'],
  'MA': ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge', 'New Bedford', 'Brockton'],
  'VA': ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton'],
  'TN': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Jackson'],
  'IN': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington'],
  'MO': ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee Summit', 'O Fallon'],
  'WI': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha']
};

// Image hosting configuration
const IMAGE_CONFIG = {
  baseUrl: 'https://fractional-real-estate.netlify.app',
  classes: ['A', 'B', 'C'] as PropertyClass[],
  regions: ['Anywhere', 'Midwest', 'Southeast', 'Southwest', 'Northwest'] as string[],
  fallbackRegion: 'Anywhere'
};

// Street name components for realistic address generation
const STREET_NAMES = [
  'Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Washington', 'Park', 'River', 'Hill',
  'Lake', 'Spring', 'Church', 'School', 'Mill', 'Union', 'High', 'Second', 'Third', 'First',
  'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Market', 'Water',
  'Liberty', 'Franklin', 'Lincoln', 'Jefferson', 'Madison', 'Jackson', 'Adams', 'Monroe',
  'Harrison', 'Tyler', 'Polk', 'Taylor', 'Wilson', 'Johnson', 'Williams', 'Brown', 'Davis',
  'Miller', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson'
];

const STREET_TYPES = ['St', 'Ave', 'Dr', 'Ln', 'Rd', 'Blvd', 'Ct', 'Pl', 'Way', 'Pkwy'];

// Utility functions
export const getRandomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const getRandomFromArray = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const weightedRandomSelect = (weights: Record<PropertyClass, number>): PropertyClass => {
  const random = Math.random();
  let sum = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    sum += weight;
    if (random < sum) {
      return key as PropertyClass;
    }
  }
  
  return 'C'; // Fallback
};

// Regional classification
export const getRegionFromState = (propertyClass: PropertyClass, state: string): PropertyRegion => {
  const region = STATE_REGION_MAPPING[state] || 'midwest';
  
  // Northwest is only available for Class A properties
  if (region === 'Northwest' && propertyClass !== 'A') {
    return 'Midwest'; // Fallback to midwest for non-A properties
  }
  
  return region;
};

// Address generation
export const generateStreetAddress = (): string => {
  const number = getRandomBetween(1, 9999);
  const streetName = getRandomFromArray(STREET_NAMES);
  const streetType = getRandomFromArray(STREET_TYPES);
  
  return `${number} ${streetName} ${streetType}`;
};

// State and city selection
export const getRandomUSState = (): string => {
  const states = Object.keys(STATE_REGION_MAPPING);
  return getRandomFromArray(states);
};

export const getRandomCityInState = (state: string): string => {
  const cities = US_CITIES_BY_STATE[state];
  if (!cities || cities.length === 0) {
    // Fallback to generated city name
    return `${getRandomFromArray(['North', 'South', 'East', 'West', 'New', 'Old', 'Mount', 'Lake'])} ${getRandomFromArray(['field', 'ville', 'town', 'burg', 'dale', 'ford', 'port', 'view'])}`;
  }
  return getRandomFromArray(cities);
};

// Image counter for tracking (still needed by resetImageCounter function)
let imageCounter = 1;

// Real Netlify image selection using actual image inventory
export const getPropertyImage = (propertyClass: PropertyClass, region: PropertyRegion): string => {
  const baseUrl = IMAGE_CONFIG.baseUrl; // https://fractional-real-estate.netlify.app
  
  // Try to get image from specific region first
  const regionImages = typedImageInventory[propertyClass]?.[region];
  if (regionImages && regionImages.length > 0) {
    const randomImage = regionImages[Math.floor(Math.random() * regionImages.length)];
    return `${baseUrl}/${propertyClass}/${region}/${randomImage}`;
  }
  
  // Fallback to "Anywhere" folder if specific region has no images
  if (region !== 'Anywhere') {
    const anywhereImages = typedImageInventory[propertyClass]?.['Anywhere'];
    if (anywhereImages && anywhereImages.length > 0) {
      const randomImage = anywhereImages[Math.floor(Math.random() * anywhereImages.length)];
      return `${baseUrl}/${propertyClass}/Anywhere/${randomImage}`;
    }
  }
  
  // Final fallback: use known working image
  return `${baseUrl}/A/Anywhere/Whisk_0c19ce0c66.jpg`;
};

// Removed unused functions that were causing issues

// Mock investor generation
export const generateMockInvestors = (propertyValue: number): MockInvestor[] => {
  const investorCount = getRandomBetween(3, 12);
  const investors: MockInvestor[] = [];
  
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Blake', 'Sage'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  
  for (let i = 0; i < investorCount; i++) {
    const firstName = getRandomFromArray(firstNames);
    const lastName = getRandomFromArray(lastNames);
    const sharesOwned = getRandomBetween(1, 50);
    const sharePrice = Math.floor(propertyValue / 1000); // $1000 shares roughly
    const investmentAmount = sharesOwned * sharePrice;
    
    investors.push({
      id: `investor_${Date.now()}_${i}`,
      name: `${firstName} ${lastName.charAt(0)}.`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
      sharesOwned,
      investmentAmount,
      investmentDate: new Date(Date.now() - getRandomBetween(1, 365) * 24 * 60 * 60 * 1000)
    });
  }
  
  return investors;
};

// Property details generation based on class
export const generatePropertyDetails = (propertyClass: PropertyClass) => {
  const config = PROPERTY_CLASS_CONFIGS[propertyClass];
  
  return {
    price: getRandomBetween(config.priceRange.min, config.priceRange.max),
    sqft: getRandomBetween(config.sqftRange.min, config.sqftRange.max),
    bedrooms: getRandomBetween(config.bedroomRange.min, config.bedroomRange.max),
    bathrooms: getRandomBetween(config.bathroomRange.min, config.bathroomRange.max),
    yearBuilt: getRandomBetween(config.yearBuiltRange.min, config.yearBuiltRange.max),
    rentalYield: getRandomFloat(config.rentalYieldRange.min, config.rentalYieldRange.max)
  };
};

// Main property generation function
export const generateProperty = async (): Promise<Omit<Property, 'id'>> => {
  // Weighted random selection: 40% C, 40% B, 20% A
  const classWeights = { C: 0.4, B: 0.4, A: 0.2 };
  const selectedClass = weightedRandomSelect(classWeights);
  
  // Generate realistic location
  const state = getRandomUSState();
  const city = getRandomCityInState(state);
  const region = getRegionFromState(selectedClass, state);
  
  // Generate property details based on class
  const propertyDetails = generatePropertyDetails(selectedClass);
  
  // Select appropriate image
  const imageUrl = getPropertyImage(selectedClass, region);
  
  // Set sellout timer (1.5-2 hours from now)
  const selloutMinutes = getRandomBetween(90, 120);
  const selloutTime = Timestamp.fromDate(new Date(Date.now() + selloutMinutes * 60 * 1000));
  
  // Generate mock investors
  const mockInvestors = generateMockInvestors(propertyDetails.price);
  
  // Generate additional metadata - Always 100 shares per property
  const totalShares = 100;
  const sharePrice = Math.floor(propertyDetails.price / totalShares);
  const availableShares = getRandomBetween(70, 100); // 70-100 shares available
  
  const config = PROPERTY_CLASS_CONFIGS[selectedClass];
  const propertyType = getRandomFromArray(config.types);
  const targetArea = getRandomFromArray(config.targetAreas);
  
  return {
    class: selectedClass,
    address: generateStreetAddress(),
    city,
    state,
    region,
    ...propertyDetails,
    currentValue: propertyDetails.price, // Initially equal to market value
    imageUrl,
    selloutTime,
    status: 'available',
    createdAt: Timestamp.now(),
    mockInvestors,
    description: `Beautiful ${propertyType.toLowerCase()} located in ${targetArea.toLowerCase()}. Built in ${propertyDetails.yearBuilt}, this property offers excellent rental yield potential at ${(propertyDetails.rentalYield * 100).toFixed(1)}% annually.`,
    amenities: generateAmenities(selectedClass),
    totalShares,
    availableShares,
    sharePrice
  };
};

// Generate amenities based on property class
const generateAmenities = (propertyClass: PropertyClass): string[] => {
  const baseAmenities = ['Parking', 'Air Conditioning', 'Heating'];
  
  const classAmenities = {
    'C': ['Laundry Hookups', 'Outdoor Space', 'Storage'],
    'B': ['In-Unit Laundry', 'Garage', 'Patio/Deck', 'Modern Kitchen', 'Hardwood Floors'],
    'A': ['Concierge', 'Gym', 'Pool', 'Rooftop Deck', 'Security', 'Valet Parking', 'Business Center', 'Pet Spa']
  };
  
  const amenityPool = [...baseAmenities, ...classAmenities[propertyClass]];
  const amenityCount = getRandomBetween(3, Math.min(8, amenityPool.length));
  
  // Randomly select amenities
  const selectedAmenities = [];
  const shuffled = [...amenityPool].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < amenityCount; i++) {
    selectedAmenities.push(shuffled[i]);
  }
  
  return selectedAmenities;
};

// Reset image counter for new batch
export const resetImageCounter = () => {
  imageCounter = 1;
};

// Batch property generation for initial pool
export const generatePropertyBatch = async (count: number): Promise<Omit<Property, 'id'>[]> => {
  // Reset counter for new batch to ensure uniqueness
  resetImageCounter();
  const properties = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const property = await generateProperty();
      properties.push(property);
      
      // Small delay to avoid overwhelming the image checking service
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Failed to generate property:', error);
      // Continue with next property
    }
  }
  
  return properties;
};

// Validate property class distribution
export const validateClassDistribution = (properties: Property[]): boolean => {
  if (properties.length === 0) return true;
  
  const classCounts = { A: 0, B: 0, C: 0 };
  properties.forEach(p => classCounts[p.class]++);
  
  const total = properties.length;
  const aPercent = classCounts.A / total;
  const bPercent = classCounts.B / total;
  const cPercent = classCounts.C / total;
  
  // Allow some tolerance (±5%)
  return (
    Math.abs(aPercent - 0.2) <= 0.05 &&
    Math.abs(bPercent - 0.4) <= 0.05 &&
    Math.abs(cPercent - 0.4) <= 0.05
  );
};