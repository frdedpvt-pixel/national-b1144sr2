import { getDatabase, query } from './database/db.js';

async function checkUsers() {
    try {
        await getDatabase();
        const users = query('SELECT * FROM users');
        console.log('Users found:', users.length);
        if (users.length > 0) {
            console.log('Sample user:', users[0]);
        } else {
            console.log('No users found in database.');
        }
    } catch (error) {
        console.error('Error checking users:', error);
    }
}

checkUsers();
