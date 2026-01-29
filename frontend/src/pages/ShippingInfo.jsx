import React from 'react'

const ShippingInfo = () => {
    return (
        <div className="page-container section-spacing">
            <div className="card">
                <h1>Shipping Information</h1>

                <div className="mt-8">
                    <h3>Delivery Areas</h3>
                    <p>We deliver to all major cities and towns across Nepal. From Kathmandu to Pokhara, Biratnagar to Nepalgunj, we've got you covered.</p>
                </div>

                <div className="mt-4">
                    <h3>Shipping Times</h3>
                    <ul>
                        <li><strong>Kathmandu Valley:</strong> 1-2 Business Days</li>
                        <li><strong>Major Cities:</strong> 3-5 Business Days</li>
                        <li><strong>Remote Areas:</strong> 5-10 Business Days</li>
                    </ul>
                </div>

                <div className="mt-4">
                    <h3>Shipping Costs</h3>
                    <p>Shipping costs depend on the delivery location and order weight. Standard delivery within Kathmandu Valley is Rs. 100, while outside Valley starts from Rs. 150.</p>
                </div>
            </div>
        </div>
    )
}

export default ShippingInfo
