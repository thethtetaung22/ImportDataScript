const mysql = require('mysql2/promise'); // Use 'mysql2/promise' for async/await support
const clients = require('./data');
console.log(clients?.length);
// Replace these values with your actual MySQL database connection details
const dbConfig = {
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: 'password',
    database: 'testdb'
};


// Sample data to insert into the database
const dataToInsert = clients.map(client => {
    return {
        ...client,
        subClients: client?.locations?.map(location => {
            return {
                name: location?.locationName || null,
                type: client?.clientType || null,
                address: `${location?.serviceAddress?.address1}, ${location?.serviceAddress?.address2}, ${location?.serviceAddress?.pinCode}, ${location?.serviceAddress?.country}` || null,
                billing_address: `${location?.billingAddress?.address1}, ${location?.billingAddress?.address2}, ${location?.billingAddress?.pinCode}, ${location?.billingAddress?.country}` || null,
                postal_code: location?.serviceAddress?.pinCode || null,
                parent_id: null,
                created_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                updated_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' ')
            }
        }),
        clientRecord: {
            name: client?.displayFullName || null,
            type: client?.clientType || null,
            address: `${client?.serviceAddress?.address1}, ${client?.serviceAddress?.address2}, ${client?.serviceAddress?.pinCode}, ${client?.serviceAddress?.country}` || null,
            billing_address: `${client?.billingAddress?.address1}, ${client?.billingAddress?.address2}, ${client?.billingAddress?.pinCode}, ${client?.billingAddress?.country}` || null,
            postal_code: client?.serviceAddress?.pinCode || null,
            parent_id: null,
            created_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
            updated_at: new Date(client?.createdTime).toISOString().slice(0, 19).replace('T', ' ')
        }
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
                const client = await connection.query('INSERT INTO clients SET ?', record?.clientRecord);
                // console.log('Client:', client);
                const clientId = client[0]?.insertId;
                console.log('ClientID:', clientId);
                if (clientId) {
                    if (record?.subClients?.length > 0) {
                        for (const subRecord of record.subClients) {
                            const subClient = await connection.query('INSERT INTO clients SET ?', { ...subRecord, parent_id: clientId });
                        }
                    }
                    if (record?.serviceAddress?.name) {
                        const address = {
                            name: record?.serviceAddress?.name,
                            phone: null,
                            postal_code: record?.serviceAddress?.pinCode,
                            address: `${record?.serviceAddress?.address1}, ${record?.serviceAddress?.address2}, ${record?.serviceAddress?.pinCode}, ${record?.serviceAddress?.country}`,
                            client_id: clientId,
                            created_at: new Date(record?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                            updated_at: new Date(record?.createdTime).toISOString().slice(0, 19).replace('T', ' ')
                        };
                        const addressRes = await connection.query('INSERT INTO addresses SET ?', address);
                        console.log('address:', addressRes)
                    }

                    if (record?.primaryContact?.name) {
                        const contact = {
                            name: record?.primaryContact?.name || 'N/A',
                            phone: record?.primaryContact?.phones[0]?.number || 'N/A',
                            email: null,
                            is_primary: 1,
                            created_at: new Date(record?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                            updated_at: new Date(record?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                            client_id: clientId
                        };
                        const contactRes = await connection.query('INSERT INTO contacts SET ?', contact);
                        console.log('Contact:', contactRes)
                    }
                    if (record?.secondaryContacts?.length > 0) {
                        for (const secondary of record?.secondaryContacts) {
                            const secondaryObj = {
                                name: secondary?.name || 'N/A',
                                phone: secondary?.phones[0]?.number || 'N/A',
                                email: null,
                                is_primary: 0,
                                created_at: new Date(record?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                                updated_at: new Date(record?.createdTime).toISOString().slice(0, 19).replace('T', ' '),
                                client_id: clientId
                            };
                            const secondaryContactRes = await connection.query('INSERT INTO contacts SET ?', secondaryObj);
                            console.log('Contact:', secondaryContactRes)
                        }
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