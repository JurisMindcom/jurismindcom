import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, MessageSquare, FileText, Gavel, BookMarked, ArrowRight, Shield, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: 'AI Legal Chat',
      description: 'Get instant answers to your legal questions in English or বাংলা',
    },
    {
      icon: FileText,
      title: 'Document Analysis',
      description: 'Upload contracts, FIRs, or legal documents for AI analysis',
    },
    {
      icon: Gavel,
      title: 'Case Law Search',
      description: 'Search Bangladesh case laws with citations and summaries',
    },
    {
      icon: BookMarked,
      title: 'Legal Templates',
      description: 'Auto-generate legal documents, notices, and agreements',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Legal Queries Answered' },
    { value: '500+', label: 'Case Laws Indexed' },
    { value: '50+', label: 'Document Templates' },
    { value: '99%', label: 'User Satisfaction' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-legal-gold bg-clip-text text-transparent">
              JurisMind
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Button variant="ghost" onClick={() => navigate('/about')}>About</Button>
            <Button variant="ghost" onClick={() => navigate('/contact')}>Contact</Button>
            <Button variant="ghost" onClick={() => navigate('/templates')}>Templates</Button>
            <Button className="glow-button bg-gradient-to-r from-primary to-primary-glow" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>

          <Button className="md:hidden" size="sm" onClick={() => navigate('/auth')}>
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Legal Assistant</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-primary-glow to-legal-gold bg-clip-text text-transparent">
                JurisMind
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Your premium AI legal assistant for Bangladesh law. Get instant answers, 
              analyze documents, and search case laws in English or বাংলা.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                className="glow-button bg-gradient-to-r from-primary to-primary-glow text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Ask JurisMind
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate('/about')}
              >
                Learn More
              </Button>
            </div>

            <p className="text-lg font-semibold text-primary">Created by RONY</p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <p className="text-4xl font-bold text-primary">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Powerful Legal Features</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need for legal research, document analysis, and case law search
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 h-full glass-panel hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">Your data is encrypted and never shared with third parties</p>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Bilingual Support</h3>
              <p className="text-muted-foreground">Fluent in both English and বাংলা for your convenience</p>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Instant Responses</h3>
              <p className="text-muted-foreground">Get answers in seconds with our powerful AI engine</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center glass-panel rounded-2xl p-12 border border-primary/20"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of users who trust JurisMind for their legal questions.
            </p>
            <Button
              size="lg"
              className="glow-button bg-gradient-to-r from-primary to-primary-glow text-lg px-12 py-6"
              onClick={() => navigate('/auth')}
            >
              Start Free Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-primary" />
              <span className="font-bold">JurisMind</span>
              <span className="text-muted-foreground">— Created by RONY</span>
            </div>
            <div className="flex items-center gap-6">
              <Button variant="link" onClick={() => navigate('/about')}>About</Button>
              <Button variant="link" onClick={() => navigate('/contact')}>Contact</Button>
              <Button variant="link" onClick={() => navigate('/templates')}>Templates</Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            AI Legal Assistant — not a substitute for a licensed attorney. Consult a lawyer for binding legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
