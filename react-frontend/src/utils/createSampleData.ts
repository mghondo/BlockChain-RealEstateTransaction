import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Create sample properties and investments for testing
export const createSampleInvestmentData = async (userId: string): Promise<void> => {
  try {
    console.log('Creating sample investment data for user:', userId);

    // Create sample properties
    const properties = [
      {
        class: 'C',
        address: '123 Maple Street',
        city: 'Columbus',
        state: 'OH',
        region: 'midwest',
        price: 150000,
        currentValue: 155000,
        sqft: 1200,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2010,
        rentalYield: 12.5,
        imageUrl: '/property-images/class-c/midwest/sample1.jpg',
        status: 'active',
      },
      {
        class: 'B',
        address: '456 Oak Avenue',
        city: 'Austin',
        state: 'TX',
        region: 'southwest',
        price: 750000,
        currentValue: 780000,
        sqft: 2400,
        bedrooms: 4,
        bathrooms: 3,
        yearBuilt: 2018,
        rentalYield: 8.2,
        imageUrl: '/property-images/class-b/southwest/sample1.jpg',
        status: 'active',
      },
    ];

    const propertyIds: string[] = [];

    // Add properties to Firestore
    for (const property of properties) {
      const docRef = await addDoc(collection(db, 'properties'), {
        ...property,
        createdAt: new Date(),
        selloutTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      });
      propertyIds.push(docRef.id);
      console.log('Created property:', docRef.id);
    }

    // Create sample investments
    const investments = [
      {
        userId,
        propertyId: propertyIds[0],
        sharesOwned: 15,
        purchasePrice: 150000,
        currentValue: 155000,
        purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
      {
        userId,
        propertyId: propertyIds[1],
        sharesOwned: 8,
        purchasePrice: 750000,
        currentValue: 780000,
        purchaseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      },
    ];

    // Add investments to Firestore
    for (const investment of investments) {
      await addDoc(collection(db, 'investments'), investment);
      console.log('Created investment for property:', investment.propertyId);
    }

    // Update user's ETH and USDC balances
    await setDoc(doc(db, 'users', userId), {
      ethBalance: 5.5, // Starting ETH balance
      usdcBalance: 0, // Will be updated by rental income
    }, { merge: true });

    console.log('Sample investment data created successfully!');

  } catch (error) {
    console.error('Error creating sample data:', error);
    throw error;
  }
};

// Helper function to trigger sample data creation (call from browser console)
export const setupTestInvestments = async (userId: string): Promise<void> => {
  if (!userId) {
    console.error('User ID required');
    return;
  }

  await createSampleInvestmentData(userId);
  console.log('Test investments created! Rental income should start processing automatically.');
};