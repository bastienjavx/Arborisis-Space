'use client';

import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { motion } from 'framer-motion';
import { pageShell } from '@/lib/motion';

export default function LoginPage() {
  return (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={pageShell}>
      <Suspense fallback={null}>
        <AuthForm mode="login" />
      </Suspense>
    </motion.div>
  );
}
