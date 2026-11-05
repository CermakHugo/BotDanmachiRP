import { Sequelize } from 'sequelize';
import 'dotenv/config';

export const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DATABASE_USERNAME, 
    process.env.DATABASE_PASSWORD, 
    {
        host: `${process.env.DATABASE}`,
        dialect: 'mysql',
        logging: (...msg) => console.log(msg),
    });

