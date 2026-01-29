import { Link } from 'react-router-dom'
import './Home.css'

const Home = () => {
  return (
    <div className="home-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="page-container">
          <div className="hero-grid">
            <div className="hero-content">
              <span className="hero-badge">New Collection 2026</span>
              <h1 className="hero-title">
                Authentic Nepali <br />
                <span className="text-highlight">Global Quality</span>
              </h1>
              <p className="hero-description">
                Discover the finest diverse marketplace. From local artisans to international brands, experience shopping redefined.
              </p>
              <div className="hero-actions">
                <Link to="/shop" className="btn btn-primary btn-xl">
                  Shop Now
                </Link>
                <Link to="/register" className="btn btn-outline btn-xl">
                  Join Us
                </Link>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">50k+</span>
                  <span className="stat-label">Products</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Support</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">99%</span>
                  <span className="stat-label">Satisfied</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-circle-bg"></div>
              {/* Abstract visual representation instead of missing image */}
              <div className="hero-card-stack">
                <div className="glass-card card-1">
                  <div className="card-icon">👟</div>
                  <div className="card-text">
                    <span>Latest Drops</span>
                    <small>Explore Now</small>
                  </div>
                </div>
                <div className="glass-card card-2">
                  <div className="card-icon">🎧</div>
                  <div className="card-text">
                    <span>Premium Gear</span>
                    <small>Best Sellers</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Horizontal Blocks */}
      <section className="features-section section-spacing">
        <div className="page-container">
          <div className="section-header text-center">
            <h2 className="section-title">Why Choose NepDeals?</h2>
            <div className="section-line"></div>
          </div>

          <div className="features-horizontal">
            <div className="feature-block">
              <div className="feature-icon-box">🚚</div>
              <div className="feature-info">
                <h3>Nationwide Delivery</h3>
                <p>Fast delivery across all 77 districts</p>
              </div>
            </div>

            <div className="feature-block">
              <div className="feature-icon-box">💳</div>
              <div className="feature-info">
                <h3>Secure Payments</h3>
                <p>eSewa, Khalti, & COD options</p>
              </div>
            </div>

            <div className="feature-block">
              <div className="feature-icon-box">🇳🇵</div>
              <div className="feature-info">
                <h3>Proudly Nepali</h3>
                <p>Supporting local businesses & economy</p>
              </div>
            </div>

            <div className="feature-block">
              <div className="feature-icon-box">💎</div>
              <div className="feature-info">
                <h3>Verified Quality</h3>
                <p>100% Authentic products guaranteed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Category Section */}
      <section className="cta-section section-spacing">
        <div className="page-container">
          <div className="cta-grid">
            <div className="cta-card dark-card">
              <div className="cta-content">
                <h3>Premium Electronics</h3>
                <p>Upgrade your tech game today.</p>
                <Link to="/shop?category=electronics" className="link-arrow">Browse Electronics &rarr;</Link>
              </div>
            </div>
            <div className="cta-card light-card">
              <div className="cta-content">
                <h3>Fashion Trends</h3>
                <p>Style that speaks for itself.</p>
                <Link to="/shop?category=fashion" className="link-arrow">View Collection &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

