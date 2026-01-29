import React from 'react'

const Contact = () => {
    return (
        <div className="page-container section-spacing">
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 className="text-center">Contact Us</h1>
                <p className="text-center mt-4 mb-8">Have questions? We're here to help. Reach out to us through any of the following channels.</p>

                <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    <div className="contact-method">
                        <h3>📍 Office Address</h3>
                        <p>New Baneshwor, Kathmandu, Nepal</p>
                    </div>
                    <div className="contact-method">
                        <h3>📞 Phone</h3>
                        <p>+977 1-4XXXXXX</p>
                        <p>+977 98XXXXXXXX</p>
                    </div>
                    <div className="contact-method">
                        <h3>✉️ Email</h3>
                        <p>support@nepdeals.com.np</p>
                        <p>info@nepdeals.com.np</p>
                    </div>
                    <div className="contact-method">
                        <h3>⏰ Working Hours</h3>
                        <p>Sunday - Friday: 9:00 AM - 6:00 PM</p>
                        <p>Saturday: Closed</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Contact
