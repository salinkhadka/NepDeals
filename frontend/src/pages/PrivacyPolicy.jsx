import React from 'react'

const PrivacyPolicy = () => {
    return (
        <div className="page-container section-spacing">
            <div className="card">
                <h1>Privacy Policy</h1>
                <p className="mt-4">Last Updated: January 27, 2026</p>

                <section className="mt-8">
                    <h3>1. Information We Collect</h3>
                    <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact our support team.</p>
                </section>

                <section className="mt-4">
                    <h3>2. How We Use Information</h3>
                    <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>
                </section>

                <section className="mt-4">
                    <h3>3. Data Security</h3>
                    <p>We use industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
                </section>

                <section className="mt-4">
                    <h3>4. Your Rights</h3>
                    <p>You have the right to access, update, or delete your personal information at any time through your account settings.</p>
                </section>
            </div>
        </div>
    )
}

export default PrivacyPolicy
