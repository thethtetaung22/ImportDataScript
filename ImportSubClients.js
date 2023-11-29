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