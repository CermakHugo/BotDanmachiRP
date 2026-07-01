import { Sequelize } from 'sequelize';
import 'dotenv/config';

// Option 3: Passing parameters separately (other dialects)
export const sequelize = new Sequelize(
    process.env.DATABASE, 
    process.env.DATABASE_USERNAME, 
    process.env.DATABASE_USERNAME, 
    {
        host: 'localhost',
        dialect: 'mysql'
    });

