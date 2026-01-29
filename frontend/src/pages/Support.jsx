import React from 'react'

const Support = () => {
    return (
        <div className="page-container section-spacing">
            <div className="card">
                <h1>Customer Support</h1>
                <p className="mt-4">At NepDeals, customer satisfaction is our top priority. We're here to assist you with any issues or queries.</p>

                <div className="mt-8">
                    <h3>Need Immediate Help?</h3>
                    <p>For urgent matters, please call our hotline: <strong>+977 1-4XXXXXX</strong></p>
                </div>

                <div className="mt-4">
                    <h3>Common Support Topics</h3>
                    <ul>
                        <li>Order tracking and status</li>
                        <li>Payment issues</li>
                        <li>Account management</li>
                        <li>Product quality concerns</li>
                    </ul>
                </div>

                <div className="mt-4">
                    <h3>Submit a Ticket</h3>
                    <p>If you have a non-urgent query, please email us at support@nepdeals.com.np. We aim to respond within 24 business hours.</p>
                </div>
            </div>
        </div>
    )
}

export default Support
