import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { MessageSquare, ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';

export default function RegisterPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const { toast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
      });
      setUser(data.data);
      toast({ variant: 'success', title: 'Account created!' });
      const role = data.data.role;
      if (role === 'admin') {
        navigate({ to: '/admin/dashboard' });
      } else if (role === 'agent') {
        navigate({ to: '/agent/dashboard' });
      } else {
        navigate({ to: '/customer/chat' });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: 'Could not create account.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 animate-pulse rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 animate-pulse rounded-full bg-blue-500/20 blur-3xl [animation-delay:1s]" />
        <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-indigo-500/10 blur-3xl [animation-delay:2s]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <Card className="relative w-full max-w-md border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          {/* Logo */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25">
            <MessageSquare className="h-7 w-7 text-white" />
          </div>

          <div>
            <CardTitle className="text-2xl font-bold text-white">Create an account</CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              Enter your details to get started
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-300">
                Name
              </Label>
              <div className="relative">
                <User
                  className={cn(
                    'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                    focusedField === 'name' ? 'text-purple-400' : 'text-slate-500'
                  )}
                />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={cn(
                    'h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'name'
                      ? 'border-purple-500/50 ring-2 ring-purple-500/20'
                      : 'hover:border-white/20'
                  )}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail
                  className={cn(
                    'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                    focusedField === 'email' ? 'text-purple-400' : 'text-slate-500'
                  )}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={cn(
                    'h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'email'
                      ? 'border-purple-500/50 ring-2 ring-purple-500/20'
                      : 'hover:border-white/20'
                  )}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock
                  className={cn(
                    'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                    focusedField === 'password' ? 'text-purple-400' : 'text-slate-500'
                  )}
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={cn(
                    'h-12 border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'password'
                      ? 'border-purple-500/50 ring-2 ring-purple-500/20'
                      : 'hover:border-white/20'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock
                  className={cn(
                    'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                    focusedField === 'confirmPassword' ? 'text-purple-400' : 'text-slate-500'
                  )}
                />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={cn(
                    'h-12 border-white/10 bg-white/5 pl-10 pr-10 text-white placeholder:text-slate-500',
                    'transition-all duration-200',
                    focusedField === 'confirmPassword'
                      ? 'border-purple-500/50 ring-2 ring-purple-500/20'
                      : 'hover:border-white/20',
                    confirmPassword && password !== confirmPassword && 'border-red-500/50'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="group relative h-12 w-full overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 font-medium text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Create account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Login Link */}
          <div className="text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link
              to="/login"
              className="font-medium text-purple-400 transition-colors hover:text-purple-300"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
