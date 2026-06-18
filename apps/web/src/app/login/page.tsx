'use client';

import { AuthForm } from '@/components/AuthForm';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AuthForm mode="login" />
    </motion.div>
  );
}
