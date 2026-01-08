import { getDatabase, queryOne } from './database/db.js';
import bcrypt from 'bcryptjs';

async function checkPassword() {
    try {
        await getDatabase();
        const user = queryOne('SELECT * FROM users WHERE email = ?', ['teacher1@school.edu']);
        if (user) {
            const isMatch = await bcrypt.compare('teacher123', user.password);
            console.log('Password match:', isMatch);
            if (!isMatch) {
                console.log('Expected password: teacher123');
                console.log('Stored hash:', user.password);
                console.log('New hash of "teacher123":', await bcrypt.hash('teacher123', 10));
            }
        } else {
            console.log('User teacher1@school.edu not found');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPassword();
