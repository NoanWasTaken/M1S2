import mongoose from 'mongoose';

export async function connectToDatabase(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1); // DB unreachable: exit
  }
}