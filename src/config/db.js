import mongoose from 'mongoose';
import { DB_NAME } from '../constant.js';


const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
    );
    console.log(
      `Connected to MongoDB\nHost name: ${connectionInstance.connection.host}`,
    );
  } catch (error) {
    console.log('Unable to connect to MongoDB: ', error);
    process.exit(1);
  }
};

export default connectDB