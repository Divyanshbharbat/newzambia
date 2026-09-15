const axios = require('axios');

async function test() {
    try {
        console.log("Testing GET /api/marks/:studentId with examinationType...");
        // Assuming student 101 exists and has marks for 'Final Semester'
        // We'll just test if the endpoint accepts the parameter and returns a valid response.
        
        // Test with Annual (default)
        const resDefault = await axios.get('http://localhost:5000/api/marks/1');
        console.log("Default (Annual) count:", resDefault.data.length);
        
        // Test with Final Semester
        const resFinal = await axios.get('http://localhost:5000/api/marks/1?examinationType=Final Semester');
        console.log("Final Semester count:", resFinal.data.length);
        
        console.log("Verification successful (API responded).");
    } catch (error) {
        console.error("Verification failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

test();
