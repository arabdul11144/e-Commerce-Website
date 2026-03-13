import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Landmark,
  Image as ImageIcon,
  Mail,
  Phone,
  MapPin,
  User,
  Lock,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSellerAuth } from '../contexts/SellerAuthContext';
import { getErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface SellerAuthFormState {
  businessName: string;
  activeBankAccount: string;
  profileImage: string;
  profileImageName: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
  password: string;
}

export function SellerAuth({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState<SellerAuthFormState>({
    businessName: '',
    activeBankAccount: '',
    profileImage: '',
    profileImageName: '',
    validEmail: '',
    mobileNumber: '',
    pickupAddress: '',
    username: '',
    password: '',
  });

  const { login, register } = useSellerAuth();

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode, location.pathname]);

  const updateField =
    (field: keyof SellerAuthFormState) => (event: ChangeEvent<HTMLInputElement>) => {
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
    }));
  };

  const handleProfileImageSelect = () => {
    profileImageInputRef.current?.click();
  };

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        event.target.value = '';
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        profileImage: reader.result as string,
        profileImageName: file.name,
      }));
      event.target.value = '';
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formState.username.trim(), formState.password);
        toast.success('Seller logged in successfully');
      } else {
        await register({
          businessName: formState.businessName.trim(),
          activeBankAccount: formState.activeBankAccount.trim(),
          profileImage: formState.profileImage || undefined,
          validEmail: formState.validEmail.trim(),
          mobileNumber: formState.mobileNumber.trim(),
          pickupAddress: formState.pickupAddress.trim(),
          username: formState.username.trim(),
          password: formState.password,
        });
        toast.success('Seller account created successfully');
      }

      navigate('/admin');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-surface border border-subtle/30 rounded-2xl p-8 shadow-2xl shadow-black/50"
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent-gold flex items-center justify-center text-background">
            <Store className="w-7 h-7" />
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <Link to="/auth">
            <Button variant="outline" size="sm">
              Continue as Customer
            </Button>
          </Link>
          <Button size="sm">Continue as Seller</Button>
        </div>

        <h2 className="text-2xl font-bold text-center text-primary mb-2">
          {isLogin ? 'Seller Login' : 'Create seller account'}
        </h2>

        <p className="text-center text-body mb-8">
          {isLogin
            ? 'Enter your details to access your account.'
            : 'Register your seller account to manage products and orders.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                <Input
                  label="Business Name"
                  placeholder="TechVault Sellers"
                  leftIcon={<Building2 className="w-4 h-4" />}
                  value={formState.businessName}
                  onChange={updateField('businessName')}
                  required={!isLogin}
                />

                <Input
                  label="Active Bank Account"
                  placeholder="Commercial Bank - 1234567890"
                  leftIcon={<Landmark className="w-4 h-4" />}
                  value={formState.activeBankAccount}
                  onChange={updateField('activeBankAccount')}
                  required={!isLogin}
                />

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-primary block mb-1.5">
                    Profile Image
                  </label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      leftIcon={<ImageIcon className="w-4 h-4" />}
                      onClick={handleProfileImageSelect}
                    >
                      Upload Profile Image
                    </Button>
                    <span className="text-sm text-muted self-center truncate">
                      {formState.profileImageName || 'No image selected'}
                    </span>
                  </div>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </div>

                <Input
                  label="Valid Email"
                  type="email"
                  placeholder="seller@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={formState.validEmail}
                  onChange={updateField('validEmail')}
                  required={!isLogin}
                />

                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="+94771234567"
                  leftIcon={<Phone className="w-4 h-4" />}
                  value={formState.mobileNumber}
                  onChange={updateField('mobileNumber')}
                  required={!isLogin}
                />

                <Input
                  label="Pickup Address"
                  placeholder="123 Main Street, Colombo"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  value={formState.pickupAddress}
                  onChange={updateField('pickupAddress')}
                  className="md:col-span-2"
                  required={!isLogin}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Input
            label="Username"
            placeholder="sellerusername"
            leftIcon={<User className="w-4 h-4" />}
            value={formState.username}
            onChange={updateField('username')}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            leftIcon={<Lock className="w-4 h-4" />}
            value={formState.password}
            onChange={updateField('password')}
            required
          />

          <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
            {isLogin ? 'Seller sign in' : 'Create Seller Account'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-body">
            {isLogin ? "Don't have a seller account? " : 'Already have a seller account? '}
            <button
              onClick={handleModeToggle}
              className="text-accent-gold hover:text-accent-goldHover font-medium transition-colors"
            >
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
