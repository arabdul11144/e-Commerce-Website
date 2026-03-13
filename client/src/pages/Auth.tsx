import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Mail, Lock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface AuthFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState<AuthFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+94',
    password: '',
  });

  const navigate = useNavigate();
  const { login, register } = useAuth();

  const updateField =
    (field: keyof AuthFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setFormState((currentState) => ({
        ...currentState,
        [field]: event.target.value,
      }));
    };

  const handleModeToggle = () => {
    setIsLogin((currentMode) => !currentMode);
    setFormState((currentState) => ({
      ...currentState,
      password: '',
      phone: currentState.phone || '+94',
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formState.email, formState.password);
        toast.success('Logged in successfully');
      } else {
        await register({
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          password: formState.password,
        });
        toast.success('Account created successfully');
      }

      navigate('/');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="w-full max-w-md bg-surface border border-subtle/30 rounded-2xl p-8 shadow-2xl shadow-black/50"
      >
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-gold flex items-center justify-center text-background">
            <Laptop className="w-7 h-7" />
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <Button size="sm">Continue as Customer</Button>
          <Link to="/seller/auth">
            <Button variant="outline" size="sm">
              Continue as Seller
            </Button>
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-center text-primary mb-2">
          {isLogin ? 'Customer Login' : 'Create an account'}
        </h2>

        <p className="text-center text-body mb-8">
          {isLogin
            ? 'Enter your details to access your account.'
            : 'Join TechVault for a premium experience.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  height: 'auto',
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                }}
                className="space-y-5"
              >
                <Input
                  label="First Name"
                  placeholder="First Name"
                  leftIcon={<User className="w-4 h-4" />}
                  value={formState.firstName}
                  onChange={updateField('firstName')}
                  required={!isLogin}
                />

                <Input
                  label="Last Name"
                  placeholder="Last Name"
                  leftIcon={<User className="w-4 h-4" />}
                  value={formState.lastName}
                  onChange={updateField('lastName')}
                  required={!isLogin}
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+94771234567"
                  leftIcon={<Phone className="w-4 h-4" />}
                  value={formState.phone}
                  onChange={updateField('phone')}
                  required={!isLogin}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            value={formState.email}
            onChange={updateField('email')}
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              value={formState.password}
              onChange={updateField('password')}
              required
            />

            {isLogin && (
              <div className="flex justify-end mt-2">
                <a
                  href="#"
                  className="text-xs text-accent-blue hover:text-accent-blueHover transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-body">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={handleModeToggle}
              className="text-accent-gold hover:text-accent-goldHover font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          <p className="text-sm text-body mt-3">
            Seller account?{' '}
            <Link
              to="/seller/auth"
              className="text-accent-gold hover:text-accent-goldHover font-medium transition-colors"
            >
              Continue as Seller
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
