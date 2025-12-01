import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Splash = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Short delay for splash animation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (session?.user) {
          // User is logged in - go directly to chat
          navigate('/chat', { replace: true });
        } else {
          // No session - go to home page
          navigate('/home', { replace: true });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/home', { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-legal-dark legal-pattern relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Logo and branding */}
      <motion.div
        className="relative z-10 text-center space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="flex items-center justify-center mb-6"
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            delay: 0.3,
          }}
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-primary-glow glow-button">
            <Scale className="w-16 h-16 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.h1
          className="text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-legal-gold bg-clip-text text-transparent"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          JurisMind
        </motion.h1>

        <motion.p
          className="text-xl text-muted-foreground max-w-md mx-auto px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          Your Premium AI Legal Assistant
        </motion.p>

        <motion.p
          className="text-lg font-semibold text-primary mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          Created by RONY
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          className="flex justify-center gap-2 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-primary rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Legal disclaimer at bottom */}
      <motion.p
        className="absolute bottom-8 text-xs text-muted-foreground text-center px-4 max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        AI Legal Assistant — not a substitute for a licensed attorney. Consult a lawyer for binding legal advice.
      </motion.p>
    </div>
  );
};

export default Splash;
