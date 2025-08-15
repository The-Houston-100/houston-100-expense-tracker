export async function handler(event, context) {
    console.log('Function called:', event.httpMethod);
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, otp, name } = JSON.parse(event.body);
        console.log('Sending OTP to:', email);
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer re_ihPxoBv2_3r6z1TAfQFAC1GBZMCjZkGh7'
            },
            body: JSON.stringify({
                from: 'Houston 100 <onboarding@resend.dev>',
                to: [email],
                subject: '🔐 Houston 100 - Your Verification Code',
                html: `<h2>Houston 100 Verification</h2><p>Your code: <strong>${otp}</strong></p>`
            })
        });

        const result = await response.json();
        console.log('Resend response:', result);

        if (!response.ok) {
            throw new Error(`Resend error: ${JSON.stringify(result)}`);
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true, id: result.id })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
}
