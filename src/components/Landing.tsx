import React from 'react';
import { BarChart2, Shield, Zap, LineChart, DollarSign, TrendingUp } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
}

const STRIPE_LINK = 'https://buy.stripe.com/bJe14nausaWnbK4gOca7C02';

const features = [
  { icon: <BarChart2 size={24} />, title: 'Gross-to-Net Waterfall', desc: 'Visual cascade from MSRP to net revenue with every deduction mapped.' },
  { icon: <LineChart size={24} />, title: '5-Channel P&L Engine', desc: "Nat'l Distribution, Club, DSD, Online D2B, and Alt FdSvc — all in one model." },
  { icon: <TrendingUp size={24} />, title: 'Sensitivity Tornado', desc: 'Instantly see which input variable swings your EBITDA the most.' },
  { icon: <DollarSign size={24} />, title: 'Cash Conversion Timeline', desc: 'Visualize when cash goes out and when it comes back. Find the gap.' },
  { icon: <Shield size={24} />, title: 'Capacity Circuit Breakers', desc: 'Set your limits. See exactly where the business structure breaks.' },
  { icon: <Zap size={24} />, title: 'Scenario Compare', desc: 'Save, name, and compare Board Deck vs Conservative vs Upside — side by side.' },
];

export const Landing: React.FC<LandingProps> = ({ onGetStarted }) => (
  <div className="min-h-screen bg-base-100">
    {/* Hero */}
    <div className="hero min-h-[70vh] bg-gradient-to-br from-base-200 to-base-100">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          <img src="/logo.png" alt="Logo" className="h-16 mx-auto mb-6" />
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-primary">TRUE MARGIN</span> CPG
          </h1>
          <p className="py-6 text-xl text-base-content/70 leading-relaxed">
            The structural margin calculator built for CPG founders who refuse to guess.
            Model every channel. Stress-test the chassis. Know your real numbers.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              Subscribe — $299/mo
            </a>
            <button onClick={onGetStarted} className="btn btn-outline btn-lg">
              Access Tool →
            </button>
          </div>
          <p className="text-sm text-base-content/40 mt-4">
            After subscribing, you'll receive your access password via email.
          </p>
        </div>
      </div>
    </div>

    {/* Features */}
    <div className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything a CPG Finance Lead Needs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card bg-base-200 hover:bg-base-300 transition-colors">
              <div className="card-body">
                <div className="text-primary mb-2">{f.icon}</div>
                <h3 className="card-title text-lg">{f.title}</h3>
                <p className="text-base-content/60 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* CTA */}
    <div className="py-16 bg-base-200 text-center">
      <h2 className="text-3xl font-bold mb-4">Stop Guessing. Start Knowing.</h2>
      <p className="text-base-content/60 max-w-xl mx-auto mb-8">
        Built by operators who've run CPG brands through KeHE, UNFI, Costco, and Amazon.
        This is the tool we wish we had.
      </p>
      <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
        Get Started — $299/mo
      </a>
    </div>

    {/* Footer */}
    <footer className="footer footer-center p-6 bg-base-300 text-base-content/50">
      <p>© 2026 Mirepoix Partners / Right Lane Brands, Inc. All Rights Reserved.</p>
    </footer>
  </div>
);
