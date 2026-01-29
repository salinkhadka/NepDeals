import React from 'react'

const FAQ = () => {
    const faqs = [
        {
            q: "How do I place an order?",
            a: "Simply browse our products, add them to your cart, and proceed to checkout. You'll need to create an account or log in to complete your purchase."
        },
        {
            q: "What payment methods do you accept?",
            a: "We accept various payment methods including eSewa, Khalti, and Cash on Delivery for most locations."
        },
        {
            q: "When will I receive my order?",
            a: "Delivery typically takes 1-3 business days within Kathmandu Valley and 3-7 business days for other parts of Nepal."
        },
        {
            q: "How can I track my order?",
            a: "Once your order is shipped, you can track its status in the 'Orders' section of your profile."
        }
    ]

    return (
        <div className="page-container section-spacing">
            <div className="card">
                <h1 className="text-center mb-8">Frequently Asked Questions</h1>
                <div className="faq-list">
                    {faqs.map((faq, index) => (
                        <div key={index} className="faq-item mt-6">
                            <h3 style={{ color: 'var(--primary)' }}>Q: {faq.q}</h3>
                            <p className="mt-2">A: {faq.a}</p>
                            {index < faqs.length - 1 && <hr className="divider" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default FAQ
