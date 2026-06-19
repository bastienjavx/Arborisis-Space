'use client';

import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Suspense fallback={null}>
        <AuthForm mode="register" />
      </Suspense>
    </motion.div>
  );
}
