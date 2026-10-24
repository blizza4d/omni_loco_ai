'use client';
import { ModuleError } from '@/components/ui/ModuleError';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleError error={error} reset={reset} moduleName="KINEMATIC POSE" />;
}
