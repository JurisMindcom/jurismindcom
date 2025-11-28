import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, ArrowLeft, Target, Heart, Lightbulb, Users, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Target,
      title: 'Mission',
      description: 'To democratize access to legal information and make quality legal assistance available to everyone in Bangladesh.',
    },
    {
      icon: Heart,
      title: 'Vision',
      description: 'A world where legal knowledge is accessible, understandable, and empowers individuals to protect their rights.',
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Leveraging cutting-edge AI technology to provide accurate, contextual, and timely legal guidance.',
    },
  ];

  const features = [
    'AI-powered legal research and analysis',
    'Bilingual support (English & বাংলা)',
    'Bangladesh case law database',
    'Legal document drafting and templates',
    'Voice input and text-to-speech',
    'Secure document storage',
    'Multiple personality modes',
    '24/7 availability',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-legal-gold bg-clip-text text-transparent">
              JurisMind
            </span>
          </div>
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-6">
              About <span className="text-primary">JurisMind</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              JurisMind is an advanced AI-powered legal assistant designed specifically 
              for Bangladesh law, offering comprehensive legal support in both English and বাংলা.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 h-full glass-panel text-center">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-6">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Creator */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container mx-auto">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-8">Meet the Creator</h2>
            <div className="glass-panel rounded-2xl p-8 md:p-12">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-bold text-primary-foreground">R</span>
              </div>
              <h3 className="text-2xl font-bold text-primary mb-2">RONY</h3>
              <p className="text-muted-foreground mb-6">Founder & Creator of JurisMind</p>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Passionate about leveraging technology to solve real-world problems, 
                RONY created JurisMind to bridge the gap between legal expertise and 
                everyday people who need accessible legal guidance in Bangladesh.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">What JurisMind Offers</h2>
            <p className="text-muted-foreground">Comprehensive legal assistance at your fingertips</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature}
                className="flex items-center gap-3 p-4 glass-panel rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">User-Centric Design</h3>
              <p className="text-muted-foreground">
                Built with users in mind, ensuring a seamless and intuitive experience
              </p>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Privacy First</h3>
              <p className="text-muted-foreground">
                Your conversations and documents are encrypted and secure
              </p>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Local Expertise</h3>
              <p className="text-muted-foreground">
                Specialized knowledge of Bangladesh laws and legal system
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Experience JurisMind?</h2>
            <p className="text-muted-foreground mb-8">Start your legal journey today</p>
            <Button
              size="lg"
              className="glow-button bg-gradient-to-r from-primary to-primary-glow"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            <span className="font-bold text-primary">JurisMind</span> — Created by RONY
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            AI Legal Assistant — not a substitute for a licensed attorney.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
