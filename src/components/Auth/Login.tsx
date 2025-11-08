import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

const authSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

type AuthForm = z.infer<typeof authSchema>;

export const Login: React.FC = () => {
  const { login, register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
  });

  const onSubmit = async (data: AuthForm) => {
    setError('');
    if (isRegister) {
      if (!data.name) {
        setError('Name is required');
        return;
      }
      const success = await registerUser(data.email, data.password, data.name);
      if (!success) {
        setError('Email already exists');
      }
    } else {
      const success = await login(data.email, data.password);
      if (!success) {
        setError('Invalid credentials');
      }
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Personal Finance Dashboard</CardTitle>
            <CardDescription>
              {isRegister ? 'Create your account' : 'Sign in to your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>
              {isRegister && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    {...register('name')}
                    placeholder="Enter your name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">{errors.name.message}</p>
                  )}
                </div>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (isRegister ? 'Registering...' : 'Signing in...') : (isRegister ? 'Register' : 'Sign In')}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-blue-600 hover:underline"
                >
                  {isRegister ? 'Sign In' : 'Register'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};