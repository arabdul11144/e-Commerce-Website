import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, MapPin, LogOut, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, getErrorMessage } from '../lib/api';
import { formatCurrency } from '../utils/product';

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

interface UpdatedProfileResponse {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  avatar?: string;
}

const AUTH_STORAGE_KEY = 'techvault.auth';

export function Account() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const photoMenuRef = useRef<HTMLDivElement | null>(null);

  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const authUser = (user as (typeof user & { avatar?: string }) | null);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
  ];

  const mockOrders = [
    { id: '#LPL-2026-0847', date: 'Mar 10, 2026', total: 3598, status: 'processing', items: 2 },
    { id: '#LPL-2025-1122', date: 'Nov 22, 2025', total: 199, status: 'delivered', items: 1 },
    { id: '#LPL-2025-0615', date: 'Jun 15, 2025', total: 2499, status: 'delivered', items: 1 },
  ];

  const profileData = useMemo(() => ({
    fullName: user?.name ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    avatar: authUser?.avatar ?? '',
  }), [user, authUser]);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    setProfileForm({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      password: '',
    });
  }, [profileData]);

  useEffect(() => {
    setProfileImage(profileData.avatar || '');
  }, [profileData.avatar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(event.target as Node)) {
        setIsPhotoMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const syncStoredSession = (updatedUser: UpdatedProfileResponse) => {
    const storedSessionRaw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedSessionRaw) {
      return;
    }

    try {
      const storedSession = JSON.parse(storedSessionRaw) as Record<string, unknown>;

      const nextSession = {
        ...storedSession,
        id: updatedUser.id,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar: updatedUser.avatar || '',
      };

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const updateProfileField =
    (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setProfileForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const openEditModal = () => {
    setProfileForm({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (!isSavingProfile) {
      setIsEditModalOpen(false);
    }
  };

  const handleProfileIconClick = () => {
    setIsPhotoMenuOpen((current) => !current);
  };

  const handleRemoveProfilePhoto = async () => {
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    try {
      setIsUploadingPhoto(true);

      const updatedUser = await apiRequest<UpdatedProfileResponse>('/api/auth/profile/avatar', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          removeAvatar: true,
        }),
      });

      setProfileImage('');
      syncStoredSession(updatedUser);
      setIsPhotoMenuOpen(false);
      toast.success('Profile picture removed');
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
    setIsPhotoMenuOpen(false);
  };

  const handleBrowsePhoto = () => {
    fileInputRef.current?.click();
    setIsPhotoMenuOpen(false);
  };

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!token) {
      toast.error('Please sign in again.');
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        event.target.value = '';
        return;
      }

      try {
        setIsUploadingPhoto(true);

        const updatedUser = await apiRequest<UpdatedProfileResponse>('/api/auth/profile/avatar', {
          method: 'PUT',
          token,
          body: JSON.stringify({
            avatar: result,
          }),
        });

        setProfileImage(updatedUser.avatar || result);
        syncStoredSession(updatedUser);
        toast.success('Profile picture updated successfully');
        window.location.reload();
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsUploadingPhoto(false);
        event.target.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error('Please sign in again.');
      return;
    }

    if (!profileForm.phone.startsWith('+94')) {
      toast.error('Phone number must start with +94');
      return;
    }

    setIsSavingProfile(true);

    try {
      const updatedUser = await apiRequest<UpdatedProfileResponse>('/api/auth/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          password: profileForm.password,
        }),
      });

      syncStoredSession(updatedUser);

      toast.success('Profile updated successfully');
      setIsEditModalOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-primary mb-8">My Account</h1>

        <div className="flex flex-col md:flex-row md:items-stretch gap-8">
          <div className="md:w-64 flex-shrink-0">
            <Card className="overflow-hidden h-full">
              <div className="p-6 border-b border-subtle/30 text-center">
                <div className="relative inline-block" ref={photoMenuRef}>
                  <button
                    type="button"
                    onClick={handleProfileIconClick}
                    disabled={isUploadingPhoto}
                    className="w-20 h-20 bg-accent-blue/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-accent-blue/30 overflow-hidden disabled:opacity-70"
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-10 h-10 text-accent-blue" />
                    )}
                  </button>

                  {isPhotoMenuOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-52 bg-background border border-subtle/30 rounded-xl shadow-lg z-20 overflow-hidden">
                      <button
                        type="button"
                        onClick={handleRemoveProfilePhoto}
                        className="w-full text-left px-4 py-3 text-sm text-body hover:bg-elevated transition-colors"
                      >
                        Remove Profile Picture
                      </button>

                      <button
                        type="button"
                        onClick={handleTakePhoto}
                        className="w-full text-left px-4 py-3 text-sm text-body hover:bg-elevated transition-colors"
                      >
                        Take Photo
                      </button>

                      <button
                        type="button"
                        onClick={handleBrowsePhoto}
                        className="w-full text-left px-4 py-3 text-sm text-body hover:bg-elevated transition-colors"
                      >
                        Browse From Computer
                      </button>
                    </div>
                  )}

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </div>

                <h3 className="font-bold text-primary">{profileData.fullName}</h3>
                <p className="text-sm text-muted">{profileData.email}</p>
              </div>

              <nav className="flex flex-col p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-accent-gold/10 text-accent-gold'
                        : 'text-body hover:bg-elevated hover:text-primary'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}

                <div className="my-2 border-t border-subtle/30"></div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-status-error hover:bg-status-error/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </nav>
            </Card>
          </div>

          <div className="flex-1 flex">
            {activeTab === 'profile' && (
              <Card className="p-6 md:p-8 w-full h-full">
                <div className="flex justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">
                    Personal Information
                  </h2>

                  <Button onClick={openEditModal}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit User Details
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <Input label="First Name" value={profileData.firstName} readOnly />
                  <Input label="Last Name" value={profileData.lastName} readOnly />

                  <Input
                    label="Email Address"
                    type="email"
                    value={profileData.email}
                    className="md:col-span-2"
                    readOnly
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    value={profileData.phone}
                    className="md:col-span-2"
                    readOnly
                  />
                </div>
              </Card>
            )}

            {activeTab === 'orders' && (
              <Card className="p-6 md:p-8 w-full h-full">
                <h2 className="text-2xl font-bold text-primary mb-6">
                  Order History
                </h2>

                <div className="space-y-4">
                  {mockOrders.map((order) => (
                    <div key={order.id} className="border border-subtle/30 rounded-xl p-6">
                      <div className="flex justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-primary">{order.id}</h3>
                          <p className="text-sm text-muted">
                            Placed on {order.date}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold text-primary">
                            {formatCurrency(order.total, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>

                          <Badge
                            variant={order.status === 'delivered' ? 'success' : 'warning'}
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-between pt-4 border-t border-subtle/30">
                        <span className="text-sm text-body">
                          {order.items} item(s)
                        </span>

                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'addresses' && (
              <Card className="p-6 md:p-8 w-full h-full">
                <div className="flex justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">
                    Saved Addresses
                  </h2>

                  <Button size="sm">
                    Add New
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-accent-gold rounded-xl p-6 relative">
                    <Badge variant="gold" className="absolute top-4 right-4">
                      Default
                    </Badge>

                    <h3 className="font-bold text-primary mb-2">
                      Home
                    </h3>

                    <p className="text-sm text-body leading-relaxed mb-4">
                      {profileData.fullName}
                      <br />
                      123 Tech Boulevard, Apt 4B
                      <br />
                      San Francisco, CA 94105
                      <br />
                      United States
                    </p>

                    <div className="flex gap-3">
                      <button className="text-sm text-accent-blue hover:underline">
                        Edit
                      </button>
                      <button className="text-sm text-status-error hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="border border-subtle/30 rounded-xl p-6">
                    <h3 className="font-bold text-primary mb-2">
                      Office
                    </h3>

                    <p className="text-sm text-body leading-relaxed mb-4">
                      {profileData.fullName}
                      <br />
                      500 Startup Way, Suite 100
                      <br />
                      San Jose, CA 95110
                      <br />
                      United States
                    </p>

                    <div className="flex gap-3">
                      <button className="text-sm text-accent-blue hover:underline">
                        Edit
                      </button>
                      <button className="text-sm text-status-error hover:underline">
                        Delete
                      </button>
                      <button className="text-sm text-body hover:text-primary">
                        Set as Default
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
