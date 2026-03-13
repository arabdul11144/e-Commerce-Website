import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Image as ImageIcon, Lock, Save, Store, User } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useSellerAuth } from '../../contexts/SellerAuthContext';
import { getErrorMessage, resolveApiUrl } from '../../lib/api';
import {
  changeSellerPassword,
  fetchSellerProfile,
  updateSellerProfile,
  updateSellerProfileImage,
} from '../../lib/seller';

interface SellerProfileFormState {
  businessName: string;
  activeBankAccount: string;
  validEmail: string;
  mobileNumber: string;
  pickupAddress: string;
  username: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
}

export function SellerAccountPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { seller, token, syncSeller } = useSellerAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState<SellerProfileFormState>({
    businessName: '',
    activeBankAccount: '',
    validEmail: '',
    mobileNumber: '',
    pickupAddress: '',
    username: '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
  });

  const profileImage = useMemo(
    () => resolveApiUrl(seller?.profileImage || ''),
    [seller?.profileImage]
  );

  useEffect(() => {
    setProfileForm({
      businessName: seller?.businessName || '',
      activeBankAccount: seller?.activeBankAccount || '',
      validEmail: seller?.validEmail || '',
      mobileNumber: seller?.mobileNumber || '',
      pickupAddress: seller?.pickupAddress || '',
      username: seller?.username || '',
    });
  }, [
    seller?.activeBankAccount,
    seller?.businessName,
    seller?.mobileNumber,
    seller?.pickupAddress,
    seller?.username,
    seller?.validEmail,
  ]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    fetchSellerProfile(token)
      .then((profile) => {
        if (!isCancelled) {
          syncSeller(profile);
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [syncSeller, token]);

  const updateProfileField =
    (field: keyof SellerProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setProfileForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const updatePasswordField =
    (field: keyof PasswordFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleProfileSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error('Seller session not found');
      return;
    }

    setIsSaving(true);

    try {
      const updatedSeller = await updateSellerProfile(token, profileForm);
      syncSeller(updatedSeller);
      toast.success('Seller profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !token) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      if (typeof reader.result !== 'string') {
        event.target.value = '';
        return;
      }

      try {
        setIsUploadingImage(true);
        const updatedSeller = await updateSellerProfileImage(token, {
          image: reader.result,
        });
        syncSeller(updatedSeller);
        toast.success('Seller profile image updated');
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsUploadingImage(false);
        event.target.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handlePasswordSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error('Seller session not found');
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeSellerPassword(token, passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast.success('Seller password updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Seller Account</h1>
        <p className="text-body text-sm mt-1">
          Manage your seller profile and login credentials.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="relative">
            <button
              type="button"
              onClick={handleProfileImageClick}
              disabled={isUploadingImage}
              className="w-24 h-24 rounded-full bg-accent-gold/10 border border-subtle/30 overflow-hidden flex items-center justify-center text-accent-gold disabled:opacity-60"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={seller?.businessName || 'Seller'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-10 h-10" />
              )}
            </button>
            <button
              type="button"
              onClick={handleProfileImageClick}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-accent-blue text-background"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfileImageChange}
            />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-primary">{seller?.businessName || 'Seller'}</h2>
            <p className="text-sm text-muted mt-1">{seller?.validEmail || ''}</p>
            <p className="text-sm text-body mt-3">
              Update your business details, pickup address, and login credentials from this page.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <form onSubmit={handleProfileSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Business Name"
              value={profileForm.businessName}
              onChange={updateProfileField('businessName')}
              leftIcon={<Store className="w-4 h-4" />}
              required
            />
            <Input
              label="Active Bank Account"
              value={profileForm.activeBankAccount}
              onChange={updateProfileField('activeBankAccount')}
              leftIcon={<ImageIcon className="w-4 h-4" />}
              required
            />
            <Input
              label="Valid Email"
              type="email"
              value={profileForm.validEmail}
              onChange={updateProfileField('validEmail')}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Mobile Number"
              value={profileForm.mobileNumber}
              onChange={updateProfileField('mobileNumber')}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Pickup Address"
              value={profileForm.pickupAddress}
              onChange={updateProfileField('pickupAddress')}
              className="md:col-span-2"
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Username"
              value={profileForm.username}
              onChange={updateProfileField('username')}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
          </div>

          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Seller Details
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <form onSubmit={handlePasswordSave} className="space-y-5 max-w-xl">
          <h2 className="text-xl font-bold text-primary">Change Password</h2>
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={updatePasswordField('currentPassword')}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={updatePasswordField('newPassword')}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
          <Button
            type="submit"
            variant="outline"
            isLoading={isChangingPassword}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
