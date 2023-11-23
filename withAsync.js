const mysql = require('mysql2/promise'); // Use 'mysql2/promise' for async/await support
const clients = require('./data');
console.log(clients?.length);
// Replace these values with your actual MySQL database connection details
const dbConfig = {
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: 'password',
    database: 'testDb'
};


// Sample data to insert into the database
const dataToInsert = clients.map(client => {
    return {
        name: client?.displayFullName || null,
        type: client?.clientType || null,
        address: `${client?.serviceAddress?.address1}, ${client?.serviceAddress?.address2}, ${client?.serviceAddress?.pinCode}, ${client?.serviceAddress?.country}` || null,
        billing_address: `${client?.billingAddress?.address1}, ${client?.billingAddress?.address2}, ${client?.billingAddress?.pinCode}, ${client?.billingAddress?.country}` || null,
        postal_code: client?.serviceAddress?.pinCode || null,
        parent_id: null,
        created_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
        updated_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' ')
    }
});

async function importData() {
    // Create a connection pool
    const pool = mysql.createPool(dbConfig);

    try {
        const connection = await pool.getConnection();

        // Use a transaction for better consistency
        await connection.beginTransaction();

        try {
            // Insert data into the database
            for (const record of dataToInsert) {
                const client = await connection.query('INSERT INTO clients SET ?', record);
                // console.log('Client:', client);
                const clientId = client[0]?.insertId;
                console.log('ClientID:', clientId);
                if (clientId) {
                    if (client?.serviceAddress) {
                        const address = {
                            name: client?.serviceAddress?.name,
                            phone: null,
                            postal_code: client?.serviceAddress?.pinCode,
                            address: `${client?.serviceAddress?.address1}, ${client?.serviceAddress?.address2}, ${client?.serviceAddress?.pinCode}, ${client?.serviceAddress?.country}`,
                            client_id: clientId,
                            created_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                            updated_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' ')
                        };
                        await connection.query('INSERT INTO addresses SET ?', address);
                    }

                    if (client?.primaryContact) {
                        const insertContactSql = 'INSERT INTO contacts (name, phone, email, is_primary, created_at, updated_at, client_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
                        const contact = {
                            name: client?.primaryContact?.name,
                            phone: client?.primaryContact?.phones[0]?.number,
                            email: null,
                            is_primary: 1,
                            created_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                            updated_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                            client_id: clientId
                        };
                        await connection.query('INSERT INTO contacts SET ?', contact);
                    }
                }
            }

            // Commit the transaction
            await connection.commit();
            console.log('Data successfully imported.');
        } catch (error) {
            // Rollback the transaction if an error occurs
            await connection.rollback();
            throw error;
        } finally {
            // Release the connection back to the pool
            connection.release();
        }
    } catch (error) {
        console.error('Error connecting to the database:', error);
    } finally {
        // Close the connection pool
        await pool.end();
    }
}

// Call the function to import data
importData();