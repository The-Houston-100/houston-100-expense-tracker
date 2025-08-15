// Houston 100 OTP Email Function - Powered by Resend
export async function handler(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, otp, name } = JSON.parse(event.body);
        
        // Validate Houston 100 email domain
        if (!email || !email.endsWith('@thehouston100group.com')) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Unauthorized email domain' })
            };
        }

        // Send email via Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer re_ihPxoBv2_3r6z1TAfQFAC1GBZMCjZkGh7`
            },
            body: JSON.stringify({
                from: 'Houston 100 Security <security@resend.dev>',
                to: [email],
                subject: '🔐 Houston 100 - Your Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #ffffff 0%, #747474 50%, #4a90e2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #2c3e50;">🏢 Houston 100</h1>
                            <p style="margin: 10px 0 0 0; color: #4a5568;">Investment Group LLC</p>
                        </div>
                        
                        <div style="background: white; padding: 30px; border: 1px solid #e1e8ed;">
                            <h2>Verification Code for Expense Tracker</h2>
                            <p>Hello ${name},</p>
                            <p>You requested access to the Houston 100 Expense Tracker. Please use the verification code below:</p>
                            
                            <div style="background: #f8f9fa; border: 2px solid #4a90e2; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                                <div style="font-size: 2rem; font-weight: bold; color: #4a90e2; letter-spacing: 8px;">${otp}</div>
                                <p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #666;">This code expires in 5 minutes</p>
                            </div>
                            
                            <p><strong>Important:</strong> This code is for Houston 100 members only. If you didn't request this code, please ignore this email.</p>
                            
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <strong>🔒 Security Notice:</strong> Never share this code with anyone. Houston 100 staff will never ask for your verification code.
                            </div>
                            
                            <p>Best regards,<br>
                            <strong>Houston 100 Security Team</strong><br>
                            Houston 100 Group LLC</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 0.9rem; color: #666;">
                            <p>Houston 100 Investment Group LLC<br>
                            Kingdom-focused Financial Stewardship</p>
                        </div>
                    </div>
                `
            })
        });

        if (!response.ok) {
            throw new Error(`Resend API error: ${response.status}`);
        }

        const result = await response.json();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true, 
                message: 'OTP sent successfully',
                id: result.id 
            })
        };

    } catch (error) {
        console.error('OTP send error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: false, 
                error: 'Failed to send OTP email' 
            })
        };
    }
}
