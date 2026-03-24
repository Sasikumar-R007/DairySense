import { createCow, generateCowId } from './services/cowService.js';
import pool from './config/database.js';

async function seedCows() {
  try {
    console.log('Starting to add 3 sample cows...');
    
    const cowsToSeed = [
      {
        breed: 'Holstein Friesian',
        purchase_date: '2026-03-05',
        source_type: 'Purchased',
        name: 'Bessie',
        cow_type: 'milking',
        weight_kg: 620,
        date_of_birth: '2022-04-12',
        status: 'active'
      },
      {
        breed: 'Jersey',
        purchase_date: '2026-01-20',
        source_type: 'Purchased',
        name: 'Daisy',
        cow_type: 'pregnant',
        weight_kg: 450,
        date_of_birth: '2021-08-30',
        status: 'active'
      },
      {
        breed: 'Ayrshire',
        purchase_date: '2025-11-10',
        source_type: 'Purchased',
        name: 'Rosie',
        cow_type: 'milking',
        weight_kg: 510,
        date_of_birth: '2020-05-15',
        status: 'active'
      }
    ];

    for (const cowData of cowsToSeed) {
      // 1. Generate the V2 ID based on breed, purchase_date, and source_type
      const generatedId = await generateCowId({
        breed: cowData.breed,
        purchaseDate: cowData.purchase_date,
        sourceType: cowData.source_type
      });
      
      cowData.cow_id = generatedId;
      
      // 2. Insert into the database using service logic
      const created = await createCow(cowData);
      console.log(`Successfully added: ${created.name} (${created.cow_id} / Tag: COW${(created.cow_tag || '000').padStart(3, '0')})`);
    }

    console.log('Sample cows successfully added!');
  } catch (error) {
    console.error('Error seeding cows:', error.message);
  } finally {
    // Close the database pool so the script exits
    await pool.end();
  }
}

seedCows();
