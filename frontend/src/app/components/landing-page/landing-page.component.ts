import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="landing-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              Invest in Real Estate
              <span class="gradient-text">Like Never Before</span>
            </h1>
            <p class="hero-subtitle">
              Own fractional shares of premium real estate properties through blockchain technology. 
              Start building your diversified portfolio with as little as $100.
            </p>
            <div class="hero-actions">
              <button mat-raised-button 
                      class="cta-button primary"
                      routerLink="/properties">
              
                Start Investing
              </button>
              <button mat-stroked-button 
                      class="cta-button secondary"
                      routerLink="/portfolio">
  
                View Portfolio
              </button>
            </div>
            <div class="hero-stats">
              <div class="stat-item">
                <div class="stat-number">$2.4M+</div>
                <div class="stat-label">Total Investment</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">150+</div>
                <div class="stat-label">Properties</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">8.2%</div>
                <div class="stat-label">Avg. Annual Return</div>
              </div>
            </div>
          </div>
          <div class="hero-visual">
            <div class="property-cards-showcase">
              <div class="showcase-card card-1">
                <div class="card-image"></div>
                <div class="card-content">
                  <div class="card-title">Luxury Downtown Condo</div>
                  <div class="card-price">$250K • 12.5% APY</div>
                </div>
              </div>
              <div class="showcase-card card-2">
                <div class="card-image"></div>
                <div class="card-content">
                  <div class="card-title">Commercial Office Space</div>
                  <div class="card-price">$500K • 10.8% APY</div>
                </div>
              </div>
              <div class="showcase-card card-3">
                <div class="card-image"></div>
                <div class="card-content">
                  <div class="card-title">Suburban Family Home</div>
                  <div class="card-price">$180K • 9.2% APY</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="features-container">
          <div class="section-header">
            <h2>Why Choose FracEstate?</h2>
            <p>Revolutionary blockchain-powered real estate investment platform</p>
          </div>
          
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>security</mat-icon>
              </div>
              <h3>Secure & Transparent</h3>
              <p>All transactions are secured on the blockchain with full transparency and immutable records.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
              <h3>Low Minimum Investment</h3>
              <p>Start investing in premium real estate with as little as $100. No need for large capital.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>trending_up</mat-icon>
              </div>
              <h3>High Yield Returns</h3>
              <p>Earn competitive returns through rental income and property appreciation, paid monthly.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>diversity_3</mat-icon>
              </div>
              <h3>Instant Diversification</h3>
              <p>Build a diversified real estate portfolio across different property types and locations.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>swap_horiz</mat-icon>
              </div>
              <h3>Liquid Investments</h3>
              <p>Trade your fractional ownership tokens anytime without traditional real estate constraints.</p>
            </div>

            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>analytics</mat-icon>
              </div>
              <h3>Advanced Analytics</h3>
              <p>Track your portfolio performance with comprehensive analytics and reporting tools.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="how-it-works-section">
        <div class="how-it-works-container">
          <div class="section-header">
            <h2>How It Works</h2>
            <p>Start investing in real estate in just a few simple steps</p>
          </div>
          
          <div class="steps-container">
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>Browse Properties</h3>
                <p>Explore our curated selection of premium real estate properties with detailed information and projections.</p>
                <button mat-stroked-button routerLink="/properties" class="step-action">
                  View Properties
                </button>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>Complete KYC</h3>
                <p>Quick and secure identity verification to comply with regulations and unlock higher investment limits.</p>
                <button mat-stroked-button routerLink="/kyc" class="step-action">
                  Start KYC
                </button>
              </div>
            </div>

            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>Invest & Earn</h3>
                <p>Purchase fractional shares using USDC and start earning monthly yields from rental income.</p>
                <button mat-stroked-button routerLink="/portfolio" class="step-action">
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="cta-container">
          <h2>Ready to Start Building Your Real Estate Portfolio?</h2>
          <p>Join thousands of investors already earning passive income through fractional real estate ownership.</p>
          <div class="cta-actions">
            <button mat-raised-button 
                    class="cta-button primary large"
                    routerLink="/properties">
              Start Investing Today
            </button>
            <button mat-stroked-button 
                    class="cta-button secondary large"
                    routerLink="/dashboard">
              <mat-icon>info</mat-icon>
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['./landing-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent implements OnInit {

  constructor() { 
    console.log('✅ LandingPageComponent constructor called');
  }

  ngOnInit(): void {
    // Component initialization
    console.log('✅ LandingPageComponent ngOnInit called');
  }
}