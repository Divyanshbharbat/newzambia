const axios = require('axios');

async function test() {
    try {
        // First set the session to 2027-2028
        console.log('Setting session to 2027-2028...');
        await axios.get('http://localhost:5000/setSession?year=2027-2028');
        
        console.log('Fetching student performance...');
        const resp = await axios.get('http://localhost:5000/api/dashboard/student-performance');
        console.log('Performance Data:', resp.data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
